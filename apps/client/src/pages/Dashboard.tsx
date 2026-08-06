import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  exercisesApi,
  sessionsApi,
  statsApi,
  progressApi,
  weightApi,
  usersApi,
} from '../api';
import {
  Exercise,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
} from '../api/types';
import { LineChart } from '../components/LineChart';
import { formatDate, formatDuration } from '../utils/time';

export function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [bmiHistory, setBmiHistory] = useState<Array<{ recordedAt: string; bmi: number }>>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      exercisesApi.list(),
      sessionsApi.list(),
      statsApi.summary(),
      progressApi.summary(),
      progressApi.bmiHistory(),
      weightApi.list(),
      usersApi.me(),
    ])
      .then(([exs, allSessions, summary, prog, bmiHist, w, p]) => {
        setExercises(exs);
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        setTodaySessions(
          allSessions.filter(
            (s) => new Date(s.performedAt).toISOString().slice(0, 10) === key,
          ),
        );
        setStats(summary);
        setProgress(prog);
        setBmiHistory(bmiHist);
        setWeights(w);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  const weightChart = [...weights]
    .reverse()
    .map((w) => ({ label: formatDate(w.recordedAt), value: w.weightKg }));
  const bmiChart = bmiHistory.map((p) => ({
    label: formatDate(p.recordedAt),
    value: p.bmi,
  }));
  const hasProgressData = bmiChart.length > 0 || weightChart.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Hola, {user?.displayName} 👋
        </h1>
        <p className="text-slate-400">
          {exercises.length === 0
            ? 'Crea tu primera rutina para empezar.'
            : 'Elige una rutina para empezar tu sesión de hoy.'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sesiones" value={String(stats?.totalSessions ?? 0)} />
        <StatCard
          label="Racha"
          value={`${stats?.currentStreakDays ?? 0}d`}
        />
        <StatCard
          label="IMC"
          value={progress?.bmi.bmi != null ? progress.bmi.bmi.toFixed(1) : '—'}
          hint={progress?.bmi.categoryLabel ?? 'Define tu altura'}
        />
        <StatCard
          label="Peso"
          value={
            progress?.latestWeight
              ? `${progress.latestWeight.weightKg.toFixed(1)} kg`
              : '—'
          }
          hint={
            progress?.weightDelta == null
              ? 'Sin cambios'
              : `${progress.weightDelta > 0 ? '+' : ''}${progress.weightDelta.toFixed(1)} kg`
          }
        />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Progreso</h2>
          <Link
            to="/progress"
            className="text-sm text-brand-400 hover:underline"
          >
            Ver detalle
          </Link>
        </div>

        {!hasProgressData ? (
          <div className="text-sm text-slate-400 py-4">
            {!profile?.heightCm ? (
              <>
                Define tu{' '}
                <Link to="/profile" className="text-brand-400 hover:underline">
                  altura
                </Link>{' '}
                y registra tu primer peso para ver el progreso.
              </>
            ) : (
              <>
                Registra tu primer peso en{' '}
                <Link to="/weight" className="text-brand-400 hover:underline">
                  Peso
                </Link>{' '}
                para ver la curva.
              </>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            <ProgressBlock
              title="Peso"
              empty={weightChart.length === 0}
              emptyCta={
                <Link
                  to="/weight"
                  className="text-xs text-brand-400 hover:underline"
                >
                  Registrar peso
                </Link>
              }
            >
              <LineChart
                data={weightChart}
                height={140}
                yFormat={(n) => `${n.toFixed(1)} kg`}
              />
            </ProgressBlock>
            <ProgressBlock
              title="IMC"
              empty={bmiChart.length === 0}
              emptyCta={
                !profile?.heightCm ? (
                  <Link
                    to="/profile"
                    className="text-xs text-brand-400 hover:underline"
                  >
                    Definir altura
                  </Link>
                ) : (
                  <Link
                    to="/weight"
                    className="text-xs text-brand-400 hover:underline"
                  >
                    Registrar peso
                  </Link>
                )
              }
            >
              <LineChart
                data={bmiChart}
                height={140}
                yFormat={(n) => n.toFixed(1)}
              />
            </ProgressBlock>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tu rutina</h2>
          <Link
            to="/exercises/new"
            className="text-sm bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-md"
          >
            + Nueva rutina
          </Link>
        </div>

        {exercises.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            Aún no tienes ninguna rutina.{' '}
            <Link to="/exercises/new" className="text-brand-400 hover:underline">
              Crea el primero
            </Link>
            .
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {exercises.map((ex) => (
              <Link
                key={ex.id}
                to={`/sessions/run/${ex.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-brand-500 transition rounded-xl p-4 block"
              >
                <div className="font-medium">{ex.name}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {ex.sets} juegos ·{' '}
                  {ex.type === 'TIME' || ex.type === 'MIXED'
                    ? `${ex.durationPerSetSec ?? 0}s`
                    : `${ex.repsPerSet ?? 0} reps`}
                  {ex.restSec ? ` · descanso ${ex.restSec}s` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Sesiones de hoy</h2>
        {todaySessions.length === 0 ? (
          <div className="text-sm text-slate-400">
            Aún no has entrenado hoy.
          </div>
        ) : (
          <ul className="space-y-2">
            {todaySessions.map((s) => (
              <li
                key={s.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{s.exercise?.name}</div>
                  <div className="text-sm text-slate-400">
                    {s.setsCompleted} juegos
                    {s.totalDurationSec
                      ? ` · ${formatDuration(s.totalDurationSec)}`
                      : ''}
                    {s.totalReps ? ` · ${s.totalReps} reps` : ''}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(s.performedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && (
        <div className="text-xs text-slate-500 mt-1">{hint}</div>
      )}
    </div>
  );
}

function ProgressBlock({
  title,
  empty,
  emptyCta,
  children,
}: {
  title: string;
  empty: boolean;
  emptyCta: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-300">{title}</div>
      </div>
      {empty ? (
        <div className="text-xs text-slate-500 py-6 flex items-center justify-center gap-2">
          <span>Sin datos.</span>
          {emptyCta}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

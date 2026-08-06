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
import type {
  BmiCategory,
  Exercise,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
} from '../api/types';
import { BmiBar, bmiCategoryColor } from '../components/BmiBar';
import { formatDuration } from '../utils/time';

export function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      exercisesApi.list(),
      sessionsApi.list(),
      statsApi.summary(),
      progressApi.summary(),
      weightApi.list(),
      usersApi.me(),
    ])
      .then(([exs, allSessions, summary, prog, w, p]) => {
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
        setWeights(w);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  const bmi = progress?.bmi.bmi ?? null;
  const bmiCategory = progress?.bmi.category ?? null;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WeightCard
          weightKg={progress?.latestWeight?.weightKg ?? null}
          previousWeightKg={progress?.previousWeight?.weightKg ?? null}
          delta={progress?.weightDelta ?? null}
          history={weights}
        />
        <BmiCard
          bmi={bmi}
          category={bmiCategory}
          categoryLabel={progress?.bmi.categoryLabel ?? null}
          hasHeight={Boolean(profile?.heightCm)}
        />
      </div>

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sesiones de hoy</h2>
          <Link
            to="/progress"
            className="text-sm text-brand-400 hover:underline"
          >
            Ver progreso
          </Link>
        </div>
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

function WeightCard({
  weightKg,
  previousWeightKg,
  delta,
  history,
}: {
  weightKg: number | null;
  previousWeightKg: number | null;
  delta: number | null;
  history: WeightEntry[];
}) {
  const deltaColor =
    delta == null
      ? 'text-slate-400'
      : delta < 0
        ? 'text-emerald-400'
        : delta > 0
          ? 'text-amber-400'
          : 'text-slate-300';

  const sparkline = [...history].reverse().slice(-30).map((w) => w.weightKg);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Peso
        </div>
        <Link to="/weight" className="text-xs text-brand-400 hover:underline">
          Ver
        </Link>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-semibold">
          {weightKg != null ? `${weightKg.toFixed(1)} kg` : '—'}
        </div>
        <div className={`text-sm ${deltaColor}`}>
          {delta == null
            ? previousWeightKg == null
              ? 'Sin historial'
              : ''
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`}
        </div>
      </div>
      <div className="h-10 mt-2">
        <WeightSparkline values={sparkline} />
      </div>
    </div>
  );
}

function BmiCard({
  bmi,
  category,
  categoryLabel,
  hasHeight,
}: {
  bmi: number | null;
  category: BmiCategory | null;
  categoryLabel: string | null;
  hasHeight: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          IMC
        </div>
        <Link to="/progress" className="text-xs text-brand-400 hover:underline">
          Ver
        </Link>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className={`text-3xl font-semibold ${bmiCategoryColor(category)}`}>
          {bmi != null ? bmi.toFixed(1) : '—'}
        </div>
        <div className="text-sm text-slate-400">
          {categoryLabel ??
            (hasHeight ? 'Registra tu peso' : 'Define tu altura')}
        </div>
      </div>
      <div className="mt-2">
        <BmiBar bmi={bmi} category={category} compact />
      </div>
    </div>
  );
}

function WeightSparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div className="h-full flex items-center text-xs text-slate-500">
        Registra tu peso para ver la curva.
      </div>
    );
  }
  if (values.length === 1) {
    return (
      <div className="h-full flex items-center text-xs text-slate-500">
        Una sola medición. Registra más para ver la tendencia.
      </div>
    );
  }
  const w = 240;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <path
        d={points}
        fill="none"
        className="stroke-brand-400"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

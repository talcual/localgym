import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { exercisesApi, sessionsApi, statsApi } from '../api';
import { Exercise, SessionLog, SummaryStats } from '../api/types';
import { formatDuration } from '../utils/time';

export function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      exercisesApi.list(),
      sessionsApi.list(),
      statsApi.summary(),
    ])
      .then(([exs, allSessions, summary]) => {
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
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Hola, {user?.displayName} 👋
        </h1>
        <p className="text-slate-400">
          {exercises.length === 0
            ? 'Crea tu primer ejercicio para empezar.'
            : 'Elige un ejercicio para empezar tu sesión de hoy.'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sesiones" value={String(stats?.totalSessions ?? 0)} />
        <StatCard
          label="Racha"
          value={`${stats?.currentStreakDays ?? 0}d`}
        />
        <StatCard
          label="Mejor racha"
          value={`${stats?.bestStreakDays ?? 0}d`}
        />
        <StatCard
          label="Tiempo total"
          value={formatDuration(stats?.totalDurationSec ?? 0)}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tus ejercicios</h2>
          <Link
            to="/exercises/new"
            className="text-sm bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-md"
          >
            + Nuevo ejercicio
          </Link>
        </div>

        {exercises.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            Aún no tienes ejercicios.{' '}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

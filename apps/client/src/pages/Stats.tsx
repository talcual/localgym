import { useEffect, useState } from 'react';
import { statsApi } from '../api';
import {
  DailyCount,
  ExerciseAggregate,
  SummaryStats,
} from '../api/types';
import { formatDuration } from '../utils/time';

export function Stats() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [byExercise, setByExercise] = useState<ExerciseAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([statsApi.summary(), statsApi.byDay(30), statsApi.byExercise()])
      .then(([s, d, e]) => {
        setSummary(s);
        setDaily(d);
        setByExercise(e);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400">Cargando...</div>;
  if (!summary) return <div className="text-slate-400">Sin datos</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <BigStat
          label="Racha actual"
          value={`${summary.currentStreakDays} días`}
          accent="text-emerald-400"
        />
        <BigStat
          label="Mejor racha"
          value={`${summary.bestStreakDays} días`}
          accent="text-amber-400"
        />
        <BigStat label="Sesiones totales" value={String(summary.totalSessions)} />
        <BigStat
          label="Tiempo total"
          value={formatDuration(summary.totalDurationSec)}
        />
        <BigStat
          label="Repeticiones totales"
          value={String(summary.totalReps)}
        />
        <BigStat
          label="Ejercicios distintos"
          value={String(summary.uniqueExercises)}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Últimos 30 días</h2>
        <BarChart data={daily} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Por ejercicio</h2>
        {byExercise.length === 0 ? (
          <div className="text-slate-400 text-sm">Sin datos aún.</div>
        ) : (
          <ul className="space-y-2">
            {byExercise.map((e) => (
              <li
                key={e.exerciseId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <div className="font-medium">{e.exerciseName}</div>
                <div className="text-sm text-slate-400">
                  {e.sessions} sesiones · {formatDuration(e.totalDurationSec)} ·{' '}
                  {e.totalReps} reps
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? ''}`}>
        {value}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: DailyCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.sessions));
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const h = (d.sessions / max) * 100;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.sessions} sesiones`}
              className="flex-1 bg-brand-500 hover:bg-brand-400 transition rounded-t"
              style={{ height: `${h}%`, minHeight: d.sessions > 0 ? '4px' : '0' }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  progressApi,
  routinesApi,
  statsApi,
  weightApi,
  sessionsApi,
} from '../../api';
import type {
  ProgressSummary,
  SummaryStats,
  WeightEntry,
  SessionLog,
} from '../../api/types';
import type { RoutineWithItems } from '../../api/routines';

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [routines, setRoutines] = useState<RoutineWithItems[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [recent, setRecent] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const [s, st, r, w, ses] = await Promise.all([
          progressApi.summary(clientId),
          statsApi.summary(clientId),
          routinesApi.list(clientId),
          weightApi.list(clientId),
          sessionsApi.list(undefined, clientId),
        ]);
        setSummary(s);
        setStats(st);
        setRoutines(r);
        setWeights(w);
        setRecent(ses.slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (!clientId) return null;
  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cliente #{clientId.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Resumen de progreso y acceso rápido a sus datos.
          </p>
        </div>
        <Link
          to={`/instructor/messages?to=${clientId}`}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 hover:bg-violet-500"
        >
          Enviar mensaje
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="IMC" value={summary?.bmi.bmi?.toFixed(1) ?? '—'} sub={summary?.bmi.categoryLabel ?? ''} />
        <Stat label="Peso" value={summary?.latestWeight ? `${summary.latestWeight.weightKg.toFixed(1)} kg` : '—'} sub={summary?.weightDelta ? `${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta.toFixed(1)} kg` : ''} />
        <Stat label="Racha" value={stats ? `${stats.currentStreakDays} días` : '—'} sub={stats ? `Mejor: ${stats.bestStreakDays}` : ''} />
        <Stat label="Sesiones" value={stats?.totalSessions ?? 0} sub={stats ? `${Math.round((stats.totalDurationSec ?? 0) / 60)} min totales` : ''} />
      </div>

      <Section title="Rutinas">
        {routines.length === 0 ? (
          <p className="text-sm text-slate-400">Este cliente no tiene rutinas todavía.</p>
        ) : (
          <ul className="space-y-2">
            {routines.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {r.assignedByInstructor && (
                      <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                        Asignada
                      </span>
                    )}
                    <span className="font-medium">{r.title}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.goal} · {r.level} · {r.daysPerWeek} días
                  </div>
                </div>
                <Link
                  to={`/instructor/routines/${r.id}/edit`}
                  className="text-xs text-violet-300 underline"
                >
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Peso (últimas entradas)">
        {weights.length === 0 ? (
          <p className="text-sm text-slate-400">Sin registros.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {weights.slice(0, 5).map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <span>{new Date(w.recordedAt).toLocaleDateString('es')}</span>
                <span className="font-medium">{w.weightKg.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Sesiones recientes">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Sin sesiones.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <span>{new Date(s.performedAt).toLocaleString('es')}</span>
                <span className="font-medium">{s.setsCompleted} sets</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
        {title}
      </h2>
      {children}
    </section>
  );
}
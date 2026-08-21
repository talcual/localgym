import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, X } from 'lucide-react';
import {
  assignmentsApi,
  progressApi,
  routinesApi,
  statsApi,
  weightApi,
  sessionsApi,
} from '../../api';
import type {
  ProgressSummary,
  RoutineAssignment,
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
  const [assignments, setAssignments] = useState<RoutineAssignment[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [recent, setRecent] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<RoutineWithItems | null>(null);

  async function refresh() {
    if (!clientId) return;
    const [s, st, r, w, ses, a] = await Promise.all([
      progressApi.summary(clientId),
      statsApi.summary(clientId),
      routinesApi.list(clientId),
      weightApi.list(clientId),
      sessionsApi.list(undefined, clientId),
      assignmentsApi.list(clientId).catch(() => [] as RoutineAssignment[]),
    ]);
    setSummary(s);
    setStats(st);
    setRoutines(r);
    setWeights(w);
    setRecent(ses.slice(0, 5));
    setAssignments(a);
  }

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (!clientId) return null;
  if (loading) return <div className="text-slate-400">Cargando...</div>;

  // Solo las rutinas que el instructor escribió son asignables / editables.
  const ownRoutines = routines.filter((r) => r.writtenByInstructorId == null);
  const instructorRoutines = routines.filter(
    (r) => r.writtenByInstructorId != null,
  );

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
        <Stat
          label="IMC"
          value={summary?.bmi.bmi?.toFixed(1) ?? '—'}
          sub={summary?.bmi.categoryLabel ?? ''}
        />
        <Stat
          label="Peso"
          value={
            summary?.latestWeight
              ? `${summary.latestWeight.weightKg.toFixed(1)} kg`
              : '—'
          }
          sub={
            summary?.weightDelta
              ? `${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta.toFixed(1)} kg`
              : ''
          }
        />
        <Stat
          label="Racha"
          value={stats ? `${stats.currentStreakDays} días` : '—'}
          sub={stats ? `Mejor: ${stats.bestStreakDays}` : ''}
        />
        <Stat
          label="Sesiones"
          value={stats?.totalSessions ?? 0}
          sub={
            stats ? `${Math.round((stats.totalDurationSec ?? 0) / 60)} min totales` : ''
          }
        />
      </div>

      <Section
        title="Rutinas escritas por ti"
        hint="Edita y asigna estas rutinas al cliente."
      >
        {instructorRoutines.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aún no has escrito rutinas para este cliente. Crea una desde{' '}
            <Link
              to="/instructor/routines"
              className="text-violet-300 underline"
            >
              Rutinas
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {instructorRoutines.map((r) => {
              const a = assignments.find((x) => x.routineId === r.id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      {a ? (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                          Asignada
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Sin asignar
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.goal} · {r.level} · {r.daysPerWeek} días ·{' '}
                      {r.items.length} ejercicios
                      {a && (
                        <>
                          {' · '}
                          Ventana: {a.startDate}
                          {a.endDate ? ` → ${a.endDate}` : ' (sin fin)'}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/instructor/routines/${r.id}/edit`}
                      className="text-xs text-violet-300 underline"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAssigning(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium hover:bg-violet-500"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {a ? 'Reasignar' : 'Asignar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {ownRoutines.length > 0 && (
        <Section title="Rutinas propias del cliente">
          <ul className="space-y-1 text-sm text-slate-300">
            {ownRoutines.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <span>{r.title}</span>
                <span className="text-xs text-slate-500">
                  {r.daysPerWeek} días
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Peso (últimas entradas)">
        {weights.length === 0 ? (
          <p className="text-sm text-slate-400">Sin registros.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {weights.slice(0, 5).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
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
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <span>{new Date(s.performedAt).toLocaleString('es')}</span>
                <span className="font-medium">{s.setsCompleted} sets</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {assigning && clientId && (
        <AssignModal
          routine={assigning}
          clientId={clientId}
          existing={assignments.find((a) => a.routineId === assigning.id) ?? null}
          onClose={() => setAssigning(null)}
          onAssigned={async () => {
            setAssigning(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function AssignModal({
  routine,
  clientId,
  existing,
  onClose,
  onAssigned,
}: {
  routine: RoutineWithItems;
  clientId: string;
  existing: RoutineAssignment | null;
  onClose: () => void;
  onAssigned: () => Promise<void> | void;
}) {
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState<string>(
    existing?.endDate ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // Si ya existe, archivamos la anterior antes de crear la nueva.
      if (existing) {
        await assignmentsApi.archive(existing.id);
      }
      await assignmentsApi.create({
        routineId: routine.id,
        clientId,
        startDate,
        endDate: endDate || undefined,
      });
      await onAssigned();
    } catch (err) {
      setError(
        (err as Error).message ||
          (err as any)?.response?.data?.message ||
          'No se pudo asignar la rutina',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1526] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold">
            {existing ? 'Reasignar rutina' : 'Asignar rutina'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Rutina
            </p>
            <p className="mt-1 font-medium">{routine.title}</p>
            <p className="text-xs text-slate-500">
              {routine.goal} · {routine.level} · {routine.daysPerWeek} días
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Inicio
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Fin (opcional)
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            Si no defines fin, la asignación queda vigente hasta que la
            archives o reasignes.
          </p>

          {error && (
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? 'Asignando...' : existing ? 'Reasignar' : 'Asignar'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {title}
        </h2>
      </div>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </section>
  );
}
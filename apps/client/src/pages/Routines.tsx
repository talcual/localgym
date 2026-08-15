import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { routinesApi } from '../api';
import type { RoutineWithItems } from '../api';
import {
  groupRoutineItemsByDay,
  routineGoalLabel,
  routineLevelLabel,
} from '../api/routines';

export function Routines() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<RoutineWithItems[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [list, active] = await Promise.all([
        routinesApi.list(),
        routinesApi.active(),
      ]);
      setRoutines(list);
      setActiveRoutineId(active?.id ?? null);
    } catch (err) {
      setError((err as Error).message || 'No se pudieron cargar las rutinas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function activate(id: string) {
    setBusyId(id);
    try {
      await routinesApi.activate(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate() {
    setBusyId('__deactivate');
    try {
      await routinesApi.deactivate();
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar esta rutina? No se puede deshacer.')) return;
    setBusyId(id);
    try {
      await routinesApi.remove(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  function startTraining(routine: RoutineWithItems) {
    // Toma el primer item con exerciseId del primer día y abre el SessionRunner.
    const days = groupRoutineItemsByDay(routine.items);
    for (const day of days) {
      for (const it of day.items) {
        if (it.exerciseId) {
          navigate(`/sessions/run/${it.exerciseId}`);
          return;
        }
      }
    }
    // Si la rutina no tiene ejercicios importables todavía, abrimos el
    // dashboard para que el usuario sepa qué pasó.
    setError(
      'Esta rutina no tiene ejercicios para entrenar todavía. Importá o creá los ejercicios.',
    );
  }

  const activeRoutine = useMemo(
    () => routines.find((r) => r.id === activeRoutineId) ?? null,
    [routines, activeRoutineId],
  );

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Mis rutinas
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Activá una sola por vez. La semana que viene podés cambiar a otra sin
          perder el historial.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {activeRoutine && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                  Activa esta semana
                </span>
                <h2 className="font-semibold">{activeRoutine.title}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {routineGoalLabel(activeRoutine.goal)} ·{' '}
                {routineLevelLabel(activeRoutine.level)} ·{' '}
                {activeRoutine.daysPerWeek} días
              </p>
              <DaysOverview routine={activeRoutine} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => startTraining(activeRoutine)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              >
                Empezar
              </button>
              <button
                type="button"
                onClick={deactivate}
                disabled={busyId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500 hover:text-amber-200 disabled:opacity-50"
              >
                {busyId === '__deactivate' ? '…' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {routines.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-8 text-center text-slate-400">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-violet-400" aria-hidden />
          <p>Aún no tenés rutinas guardadas.</p>
          <p className="mt-1 text-xs text-slate-500">
            Andá al <Link to="/app" className="text-violet-300 underline">Dashboard</Link> y
            generá una con AI Couch.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {routines.map((r) => {
            const days = groupRoutineItemsByDay(r.items);
            const isActive = r.id === activeRoutineId;
            return (
              <div
                key={r.id}
                className={
                  'flex flex-col rounded-xl border bg-[#0d1526] p-4 ' +
                  (isActive
                    ? 'border-emerald-500/50'
                    : 'border-slate-800/80')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">
                      {r.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {routineGoalLabel(r.goal)} ·{' '}
                      {routineLevelLabel(r.level)} · {r.daysPerWeek} días
                    </div>
                  </div>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Activa
                    </span>
                  )}
                </div>

                <DaysOverview routine={r} compact />

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => startTraining(r)}
                    disabled={!isActive || r.items.length === 0}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Entrenar
                  </button>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={deactivate}
                      disabled={busyId !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500 hover:text-amber-200 disabled:opacity-50"
                    >
                      {busyId === '__deactivate' ? '…' : 'Desactivar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => activate(r.id)}
                      disabled={busyId !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white disabled:opacity-50"
                    >
                      {busyId === r.id ? '…' : 'Activar'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    disabled={busyId !== null}
                    title="Borrar rutina"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DaysOverview({
  routine,
  compact,
}: {
  routine: RoutineWithItems;
  compact?: boolean;
}) {
  const days = groupRoutineItemsByDay(routine.items);
  if (days.length === 0) {
    return (
      <p className="mt-2 text-xs text-slate-500">Sin ejercicios cargados.</p>
    );
  }
  return (
    <ul className={'mt-3 space-y-1.5 ' + (compact ? 'text-xs' : 'text-sm')}>
      {days.slice(0, compact ? 4 : routine.daysPerWeek).map((d) => (
        <li key={d.dayIndex} className="text-slate-300">
          <span className="font-medium">{d.dayLabel}:</span>{' '}
          <span className="text-slate-400">
            {d.items.length} ejercicio{d.items.length === 1 ? '' : 's'}
          </span>
        </li>
      ))}
      {compact && days.length > 4 && (
        <li className="text-[11px] text-slate-500">
          +{days.length - 4} día(s) más
        </li>
      )}
    </ul>
  );
}

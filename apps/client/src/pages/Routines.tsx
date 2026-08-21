import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Play } from 'lucide-react';
import { routinesApi, exercisesApi } from '../api';
import type { Exercise, RoutineWithItems } from '../api';
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

  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(
    new Map(),
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [list, active, exercises] = await Promise.all([
        routinesApi.list(),
        routinesApi.active(),
        exercisesApi.list(),
      ]);
      setRoutines(list);
      setActiveRoutineId(active?.id ?? null);
      const m = new Map<string, Exercise>();
      for (const e of exercises) m.set(e.id, e);
      setExerciseMap(m);
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

  function startDay(routine: RoutineWithItems, dayIndex: number) {
    const days = groupRoutineItemsByDay(routine.items);
    const day = days.find((d) => d.dayIndex === dayIndex);
    if (!day) {
      setError('Ese día no tiene ejercicios en esta rutina.');
      return;
    }
    const queue = day.items
      .filter((it) => !!it.exerciseId)
      .map((it) => it.exerciseId as string);
    if (queue.length === 0) {
      setError(
        'Este día no tiene ejercicios importados todavía. Prueba con otro día.',
      );
      return;
    }
    const [first, ...rest] = queue;
    // La query string incluye el actual + los pendientes, en orden.
    // Esto permite al SessionRunner reconstruir la posición exacta del ejercicio
    // actual dentro del día, incluso tras navegaciones internas con replace.
    const order = [first, ...rest];
    const qs =
      '?' + order.map((id) => `ex=${encodeURIComponent(id)}`).join('&');
    navigate(`/sessions/run/${first}${qs}`, {
      state: {
        routineId: routine.id,
        routineTitle: routine.title,
        dayIndex,
        dayLabel: day.dayLabel,
        queue,
      },
    });
  }

  const activeRoutine = useMemo(
    () => routines.find((r) => r.id === activeRoutineId) ?? null,
    [routines, activeRoutineId],
  );

  const instructorRoutines = useMemo(
    () => routines.filter((r) => r.assignedByInstructor),
    [routines],
  );
  const ownRoutines = useMemo(
    () => routines.filter((r) => !r.assignedByInstructor),
    [routines],
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
          Activa una sola por vez. Empieza cada sesión por el día que te toque.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {activeRoutine && (
        <RoutineCard
          routine={activeRoutine}
          exerciseMap={exerciseMap}
          isActive
          busyId={busyId}
          onActivate={activate}
          onDeactivate={deactivate}
          onRemove={remove}
          onStartDay={startDay}
          highlight
        />
      )}

      {routines.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-8 text-center text-slate-400">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-violet-400" aria-hidden />
          <p>Aún no tienes rutinas guardadas.</p>
          <p className="mt-1 text-xs text-slate-500">
            Ve al <Link to="/app" className="text-violet-300 underline">Dashboard</Link> y
            genera una con AI Couch.
          </p>
        </div>
      ) : (
        <>
          {instructorRoutines.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                  De mi instructor
                </h2>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                  {instructorRoutines.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {instructorRoutines
                  .filter((r) => r.id !== activeRoutineId)
                  .map((r) => (
                    <RoutineCard
                      key={r.id}
                      routine={r}
                      exerciseMap={exerciseMap}
                      isActive={false}
                      busyId={busyId}
                      onActivate={activate}
                      onDeactivate={deactivate}
                      onRemove={remove}
                      onStartDay={startDay}
                    />
                  ))}
              </div>
            </section>
          )}

          {ownRoutines.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Mis rutinas
                </h2>
                <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {ownRoutines.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ownRoutines
                  .filter((r) => r.id !== activeRoutineId)
                  .map((r) => (
                    <RoutineCard
                      key={r.id}
                      routine={r}
                      exerciseMap={exerciseMap}
                      isActive={false}
                      busyId={busyId}
                      onActivate={activate}
                      onDeactivate={deactivate}
                      onRemove={remove}
                      onStartDay={startDay}
                    />
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RoutineCard({
  routine,
  exerciseMap,
  isActive,
  busyId,
  onActivate,
  onDeactivate,
  onRemove,
  onStartDay,
  highlight,
}: {
  routine: RoutineWithItems;
  exerciseMap: Map<string, Exercise>;
  isActive: boolean;
  busyId: string | null;
  onActivate: (id: string) => void | Promise<void>;
  onDeactivate: () => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onStartDay: (routine: RoutineWithItems, dayIndex: number) => void;
  highlight?: boolean;
}) {
  const days = useMemo(() => groupRoutineItemsByDay(routine.items), [routine]);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  useEffect(() => {
    if (!days.find((d) => d.dayIndex === selectedDay)) {
      setSelectedDay(days[0]?.dayIndex ?? 0);
    }
  }, [days, selectedDay]);

  const currentDay = days.find((d) => d.dayIndex === selectedDay) ?? days[0];

  return (
    <div
      className={
        'flex flex-col rounded-xl border p-4 ' +
        (highlight
          ? 'border-emerald-500/40 bg-emerald-950/10 lg:col-span-3 xl:col-span-3'
          : isActive
            ? 'border-emerald-500/50 bg-[#0d1526]'
            : 'border-slate-800/80 bg-[#0d1526]')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {highlight && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                Activa esta semana
              </span>
            )}
            {routine.assignedByInstructor && (
              <span
                className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300"
                title={
                  routine.assignmentWindow
                    ? `Asignada por ${routine.assignedInstructorName ?? 'tu instructor'} del ${routine.assignmentWindow.startDate}${
                        routine.assignmentWindow.endDate
                          ? ' al ' + routine.assignmentWindow.endDate
                          : ' (sin fecha de fin)'
                      }`
                    : 'Asignada por tu instructor'
                }
              >
                De {routine.assignedInstructorName ?? 'tu instructor'}
              </span>
            )}
            <h2 className="truncate text-base font-semibold">{routine.title}</h2>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {routineGoalLabel(routine.goal)} ·{' '}
            {routineLevelLabel(routine.level)} · {routine.daysPerWeek} días
          </div>
        </div>
        {isActive && !highlight && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Activa
          </span>
        )}
      </div>

      {days.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => {
              const isSelected = d.dayIndex === selectedDay;
              const hasExercise = d.items.some((it) => it.exerciseId);
              return (
                <button
                  key={d.dayIndex}
                  type="button"
                  onClick={() => setSelectedDay(d.dayIndex)}
                  className={
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition ' +
                    (isSelected
                      ? 'border-violet-500 bg-violet-600/20 text-violet-100'
                      : hasExercise
                        ? 'border-slate-700 text-slate-200 hover:border-violet-500 hover:text-white'
                        : 'border-slate-800 text-slate-500 hover:border-slate-700')
                  }
                  title={d.dayLabel}
                >
                  <span className="font-semibold">D{d.dayIndex + 1}</span>
                </button>
              );
            })}
          </div>

          {currentDay && (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-200">
                  {currentDay.dayLabel}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  {currentDay.items.length} ejercicio
                  {currentDay.items.length === 1 ? '' : 's'}
                </div>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs">
                {currentDay.items.map((it) => {
                  const ex = it.exerciseId
                    ? exerciseMap.get(it.exerciseId)
                    : undefined;
                  const name = ex?.name ?? 'Ejercicio';
                  const meta = describeItemMeta(it, ex);
                  return (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ExerciseSourceBadge source={ex?.source} />
                        <span className="truncate text-slate-200">{name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {meta}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartDay(routine, currentDay.dayIndex)}
                  disabled={
                    !currentDay.items.some((it) => it.exerciseId) ||
                    !isActive
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    !isActive
                      ? 'Activa la rutina para poder entrenar'
                      : !currentDay.items.some((it) => it.exerciseId)
                        ? 'Este día no tiene ejercicios importables'
                        : 'Entrenar este día'
                  }
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Entrenar este día
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {isActive ? (
          <button
            type="button"
            onClick={onDeactivate}
            disabled={busyId !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500 hover:text-amber-200 disabled:opacity-50"
          >
            {busyId === '__deactivate' ? '…' : 'Desactivar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onActivate(routine.id)}
            disabled={busyId !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white disabled:opacity-50"
          >
            {busyId === routine.id ? '…' : 'Activar'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(routine.id)}
          disabled={busyId !== null}
          title="Borrar rutina"
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function describeItemMeta(
  it: {
    sets: number | null;
    reps: number | null;
    durationPerSetSec: number | null;
    restSec: number | null;
  },
  ex?: Exercise,
): string {
  const sets = it.sets ?? ex?.sets ?? null;
  const reps = it.reps ?? ex?.repsPerSet ?? null;
  const dur = it.durationPerSetSec ?? ex?.durationPerSetSec ?? null;
  const rest = it.restSec ?? ex?.restSec ?? null;
  const parts: string[] = [];
  if (sets != null && reps != null) parts.push(`${sets}x${reps}`);
  else if (sets != null && dur != null) parts.push(`${sets}x${dur}s`);
  else if (sets != null) parts.push(`${sets} series`);
  if (rest != null) parts.push(`descanso ${rest}s`);
  return parts.join(' · ') || '—';
}


function ExerciseSourceBadge({
  source,
}: {
  source?: Exercise['source'];
}) {
  if (!source) {
    return (
      <span
        className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500"
        title="Origen desconocido"
      >
        ·
      </span>
    );
  }
  const map = {
    manual: { label: 'Propio', cls: 'bg-slate-700 text-slate-200' },
    ai_import: { label: 'AI', cls: 'bg-violet-500/20 text-violet-200' },
  } as const;
  const v = map[source];
  return (
    <span
      className={
        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ' + v.cls
      }
      title={
        source === 'ai_import'
          ? 'Importado del catálogo por AI Couch'
          : 'Creado manualmente'
      }
    >
      {v.label}
    </span>
  );
}

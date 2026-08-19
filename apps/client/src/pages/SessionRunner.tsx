import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { exercisesApi, sessionsApi } from '../api';
import { Exercise } from '../api/types';
import { formatTimer } from '../utils/time';

type Phase = 'idle' | 'work' | 'rest' | 'done';

interface SetEntry {
  reps: number | null;
  done: boolean;
  skipped: boolean;
}

interface RoutineContextState {
  routineId?: string;
  routineTitle?: string;
  dayIndex?: number;
  dayLabel?: string;
  queue?: string[];
}

export function SessionRunner() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state = (location.state as RoutineContextState | null) ?? null;
  const routineContext: RoutineContextState | null = useMemo(() => {
    if (state && state.queue && state.queue.length > 0) return state;
    // Fallback: reconstruir la cola desde query params (ex=ID&ex=ID...).
    const fromQs = searchParams.getAll('ex').filter(Boolean);
    if (fromQs.length > 0) {
      return {
        routineId: undefined,
        routineTitle: undefined,
        dayIndex: undefined,
        dayLabel: undefined,
        queue: fromQs,
      };
    }
    return null;
  }, [state, searchParams]);

  const queueFromContext = routineContext?.queue ?? [];
  const currentIndexInQueue = useMemo(
    () => (exerciseId ? queueFromContext.indexOf(exerciseId) : -1),
    [queueFromContext, exerciseId],
  );
  const remainingQueue: string[] = useMemo(() => {
    if (currentIndexInQueue < 0) return [];
    return queueFromContext.slice(currentIndexInQueue + 1);
  }, [queueFromContext, currentIndexInQueue]);

  const totalInQueue = queueFromContext.length;
  const finishedCount = Math.max(0, currentIndexInQueue);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentSet, setCurrentSet] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);

  // Estado para reporte manual set por set (REPS / MIXED).
  const [manualSets, setManualSets] = useState<SetEntry[]>([]);
  const [repInput, setRepInput] = useState<string>('');
  const [mixedRepsTotal, setMixedRepsTotal] = useState<string>('');

  const endsAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const setIndexRef = useRef(0);
  const setsCompletedRef = useRef(0);

  useEffect(() => {
    if (!exerciseId) return;
    // Reset completo del estado cada vez que cambia el ejercicio.
    // Esto es necesario cuando navegamos entre ejercicios de una misma rutina
    // con `replace: true`: React Router reusa el componente, así que sin reset
    // el `phase` se quedaría en 'done' del ejercicio anterior.
    setLoading(true);
    setError(null);
    setPhase('idle');
    setCurrentSet(0);
    setRemaining(0);
    setSaving(false);
    setRepInput('');
    setMixedRepsTotal('');
    setsCompletedRef.current = 0;
    setIndexRef.current = 0;
    phaseRef.current = 'idle';
    endsAtRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    exercisesApi
      .get(exerciseId)
      .then((ex) => {
        setExercise(ex);
        setManualSets(
          Array.from({ length: ex.sets }, () => ({
            reps: null,
            done: false,
            skipped: false,
          })),
        );
      })
      .catch(() => setError('No se pudo cargar la rutina'))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  useEffect(() => {
    if (!exercise) return;
    if (exercise.durationPerSetSec) {
      setRemaining(exercise.durationPerSetSec);
    } else if (exercise.repsPerSet) {
      setRemaining(0);
    }
  }, [exercise]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    setIndexRef.current = currentSet;
  }, [currentSet]);

  function tick() {
    if (endsAtRef.current == null) return;
    const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      handlePhaseEnd();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  /**
   * Beep genérico parametrizable.
   * `volume` entre 0 y 1. Por defecto volumen bajo (beep entre sets).
   */
  function beep(opts: { freq?: number; volume?: number; duration?: number } = {}) {
    const { freq = 880, volume = 0.3, duration = 0.45 } = opts;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch {
      // ignore
    }
  }

  /**
   * Sonido de cierre de sesión: 3 pulsos cortos crecientes, volumen alto.
   */
  function playFinishSound() {
    const seq = [880, 1100, 1320];
    seq.forEach((f, i) => {
      setTimeout(() => beep({ freq: f, volume: 0.9, duration: 0.35 }), i * 220);
    });
    vibrate([400, 100, 400, 100, 400]);
  }

  function vibrate(pattern: number | number[]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function startPhase(nextPhase: Phase, durationSec: number) {
    if (durationSec <= 0) {
      handlePhaseEnd();
      return;
    }
    setPhase(nextPhase);
    setRemaining(durationSec);
    endsAtRef.current = Date.now() + durationSec * 1000;
    rafRef.current = requestAnimationFrame(tick);
  }

  function handlePhaseEnd() {
    if (!exercise) return;
    if (phaseRef.current === 'work') {
      setsCompletedRef.current = setIndexRef.current + 1;
      if (exercise.type === 'MIXED') {
        setManualSets((prev) =>
          prev.map((s, i) =>
            i === setIndexRef.current ? { ...s, done: true } : s,
          ),
        );
      }
      const isLast = setIndexRef.current + 1 >= exercise.sets;
      if (isLast) {
        finish();
        return;
      }
      if (exercise.restSec > 0) {
        beep({ volume: 0.35 });
        vibrate([200, 100, 200]);
        startPhase('rest', exercise.restSec);
      } else {
        const next = setIndexRef.current + 1;
        setCurrentSet(next);
        const dur = exercise.durationPerSetSec ?? 0;
        startPhase('work', dur);
      }
    } else if (phaseRef.current === 'rest') {
      beep({ volume: 0.35 });
      vibrate(150);
      const next = setIndexRef.current + 1;
      setCurrentSet(next);
      // Si el ejercicio es REPS puro, pasamos a 'work' sin timer para mostrar input.
      if (exercise.type === 'REPS') {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        endsAtRef.current = null;
        setPhase('work');
        setRepInput('');
        setRemaining(0);
      } else {
        const dur = exercise.durationPerSetSec ?? 0;
        startPhase('work', dur);
      }
    }
  }

  function start() {
    if (!exercise) return;
    setCurrentSet(0);
    setsCompletedRef.current = 0;
    setRepInput('');
    setMixedRepsTotal('');

    if (exercise.type === 'REPS') {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      endsAtRef.current = null;
      setPhase('work');
      setRemaining(0);
    } else if (exercise.durationPerSetSec) {
      startPhase('work', exercise.durationPerSetSec);
    } else {
      setsCompletedRef.current = exercise.sets;
      finish();
    }
  }

  function pause() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    endsAtRef.current = null;
    setPhase('idle');
  }

  /**
   * Confirmar un set manual (REPS / MIXED).
   * `reps` puede ser null si el usuario solo confirma sin reps.
   */
  function confirmSet(reps: number | null) {
    if (!exercise) return;
    const idx = setIndexRef.current;
    setManualSets((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, reps, done: true, skipped: reps == null } : s,
      ),
    );
    setsCompletedRef.current = idx + 1;
    const isLast = idx + 1 >= exercise.sets;
    if (isLast) {
      finish();
      return;
    }
    if (exercise.restSec > 0) {
      beep({ volume: 0.4 });
      startPhase('rest', exercise.restSec);
    } else {
      const next = idx + 1;
      setCurrentSet(next);
      setRepInput('');
      if (exercise.type === 'REPS') {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        endsAtRef.current = null;
        setPhase('work');
      } else {
        startPhase('work', exercise.durationPerSetSec ?? 0);
      }
    }
  }

  function skipSet() {
    if (!exercise) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    endsAtRef.current = null;

    if (phaseRef.current === 'rest') {
      const next = setIndexRef.current + 1;
      if (next >= exercise.sets) {
        setsCompletedRef.current = next;
        finish();
        return;
      }
      setCurrentSet(next);
      setRepInput('');
      if (exercise.type === 'REPS') {
        setPhase('work');
      } else {
        startPhase('work', exercise.durationPerSetSec ?? 0);
      }
      return;
    }

    if (exercise.type === 'REPS') {
      confirmSet(null);
      return;
    }

    setsCompletedRef.current = setIndexRef.current + 1;
    if (exercise.type === 'MIXED') {
      setManualSets((prev) =>
        prev.map((s, i) =>
          i === setIndexRef.current ? { ...s, done: true, skipped: true } : s,
        ),
      );
    }
    if (setsCompletedRef.current >= exercise.sets) {
      finish();
      return;
    }
    if (exercise.restSec > 0) {
      startPhase('rest', exercise.restSec);
    } else {
      const next = setIndexRef.current + 1;
      setCurrentSet(next);
      startPhase('work', exercise.durationPerSetSec ?? 0);
    }
  }

  function cancel() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (routineContext?.routineId) {
      navigate('/routines');
    } else {
      navigate('/exercises');
    }
  }

  async function finish() {
    if (!exercise) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase('done');
    playFinishSound();
    setSaving(true);
    try {
      const completed =
        setsCompletedRef.current > 0 ? setsCompletedRef.current : exercise.sets;

      let totalReps = 0;
      let totalDurationSec = 0;

      if (exercise.type === 'REPS') {
        totalReps = manualSets.reduce(
          (acc, s) => acc + (s.reps ?? 0),
          0,
        );
        totalDurationSec = 0;
      } else if (exercise.type === 'MIXED') {
        totalDurationSec =
          (exercise.durationPerSetSec ?? 0) * completed;
        const fromManual = manualSets.reduce(
          (acc, s) => acc + (s.reps ?? 0),
          0,
        );
        const fromInput = Number(mixedRepsTotal);
        totalReps = fromInput > 0 ? fromInput : fromManual;
      } else {
        totalDurationSec =
          (exercise.durationPerSetSec ?? 0) * completed;
        totalReps = (exercise.repsPerSet ?? 0) * completed;
      }

      await sessionsApi.create({
        exerciseId: exercise.id,
        setsCompleted: completed,
        totalDurationSec,
        totalReps,
      });

      // Si hay más ejercicios en la cola de la rutina actual, encadenar al siguiente.
      if (remainingQueue.length > 0) {
        const [nextId, ...rest] = remainingQueue;
        // La query string incluye el ejercicio actual (al que vamos a navegar)
        // seguido de los pendientes, para que SessionRunner pueda reconstruir
        // la posición en la cola cuando se monte de nuevo.
        const order = [nextId, ...rest];
        const qs =
          '?' + order.map((id) => `ex=${encodeURIComponent(id)}`).join('&');
        navigate(`/sessions/run/${nextId}${qs}`, {
          state: routineContext ?? undefined,
          replace: true,
        });
        return;
      }

      // Si no hay más ejercicios pendientes, volver al inicio.
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError('No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  async function finishMixed() {
    setManualSets((prev) =>
      prev.map((s, i) =>
        i < setsCompletedRef.current && !s.done
          ? { ...s, done: true, reps: null, skipped: true }
          : s,
      ),
    );
    await finish();
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const totalSetsLabel = useMemo(() => exercise?.sets ?? 0, [exercise]);

  const labelType = (t: string) => {
    if (t === 'TIME') return 'Por tiempo';
    if (t === 'REPS') return 'Por repeticiones';
    return 'Mixto (tiempo + reps)';
  };

  if (loading) return <div className="text-slate-400">Cargando...</div>;
  if (!exercise) return <div className="text-red-400">{error || 'No encontrado'}</div>;

  const queueProgress =
    totalInQueue > 0
      ? `Ejercicio ${Math.min(finishedCount + 1, totalInQueue)} / ${totalInQueue} de la rutina`
      : null;

  const isRepsManual = exercise.type === 'REPS';
  const isMixed = exercise.type === 'MIXED';

  function onRepSubmit(e: FormEvent) {
    e.preventDefault();
    const reps = Number(repInput);
    if (!Number.isFinite(reps) || reps < 0) return;
    confirmSet(reps);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-1">{exercise.name}</h1>
      <p className="text-slate-400 mb-1">
        {totalSetsLabel} juegos
        {exercise.durationPerSetSec ? ` · ${exercise.durationPerSetSec}s` : ''}
        {exercise.repsPerSet ? ` · ${exercise.repsPerSet} reps` : ''}
      </p>
      {routineContext && queueProgress && (
        <p className="text-violet-300 text-xs mb-6">
          {queueProgress}
          {routineContext.routineTitle ? ` · ${routineContext.routineTitle}` : ''}
          {routineContext.dayLabel ? ` · ${routineContext.dayLabel}` : ''}
        </p>
      )}
      {!queueProgress && <div className="mb-6" />}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
        {phase === 'idle' && (
          <>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-3">
              Resumen de la rutina
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left mb-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-slate-400">Tipo</div>
                <div className="text-right">{labelType(exercise.type)}</div>
                <div className="text-slate-400">Juegos</div>
                <div className="text-right">{exercise.sets}</div>
                {exercise.durationPerSetSec != null && (
                  <>
                    <div className="text-slate-400">Duración / juego</div>
                    <div className="text-right">{exercise.durationPerSetSec}s</div>
                  </>
                )}
                {exercise.repsPerSet != null && (
                  <>
                    <div className="text-slate-400">Reps objetivo / juego</div>
                    <div className="text-right">{exercise.repsPerSet}</div>
                  </>
                )}
                <div className="text-slate-400">Descanso</div>
                <div className="text-right">
                  {exercise.restSec > 0 ? `${exercise.restSec}s` : 'Sin descanso'}
                </div>
              </div>
            </div>

            {exercise.notes && exercise.notes.trim().length > 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left mb-6 max-h-48 overflow-y-auto">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                  Descripción
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {exercise.notes}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-4">Sin descripción.</p>
            )}

            <button
              onClick={start}
              className="w-full bg-brand-600 hover:bg-brand-500 transition rounded-xl py-3 font-medium text-lg"
            >
              Empezar
            </button>
          </>
        )}

        {phase === 'work' && isRepsManual && (
          <>
            <div className="text-emerald-400 text-sm uppercase tracking-wide font-semibold">
              Trabajo · juego {currentSet + 1} / {totalSetsLabel}
            </div>
            <form onSubmit={onRepSubmit} className="my-6">
              <label className="block text-slate-400 text-xs uppercase tracking-wide mb-2">
                Repeticiones realizadas
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                autoFocus
                value={repInput}
                onChange={(e) => setRepInput(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-4 text-center text-5xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 rounded-xl py-3 font-medium"
                >
                  Completado
                </button>
                <button
                  type="button"
                  onClick={skipSet}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3"
                >
                  Omitir
                </button>
              </div>
            </form>
            <div className="flex gap-2 mt-2">
              <button
                onClick={pause}
                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-2 text-sm"
              >
                Pausar
              </button>
            </div>
          </>
        )}

        {phase === 'work' && !isRepsManual && (
          <>
            <div className="text-emerald-400 text-sm uppercase tracking-wide font-semibold">
              Trabajo · juego {currentSet + 1} / {totalSetsLabel}
            </div>
            <div className="text-7xl font-bold my-6 tabular-nums">
              {formatTimer(remaining)}
            </div>
            <ProgressBar
              value={1 - remaining / (exercise.durationPerSetSec || 1)}
            />
            <div className="flex gap-2 mt-6">
              <button
                onClick={pause}
                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3"
              >
                Pausar
              </button>
              <button
                onClick={skipSet}
                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3"
              >
                Saltar
              </button>
            </div>
          </>
        )}

        {phase === 'rest' && (
          <>
            <div className="text-amber-400 text-sm uppercase tracking-wide font-semibold">
              Descanso
            </div>
            <div className="text-7xl font-bold my-6 tabular-nums">
              {formatTimer(remaining)}
            </div>
            <ProgressBar value={1 - remaining / (exercise.restSec || 1)} />
            <div className="flex gap-2 mt-6">
              <button
                onClick={pause}
                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3"
              >
                Pausar
              </button>
              <button
                onClick={skipSet}
                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3"
              >
                Saltar
              </button>
            </div>
          </>
        )}

        {phase === 'done' && isMixed && !saving && (
          <>
            <div className="text-emerald-400 text-sm uppercase tracking-wide font-semibold">
              ¡Sesión completa!
            </div>
            <p className="text-slate-300 mt-4 mb-2 text-sm">
              ¿Cuántas repeticiones totales hiciste?
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finishMixed();
              }}
              className="my-4"
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                autoFocus
                value={mixedRepsTotal}
                onChange={(e) => setMixedRepsTotal(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-center text-4xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="w-full mt-4 bg-brand-600 hover:bg-brand-500 rounded-xl py-3 font-medium"
              >
                Guardar sesión
              </button>
            </form>
            <div className="text-xs text-slate-500 mt-2">
              Volviendo al inicio si no confirmas.
            </div>
          </>
        )}

        {phase === 'done' && !(isMixed && !saving) && (
          <>
            <div className="text-emerald-400 text-sm uppercase tracking-wide font-semibold">
              ¡Ejercicio completo!
            </div>
            <div className="text-6xl font-bold my-6">✓</div>
            <div className="text-slate-400">
              {saving
                ? 'Guardando...'
                : remainingQueue.length > 0
                  ? `Guardado. Siguiente ejercicio en un momento...`
                  : 'Guardado. Volviendo al inicio...'}
            </div>
          </>
        )}

        {phase !== 'done' && (
          <button
            onClick={cancel}
            className="mt-4 text-sm text-slate-500 hover:text-slate-300"
          >
            Cancelar sesión
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-brand-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

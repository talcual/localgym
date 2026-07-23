import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exercisesApi, sessionsApi } from '../api';
import { Exercise } from '../api/types';
import { formatTimer } from '../utils/time';

type Phase = 'idle' | 'work' | 'rest' | 'done';

export function SessionRunner() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentSet, setCurrentSet] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);

  const endsAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const setIndexRef = useRef(0);
  const setsCompletedRef = useRef(0);

  useEffect(() => {
    if (!exerciseId) return;
    exercisesApi
      .get(exerciseId)
      .then(setExercise)
      .catch(() => setError('No se pudo cargar el ejercicio'))
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

  function beep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // ignore
    }
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
      const isLast = setIndexRef.current + 1 >= exercise.sets;
      if (isLast) {
        finish();
        return;
      }
      if (exercise.restSec > 0) {
        beep();
        vibrate([200, 100, 200]);
        startPhase('rest', exercise.restSec);
      } else {
        const next = setIndexRef.current + 1;
        setCurrentSet(next);
        const dur = exercise.durationPerSetSec ?? 0;
        startPhase('work', dur);
      }
    } else if (phaseRef.current === 'rest') {
      beep();
      vibrate(150);
      const next = setIndexRef.current + 1;
      setCurrentSet(next);
      const dur = exercise.durationPerSetSec ?? 0;
      startPhase('work', dur);
    }
  }

  function start() {
    if (!exercise) return;
    setCurrentSet(0);
    setsCompletedRef.current = 0;
    if (exercise.durationPerSetSec) {
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

  function skipSet() {
    if (!exercise) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (phaseRef.current === 'rest') {
      const next = setIndexRef.current + 1;
      if (next >= exercise.sets) {
        setsCompletedRef.current = next;
        finish();
        return;
      }
      setCurrentSet(next);
      startPhase('work', exercise.durationPerSetSec ?? 0);
    } else {
      setsCompletedRef.current = setIndexRef.current + 1;
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
  }

  function cancel() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    navigate('/exercises');
  }

  async function finish() {
    if (!exercise) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPhase('done');
    setSaving(true);
    try {
      const completed =
        setsCompletedRef.current > 0 ? setsCompletedRef.current : exercise.sets;
      await sessionsApi.create({
        exerciseId: exercise.id,
        setsCompleted: completed,
        totalDurationSec: (exercise.durationPerSetSec ?? 0) * completed,
        totalReps: (exercise.repsPerSet ?? 0) * completed,
      });
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      setError('No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const totalSetsLabel = useMemo(() => exercise?.sets ?? 0, [exercise]);

  if (loading) return <div className="text-slate-400">Cargando...</div>;
  if (!exercise) return <div className="text-red-400">{error || 'No encontrado'}</div>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-1">{exercise.name}</h1>
      <p className="text-slate-400 mb-6">
        {totalSetsLabel} juegos
        {exercise.durationPerSetSec ? ` · ${exercise.durationPerSetSec}s` : ''}
        {exercise.repsPerSet ? ` · ${exercise.repsPerSet} reps` : ''}
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        {phase === 'idle' && (
          <>
            <div className="text-slate-400 text-sm uppercase tracking-wide">
              Listo para empezar
            </div>
            <div className="text-6xl font-bold my-6">00:00</div>
            <button
              onClick={start}
              className="w-full bg-brand-600 hover:bg-brand-500 transition rounded-xl py-3 font-medium text-lg"
            >
              Empezar
            </button>
          </>
        )}

        {phase === 'work' && (
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

        {phase === 'done' && (
          <>
            <div className="text-emerald-400 text-sm uppercase tracking-wide font-semibold">
              ¡Sesión completa!
            </div>
            <div className="text-6xl font-bold my-6">✓</div>
            <div className="text-slate-400">
              {saving ? 'Guardando...' : 'Guardado. Volviendo al inicio...'}
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

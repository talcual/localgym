import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routinesApi } from '../../api';
import type {
  RoutineItemInput,
  RoutineWithItems,
} from '../../api/routines';
import { RoutineItemsEditor } from '../../components/RoutineItemsEditor';

export function InstructorRoutineForm() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<RoutineWithItems | null>(null);
  const [items, setItems] = useState<RoutineItemInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routineId) return;
    (async () => {
      try {
        const r = await routinesApi.get(routineId);
        setRoutine(r);
        // Sólo enviamos al editor los campos editables del item.
        setItems(
          r.items.map((it) => ({
            dayIndex: it.dayIndex,
            dayLabel: it.dayLabel,
            exerciseId: it.exerciseId ?? undefined,
            catalogId: it.catalogId ?? undefined,
            sets: it.sets ?? undefined,
            reps: it.reps ?? undefined,
            durationPerSetSec: it.durationPerSetSec ?? undefined,
            restSec: it.restSec ?? undefined,
            notes: it.notes ?? undefined,
          })),
        );
      } catch (err) {
        setError((err as Error).message || 'No se pudo cargar la rutina');
      }
    })();
  }, [routineId]);

  async function save() {
    if (!routine) return;
    setError(null);
    const withExercise = items.filter((it) => it.exerciseId || it.catalogId);
    if (withExercise.length < 3) {
      setError('La rutina debe tener al menos 3 ejercicios');
      return;
    }
    // Si el usuario borró ejercicios pero dejó días vacíos, los limpiamos
    // para evitar enviar días sin items.
    const clean = items.filter((it) => it.exerciseId || it.catalogId);
    setBusy(true);
    try {
      await routinesApi.replaceItems(routine.id, clean);
      navigate('/instructor/routines');
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  if (!routineId) return null;
  if (!routine && !error) return <div className="text-slate-400">Cargando...</div>;
  if (!routine) return <div className="text-rose-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {routine.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Edita los ejercicios por día. El cliente no puede modificar esta
          rutina.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
          Ejercicios
        </h2>
        <RoutineItemsEditor items={items} onChange={setItems} />
        {error && (
          <div className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/instructor/routines')}
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
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>
    </div>
  );
}
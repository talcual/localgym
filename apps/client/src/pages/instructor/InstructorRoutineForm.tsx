import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { routinesApi } from '../../api';
import type {
  RoutineWithItems,
} from '../../api/routines';
import {
  groupRoutineItemsByDay,
} from '../../api/routines';

export function InstructorRoutineForm() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<RoutineWithItems | null>(null);
  const [itemsJson, setItemsJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routineId) return;
    (async () => {
      try {
        const r = await routinesApi.get(routineId);
        setRoutine(r);
        setItemsJson(JSON.stringify(r.items, null, 2));
      } catch (err) {
        setError((err as Error).message || 'No se pudo cargar la rutina');
      }
    })();
  }, [routineId]);

  async function save() {
    if (!routine) return;
    setError(null);
    let parsed: any[];
    try {
      parsed = JSON.parse(itemsJson);
    } catch (err) {
      setError('JSON inválido: ' + (err as Error).message);
      return;
    }
    setBusy(true);
    try {
      await routinesApi.replaceItems(routine.id, parsed);
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
          Días
        </h2>
        <div className="space-y-2 text-sm">
          {groupRoutineItemsByDay(routine.items).map((d) => (
            <div key={d.dayIndex} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="font-medium">D{d.dayIndex + 1} · {d.dayLabel}</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-400">
                {d.items.map((it) => (
                  <li key={it.id}>
                    {it.exerciseId ?? it.catalogId ?? '—'}
                    {it.sets ? ` · ${it.sets} sets` : ''}
                    {it.reps ? ` × ${it.reps} reps` : ''}
                    {it.durationPerSetSec ? ` × ${it.durationPerSetSec}s` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
          Reemplazar items (JSON)
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Cuidado: reemplaza TODOS los items. Mantén al menos 3 ejercicios.
        </p>
        <textarea
          value={itemsJson}
          onChange={(e) => setItemsJson(e.target.value)}
          rows={18}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-xs focus:border-violet-500 focus:outline-none"
        />
        {error && (
          <div className="mt-2 rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
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
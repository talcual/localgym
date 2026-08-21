import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { instructorsApi, routinesApi } from '../../api';
import type { InstructorClient } from '../../api/types';
import type {
  RoutineItemInput,
  RoutineWithItems,
} from '../../api/routines';
import {
  groupRoutineItemsByDay,
} from '../../api/routines';

export function InstructorRoutines() {
  const [clients, setClients] = useState<InstructorClient[]>([]);
  const [routinesByClient, setRoutinesByClient] = useState<
    Record<string, RoutineWithItems[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const c = await instructorsApi.listClients();
    const active = c.filter((x) => x.status === 'ACTIVE');
    setClients(active);
    const result: Record<string, RoutineWithItems[]> = {};
    for (const cli of active) {
      const list = await routinesApi.list(cli.clientId);
      result[cli.clientId] = list.filter(
        (r) => r.writtenByInstructorId != null,
      );
    }
    setRoutinesByClient(result);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Rutinas escritas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Crea rutinas para tus clientes y asígnalas con una ventana de
            fechas desde el detalle del cliente.
          </p>
        </div>
        <button
          type="button"
          disabled={clients.length === 0}
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            clients.length === 0
              ? 'Necesitas al menos un cliente activo para crear una rutina'
              : 'Crear nueva rutina'
          }
        >
          <Plus className="h-4 w-4" /> Nueva rutina
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-8 text-center text-slate-400">
          Sin clientes activos. Acepta una invitación para empezar.
        </div>
      ) : (
        clients.map((c) => (
          <section
            key={c.id}
            className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                Cliente #{c.clientId.slice(0, 8)}
              </h2>
              <Link
                to={`/instructor/clients/${c.clientId}`}
                className="text-xs text-slate-400 underline hover:text-white"
              >
                Ver detalle
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {(routinesByClient[c.clientId] ?? []).length === 0 ? (
                <li className="text-xs text-slate-500">
                  Aún no has escrito rutinas para este cliente.
                </li>
              ) : (
                routinesByClient[c.clientId].map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                  >
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {r.goal} · {r.daysPerWeek} días ·{' '}
                        {r.items.length} ejercicios
                      </div>
                    </div>
                    <Link
                      to={`/instructor/routines/${r.id}/edit`}
                      className="text-xs text-violet-300 underline"
                    >
                      Editar
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))
      )}

      {creating && (
        <NewRoutineModal
          clients={clients}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Modal para crear una rutina nueva para un cliente. El instructor elige:
 *  - Cliente destino (selector).
 *  - Título, objetivo, nivel, días por semana.
 *  - Lista inicial de items (uno por día por defecto, 3 ejercicios del catálogo).
 *
 * El backend graba la rutina con `user_id = clienteId` y `written_by_instructor_id = instructorId`.
 */
function NewRoutineModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: InstructorClient[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [clientId, setClientId] = useState<string>(clients[0]?.clientId ?? '');
  const [title, setTitle] = useState('Rutina personalizada');
  const [goal, setGoal] = useState<'strength' | 'hypertrophy' | 'fat_loss' | 'endurance'>(
    'hypertrophy',
  );
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'beginner',
  );
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [items, setItems] = useState<RoutineItemInput[]>(() =>
    defaultItemsFor(3),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regenera items cuando cambia días por semana.
  useEffect(() => {
    setItems(defaultItemsFor(daysPerWeek));
  }, [daysPerWeek]);

  const days = useMemo(() => groupRoutineItemsByDay(items as any), [items]);

  async function save() {
    if (!clientId) {
      setError('Selecciona un cliente');
      return;
    }
    if (items.length < 3) {
      setError('La rutina debe tener al menos 3 ejercicios');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await routinesApi.create(
        {
          title,
          goal,
          level,
          daysPerWeek,
          summary: undefined,
          items,
        },
        clientId,
      );
      await onCreated();
    } catch (err) {
      setError(
        (err as Error).message ||
          (err as any)?.response?.data?.message ||
          'No se pudo crear la rutina',
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
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0d1526] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold">Nueva rutina para cliente</h2>
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
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Cliente destino
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  Cliente #{c.clientId.slice(0, 8)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              La rutina queda como propiedad del cliente; tú solo la
              "escribes en su nombre".
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </Field>
            <Field label="Objetivo">
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                <option value="strength">Fuerza</option>
                <option value="hypertrophy">Hipertrofia</option>
                <option value="fat_loss">Pérdida de grasa</option>
                <option value="endurance">Resistencia</option>
              </select>
            </Field>
            <Field label="Nivel">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </Field>
            <Field label="Días por semana">
              <input
                type="number"
                min={3}
                max={6}
                value={daysPerWeek}
                onChange={(e) =>
                  setDaysPerWeek(Math.max(3, Math.min(6, Number(e.target.value) || 3)))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </Field>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Ejercicios generados
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Se crean {daysPerWeek} días con 1 ejercicio por día apuntando al
              catálogo. Luego podrás editar el detalle y los ejercicios
              concretos desde "Editar".
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {days.map((d) => (
                <li
                  key={d.dayIndex}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                >
                  <span>
                    D{d.dayIndex + 1} · {d.dayLabel}
                  </span>
                  <span>{d.items.length} ejercicio(s)</span>
                </li>
              ))}
            </ul>
          </div>

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
            {busy ? 'Creando...' : 'Crear rutina'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function defaultItemsFor(daysPerWeek: number): RoutineItemInput[] {
  const dayLabels = ['Día A', 'Día B', 'Día C', 'Día D', 'Día E', 'Día F'];
  const items: RoutineItemInput[] = [];
  for (let d = 0; d < daysPerWeek; d++) {
    items.push({
      dayIndex: d,
      dayLabel: dayLabels[d] ?? `Día ${d + 1}`,
      // Sin exerciseId ni catalogId: el instructor lo completará al editar.
      sets: 3,
      reps: 12,
      restSec: 60,
    });
  }
  return items;
}
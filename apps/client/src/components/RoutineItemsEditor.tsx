import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Library,
  UserPlus,
} from 'lucide-react';
import { catalogApi, exercisesApi } from '../api';
import type {
  CatalogExercise,
  Exercise,
  ExerciseType,
} from '../api/types';
import type { RoutineItemInput } from '../api/routines';

interface Props {
  /**
   * Lista de items editable. El componente es controlado: el padre mantiene
   * el estado y nosotros emitimos `onChange` con la lista nueva.
   */
  items: RoutineItemInput[];
  onChange: (next: RoutineItemInput[]) => void;
  /** ID del cliente destino, necesario para crear ejercicios nuevos en su cuenta. */
  clientId: string;
  /** Modo solo lectura (no añadir/quitar/mover). */
  readOnly?: boolean;
}

const DAY_LABELS_SUGGESTED = [
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Brazo',
  'Core / Abdomen',
  'Cardio',
  'Full body',
  'Día A',
  'Día B',
  'Día C',
  'Día D',
  'Día E',
  'Día F',
];

/**
 * Editor visual de items de una rutina.
 *
 * Muestra siempre el nombre del ejercicio (nunca el UUID). Los nombres se
 * hidratan desde el catálogo y desde los ejercicios del cliente. El
 * instructor puede:
 *  - Añadir ejercicios del catálogo público (botón "Del catálogo").
 *  - Añadir ejercicios de la cuenta del cliente (botón "Del cliente").
 *  - Crear un ejercicio nuevo en la cuenta del cliente (botón "+ Crear
 *    nuevo") — útil cuando el ejercicio no existe en ninguno de los dos
 *    pools. Se crea con `exercisesApi.create(...)` y se referencia por su
 *    `exerciseId` resultante.
 */
export function RoutineItemsEditor({
  items,
  onChange,
  clientId,
  readOnly = false,
}: Props) {
  const days = useMemo(() => {
    const map = new Map<
      number,
      {
        dayIndex: number;
        dayLabel: string;
        items: (RoutineItemInput & { _key: string })[];
      }
    >();
    items.forEach((it, idx) => {
      const cur = map.get(it.dayIndex) ?? {
        dayIndex: it.dayIndex,
        dayLabel: it.dayLabel,
        items: [],
      };
      cur.items.push({ ...it, _key: `k${idx}` });
      map.set(it.dayIndex, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.dayIndex - b.dayIndex);
  }, [items]);

  function updateDayLabel(dayIndex: number, label: string) {
    onChange(
      items.map((it) => (it.dayIndex === dayIndex ? { ...it, dayLabel: label } : it)),
    );
  }

  function updateItem(globalIndex: number, patch: Partial<RoutineItemInput>) {
    onChange(items.map((it, i) => (i === globalIndex ? { ...it, ...patch } : it)));
  }

  function removeItem(globalIndex: number) {
    onChange(items.filter((_, i) => i !== globalIndex));
  }

  function moveItem(globalIndex: number, dir: -1 | 1) {
    const target = items[globalIndex];
    if (!target) return;
    const sameDayIndices = items
      .map((it, i) => ({ it, i }))
      .filter((x) => x.it.dayIndex === target.dayIndex);
    const posInDay = sameDayIndices.findIndex((x) => x.i === globalIndex);
    const swapPos = posInDay + dir;
    if (swapPos < 0 || swapPos >= sameDayIndices.length) return;
    const a = sameDayIndices[posInDay].i;
    const b = sameDayIndices[swapPos].i;
    const next = [...items];
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  }

  function addItemToDay(
    dayIndex: number,
    dayLabel: string,
    payload: {
      catalogId?: string;
      exerciseId?: string;
      name: string;
      source: 'catalog' | 'client';
      sets: number;
      reps?: number;
      durationPerSetSec?: number;
      restSec: number;
    },
  ) {
    onChange([
      ...items,
      {
        dayIndex,
        dayLabel,
        catalogId: payload.catalogId,
        exerciseId: payload.exerciseId,
        sets: payload.sets,
        reps: payload.reps,
        durationPerSetSec: payload.durationPerSetSec,
        restSec: payload.restSec,
        _exerciseName: payload.name,
        _exerciseSource: payload.source,
      },
    ]);
  }

  function addEmptyDay() {
    const used = new Set(items.map((i) => i.dayIndex));
    let next = 0;
    while (used.has(next)) next++;
    if (next > 5) return; // max 6 días (0-5)
    onChange([
      ...items,
      {
        dayIndex: next,
        dayLabel: DAY_LABELS_SUGGESTED[next] ?? `Día ${next + 1}`,
        sets: 3,
        reps: 12,
        restSec: 60,
      },
    ]);
  }

  function removeDay(dayIndex: number) {
    if (!confirm('¿Quitar este día y todos sus ejercicios?')) return;
    onChange(items.filter((it) => it.dayIndex !== dayIndex));
  }

  const totalExercises = items.filter((i) => i.exerciseId || i.catalogId).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {days.length} {days.length === 1 ? 'día' : 'días'} · {totalExercises}{' '}
          ejercicios
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={addEmptyDay}
            disabled={days.length >= 6}
            className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs hover:border-violet-500 disabled:opacity-50"
            title={days.length >= 6 ? 'Máximo 6 días' : 'Añadir día'}
          >
            <Plus className="h-3.5 w-3.5" /> Añadir día
          </button>
        )}
      </div>

      {days.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
          Aún no hay días. Añade uno con el botón de arriba.
        </div>
      )}

      {days.map((d) => (
        <DayCard
          key={d.dayIndex}
          dayIndex={d.dayIndex}
          dayLabel={d.dayLabel}
          items={d.items}
          readOnly={readOnly}
          clientId={clientId}
          onChangeDayLabel={(label) => updateDayLabel(d.dayIndex, label)}
          onAddItem={(payload) => addItemToDay(d.dayIndex, d.dayLabel, payload)}
          onUpdateItem={(key, patch) => {
            const idx = items.findIndex((_, i) => `k${i}` === key);
            if (idx >= 0) updateItem(idx, patch);
          }}
          onRemoveItem={(key) => {
            const idx = items.findIndex((_, i) => `k${i}` === key);
            if (idx >= 0) removeItem(idx);
          }}
          onMoveItem={(key, dir) => {
            const idx = items.findIndex((_, i) => `k${i}` === key);
            if (idx >= 0) moveItem(idx, dir);
          }}
          onRemoveDay={() => removeDay(d.dayIndex)}
        />
      ))}
    </div>
  );
}

function DayCard({
  dayIndex,
  dayLabel,
  items,
  readOnly,
  clientId,
  onChangeDayLabel,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onRemoveDay,
}: {
  dayIndex: number;
  dayLabel: string;
  items: (RoutineItemInput & { _key: string })[];
  readOnly: boolean;
  clientId: string;
  onChangeDayLabel: (label: string) => void;
  onAddItem: (payload: {
    catalogId?: string;
    exerciseId?: string;
    name: string;
    source: 'catalog' | 'client';
    sets: number;
    reps?: number;
    durationPerSetSec?: number;
    restSec: number;
  }) => void;
  onUpdateItem: (key: string, patch: Partial<RoutineItemInput>) => void;
  onRemoveItem: (key: string) => void;
  onMoveItem: (key: string, dir: -1 | 1) => void;
  onRemoveDay: () => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-300">
            D{dayIndex + 1}
          </span>
          {readOnly ? (
            <span className="text-sm font-medium text-slate-200">{dayLabel}</span>
          ) : (
            <input
              value={dayLabel}
              onChange={(e) => onChangeDayLabel(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
            />
          )}
        </div>
        {!readOnly && items.length > 0 && (
          <button
            type="button"
            onClick={onRemoveDay}
            className="text-xs text-rose-300 hover:text-rose-200"
            title="Quitar día entero"
          >
            Quitar día
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-xs text-slate-500">Sin ejercicios en este día.</li>
        ) : (
          items.map((it, pos) => (
            <ItemRow
              key={it._key}
              position={pos}
              total={items.length}
              item={it}
              readOnly={readOnly}
              onUpdate={(patch) => onUpdateItem(it._key, patch)}
              onRemove={() => onRemoveItem(it._key)}
              onMove={(dir) => onMoveItem(it._key, dir)}
            />
          ))
        )}
      </ul>

      {!readOnly && (
        <div className="mt-3">
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded border border-dashed border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-violet-500"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar ejercicio
            </button>
          ) : (
            <ExercisePicker
              clientId={clientId}
              dayIndex={dayIndex}
              onPick={(payload) => {
                onAddItem(payload);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  position,
  total,
  item,
  readOnly,
  onUpdate,
  onRemove,
  onMove,
}: {
  position: number;
  total: number;
  item: RoutineItemInput & { _key: string };
  readOnly: boolean;
  onUpdate: (patch: Partial<RoutineItemInput>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [name, setName] = useState<string | null>(item._exerciseName ?? null);
  const [resolved, setResolved] = useState<boolean>(Boolean(item._exerciseName));

  // Si el item no trae nombre hidratado, lo buscamos.
  useEffect(() => {
    let cancelled = false;
    if (item._exerciseName) {
      setName(item._exerciseName);
      setResolved(true);
      return;
    }
    if (item.catalogId) {
      catalogApi
        .list()
        .then((list) => {
          if (cancelled) return;
          const found = list.find((c) => c.id === item.catalogId);
          if (found) {
            setName(found.name);
            setResolved(true);
          } else {
            setName('Ejercicio del catálogo');
            setResolved(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setName('Ejercicio del catálogo');
          setResolved(false);
        });
      return;
    }
    if (item.exerciseId) {
      // No tenemos un endpoint directo para buscar por id; usamos /exercises?clientId
      // y filtramos. El ID aparece en la lista.
      exercisesApi
        .list()
        .then((list) => {
          if (cancelled) return;
          const found = list.find((e) => e.id === item.exerciseId);
          if (found) {
            setName(found.name);
            setResolved(true);
          } else {
            setName('Ejercicio del cliente');
            setResolved(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setName('Ejercicio del cliente');
          setResolved(false);
        });
      return;
    }
    setName('Sin ejercicio');
    setResolved(false);
    return () => {
      cancelled = true;
    };
  }, [item.catalogId, item.exerciseId, item._exerciseName]);

  const sourceBadge =
    item._exerciseSource === 'client' || (!item.catalogId && item.exerciseId) ? (
      <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-indigo-300">
        Cliente
      </span>
    ) : (
      <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-violet-300">
        Catálogo
      </span>
    );

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-medium text-slate-300">
            {position + 1}
          </span>
          {sourceBadge}
          <span
            className={
              'text-slate-100 ' + (resolved ? 'font-medium' : 'italic text-slate-400')
            }
          >
            {name ?? '...'}
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={position === 0}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              title="Subir"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={position === total - 1}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              title="Bajar"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1 text-rose-300 hover:bg-rose-950"
              title="Quitar ejercicio"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        <NumberField
          label="Series"
          value={item.sets ?? 3}
          disabled={readOnly}
          onChange={(v) => onUpdate({ sets: v })}
        />
        <NumberField
          label="Reps"
          value={item.reps ?? ''}
          disabled={readOnly}
          onChange={(v) => onUpdate({ reps: v })}
        />
        <NumberField
          label="Duración (s)"
          value={item.durationPerSetSec ?? ''}
          disabled={readOnly}
          onChange={(v) => onUpdate({ durationPerSetSec: v })}
        />
        <NumberField
          label="Descanso (s)"
          value={item.restSec ?? 60}
          disabled={readOnly}
          onChange={(v) => onUpdate({ restSec: v })}
        />
      </div>
      {!readOnly && (
        <div className="mt-2">
          <input
            value={item.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            placeholder="Notas (opcional)"
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
          />
        </div>
      )}
    </li>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | '';
  disabled: boolean;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value === '' ? '' : value}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(undefined);
          } else {
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : undefined);
          }
        }}
        className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-60"
      />
    </label>
  );
}

/**
 * Selector de ejercicio con tres pestañas:
 *  - "Del catálogo" — autocomplete sobre `/api/catalog`.
 *  - "Del cliente" — autocomplete sobre `/api/exercises?clientId=`.
 *  - "+ Crear nuevo" — form mini que crea un ejercicio en la cuenta del
 *    cliente y devuelve el `exerciseId`.
 */
function ExercisePicker({
  clientId,
  dayIndex,
  onPick,
  onCancel,
}: {
  clientId: string;
  dayIndex: number;
  onPick: (payload: {
    catalogId?: string;
    exerciseId?: string;
    name: string;
    source: 'catalog' | 'client';
    sets: number;
    reps?: number;
    durationPerSetSec?: number;
    restSec: number;
  }) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<'catalog' | 'client' | 'new'>('catalog');

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex gap-1 text-xs">
          <TabButton
            active={tab === 'catalog'}
            onClick={() => setTab('catalog')}
            icon={<Library className="h-3.5 w-3.5" />}
          >
            Del catálogo
          </TabButton>
          <TabButton
            active={tab === 'client'}
            onClick={() => setTab('client')}
            icon={<UserPlus className="h-3.5 w-3.5" />}
          >
            Del cliente
          </TabButton>
          <TabButton
            active={tab === 'new'}
            onClick={() => setTab('new')}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Crear nuevo
          </TabButton>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-slate-400 hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="pt-2">
        {tab === 'catalog' && (
          <CatalogSearch
            onPick={(ex) =>
              onPick({
                catalogId: ex.id,
                name: ex.name,
                source: 'catalog',
                sets: ex.sets,
                reps: ex.repsPerSet ?? undefined,
                durationPerSetSec: ex.durationPerSetSec ?? undefined,
                restSec: ex.restSec,
              })
            }
          />
        )}
        {tab === 'client' && (
          <ClientSearch
            clientId={clientId}
            onPick={(ex) =>
              onPick({
                exerciseId: ex.id,
                name: ex.name,
                source: 'client',
                sets: ex.sets,
                reps: ex.repsPerSet ?? undefined,
                durationPerSetSec: ex.durationPerSetSec ?? undefined,
                restSec: ex.restSec,
              })
            }
          />
        )}
        {tab === 'new' && (
          <NewExerciseForm
            clientId={clientId}
            dayIndex={dayIndex}
            onCreated={(ex) =>
              onPick({
                exerciseId: ex.id,
                name: ex.name,
                source: 'client',
                sets: ex.sets,
                reps: ex.repsPerSet ?? undefined,
                durationPerSetSec: ex.durationPerSetSec ?? undefined,
                restSec: ex.restSec,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1 rounded px-2 py-1 transition ' +
        (active
          ? 'bg-violet-600/20 text-violet-200'
          : 'text-slate-300 hover:bg-slate-800')
      }
    >
      {icon}
      {children}
    </button>
  );
}

function CatalogSearch({
  onPick,
}: {
  onPick: (ex: CatalogExercise) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const list = await catalogApi.list({ search: query || undefined });
        setResults(list.slice(0, 12));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el catálogo (ej. 'sentadilla')"
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
        />
      </div>
      <ResultsList loading={loading} emptyText="Sin resultados.">
        {results.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => onPick(ex)}
              className="flex w-full items-start justify-between gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-left text-xs hover:border-violet-500"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-200">
                  {ex.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {labelType(ex.type)} · {ex.sets} juegos
                  {ex.repsPerSet ? ` · ${ex.repsPerSet} reps` : ''}
                  {ex.durationPerSetSec ? ` · ${ex.durationPerSetSec}s` : ''}
                  {ex.category ? ` · ${ex.category}` : ''}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-500" />
            </button>
          </li>
        ))}
      </ResultsList>
    </div>
  );
}

function ClientSearch({
  clientId,
  onPick,
}: {
  clientId: string;
  onPick: (ex: Exercise) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const list = await exercisesApi.list(clientId);
        const filtered = query
          ? list.filter((e) =>
              e.name.toLowerCase().includes(query.toLowerCase()),
            )
          : list;
        setResults(filtered.slice(0, 12));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, clientId]);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ejercicios del cliente"
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
        />
      </div>
      <ResultsList loading={loading} emptyText="El cliente aún no tiene ejercicios.">
        {results.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => onPick(ex)}
              className="flex w-full items-start justify-between gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-left text-xs hover:border-violet-500"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-200">
                  {ex.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {labelType(ex.type)} · {ex.sets} juegos
                  {ex.repsPerSet ? ` · ${ex.repsPerSet} reps` : ''}
                  {ex.durationPerSetSec ? ` · ${ex.durationPerSetSec}s` : ''}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-500" />
            </button>
          </li>
        ))}
      </ResultsList>
    </div>
  );
}

function NewExerciseForm({
  clientId,
  onCreated,
}: {
  clientId: string;
  dayIndex: number;
  onCreated: (ex: Exercise) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('REPS');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(12);
  const [duration, setDuration] = useState(30);
  const [rest, setRest] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        sets,
        restSec: rest,
      };
      if (type === 'TIME' || type === 'MIXED') payload.durationPerSetSec = duration;
      if (type === 'REPS' || type === 'MIXED') payload.repsPerSet = reps;
      const ex = await exercisesApi.create(payload, clientId);
      onCreated(ex);
    } catch (err) {
      setError((err as Error).message || 'No se pudo crear el ejercicio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] uppercase tracking-wide text-slate-500">
          Nombre
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Plancha frontal"
          className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Tipo
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
          >
            <option value="REPS">Reps</option>
            <option value="TIME">Tiempo</option>
            <option value="MIXED">Mixto</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Series
          </span>
          <input
            type="number"
            min={1}
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>
        {(type === 'REPS' || type === 'MIXED') && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Reps
            </span>
            <input
              type="number"
              min={1}
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
        )}
        {(type === 'TIME' || type === 'MIXED') && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Duración (s)
            </span>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
            />
          </label>
        )}
        <label className="block">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Descanso (s)
          </span>
          <input
            type="number"
            min={0}
            value={rest}
            onChange={(e) => setRest(Number(e.target.value))}
            className="mt-0.5 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>
      </div>
      {error && (
        <div className="rounded border border-rose-900/50 bg-rose-950/30 p-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded bg-violet-600 px-3 py-1 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {busy ? 'Creando...' : 'Crear y agregar'}
        </button>
      </div>
    </div>
  );
}

function ResultsList({
  loading,
  emptyText,
  children,
}: {
  loading: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <div className="mt-2 max-h-56 overflow-y-auto">
      {loading && <div className="p-2 text-xs text-slate-500">Buscando...</div>}
      {!loading && !hasChildren && (
        <div className="p-2 text-xs text-slate-500">{emptyText}</div>
      )}
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function labelType(t: string) {
  if (t === 'TIME') return 'Tiempo';
  if (t === 'REPS') return 'Reps';
  return 'Mixto';
}
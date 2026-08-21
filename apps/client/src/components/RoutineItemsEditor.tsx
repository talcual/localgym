import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { catalogApi } from '../api';
import type { CatalogExercise } from '../api/types';
import type { RoutineItemInput } from '../api/routines';

interface Props {
  /**
   * Lista de items editable. El componente es controlado: el padre mantiene
   * el estado y nosotros emitimos `onChange` con la lista nueva.
   */
  items: RoutineItemInput[];
  onChange: (next: RoutineItemInput[]) => void;
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
 * Editor visual de items de una rutina. Cada día muestra su lista de
 * ejercicios con sus parámetros. Para añadir un ejercicio se usa un
 * buscador del catálogo (autocomplete).
 *
 * No requiere conocimientos técnicos del modelo: el instructor ve nombres
 * amigables, ajusta sets/reps con inputs numéricos y mueve ejercicios con
 * flechas.
 */
export function RoutineItemsEditor({ items, onChange, readOnly = false }: Props) {
  // Agrupa por día, conservando el orden dentro de cada día.
  const days = useMemo(() => {
    const map = new Map<number, { dayIndex: number; dayLabel: string; items: (RoutineItemInput & { _key: string })[] }>();
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
    // Sólo dentro del mismo día.
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

  function addItemToDay(dayIndex: number, dayLabel: string, ex: CatalogExercise) {
    const next: RoutineItemInput = {
      dayIndex,
      dayLabel,
      exerciseId: undefined,
      catalogId: ex.id,
      sets: ex.sets,
      reps: ex.repsPerSet ?? undefined,
      durationPerSetSec: ex.durationPerSetSec ?? undefined,
      restSec: ex.restSec,
      notes: undefined,
    };
    onChange([...items, next]);
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
          onChangeDayLabel={(label) => updateDayLabel(d.dayIndex, label)}
          onAddItem={(ex) => addItemToDay(d.dayIndex, d.dayLabel, ex)}
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
  onChangeDayLabel: (label: string) => void;
  onAddItem: (ex: CatalogExercise) => void;
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
            <CatalogPicker
              onPick={(ex) => {
                onAddItem(ex);
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
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-medium text-slate-300">
            {position + 1}
          </span>
          {readOnly ? (
            <span className="text-slate-200">
              Ejercicio #{item.exerciseId ?? item.catalogId ?? '—'}
            </span>
          ) : (
            <span className="text-slate-200">
              Ejercicio del catálogo
              {item.catalogId ? ` #${item.catalogId}` : ''}
              {item.exerciseId ? ` #${item.exerciseId}` : ''}
            </span>
          )}
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
 * Buscador del catálogo: el instructor escribe un texto y ve una lista
 * filtrada de ejercicios; al hacer clic se añade al día actual.
 */
function CatalogPicker({
  onPick,
  onCancel,
}: {
  onPick: (ex: CatalogExercise) => void;
  onCancel: () => void;
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
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
      <div className="flex items-center gap-1">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el catálogo (ej. 'sentadilla')"
          className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-slate-400 hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {loading && <div className="p-2 text-xs text-slate-500">Buscando...</div>}
        {!loading && results.length === 0 && (
          <div className="p-2 text-xs text-slate-500">Sin resultados.</div>
        )}
        <ul className="space-y-1">
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
        </ul>
      </div>
    </div>
  );
}

function labelType(t: string) {
  if (t === 'TIME') return 'Tiempo';
  if (t === 'REPS') return 'Reps';
  return 'Mixto';
}
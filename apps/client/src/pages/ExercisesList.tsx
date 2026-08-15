import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exercisesApi } from '../api';
import type {
  ExerciseType,
  ExerciseWithRoutineCount,
} from '../api/types';

type TypeFilter = 'all' | ExerciseType;
type View = 'all' | 'free' | 'in_routine';

export function ExercisesList() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<ExerciseWithRoutineCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [view, setView] = useState<View>('free');

  function load() {
    exercisesApi
      .list()
      .then(setExercises)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    await exercisesApi.remove(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  const counts = useMemo(() => {
    let free = 0;
    let inRoutine = 0;
    for (const e of exercises) {
      if (e.routineCount === 0) free++;
      else inRoutine++;
    }
    return { free, inRoutine, all: exercises.length };
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises
      .filter((e) => {
        if (view === 'free' && e.routineCount > 0) return false;
        if (view === 'in_routine' && e.routineCount === 0) return false;
        if (type !== 'all' && e.type !== type) return false;
        if (!q) return true;
        return e.name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        // Libres primero, luego los de rutina por cantidad de rutinas desc.
        if (view !== 'all') return 0;
        if (a.routineCount === 0 && b.routineCount > 0) return -1;
        if (a.routineCount > 0 && b.routineCount === 0) return 1;
        return b.routineCount - a.routineCount;
      });
  }, [exercises, view, type, search]);

  const totalCount = exercises.length;
  const shownCount = filtered.length;

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Ejercicios</h1>
          <p className="mt-1 text-xs text-slate-400">
            {totalCount === 0
              ? 'Aún no tienes ejercicios.'
              : `${counts.free} libres · ${counts.inRoutine} en rutinas`}
          </p>
        </div>
        <Link
          to="/exercises/new"
          className="bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-md text-sm"
        >
          + Nuevo ejercicio
        </Link>
      </div>

      {/* Tabs: Libres / De rutina */}
      <div
        role="tablist"
        aria-label="Filtrar por uso en rutinas"
        className="inline-flex flex-wrap rounded-md border border-slate-800 bg-[#091121] p-0.5"
      >
        <TabButton
          active={view === 'free'}
          onClick={() => setView('free')}
          label="Libres"
          count={counts.free}
        />
        <TabButton
          active={view === 'in_routine'}
          onClick={() => setView('in_routine')}
          label="De rutina"
          count={counts.inRoutine}
        />
        <TabButton
          active={view === 'all'}
          onClick={() => setView('all')}
          label="Todos"
          count={counts.all}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-[#0d1526] p-3">
        <div className="flex-1 min-w-[180px]">
          <label className="sr-only" htmlFor="exercise-search">
            Buscar ejercicio
          </label>
          <input
            id="exercise-search"
            type="search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-[#091121] px-3 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500"
          />
        </div>
        <TypeChips value={type} onChange={setType} />
        {(search || type !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setType('all');
            }}
            className="inline-flex items-center rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300"
          >
            Limpiar
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          Aún no tienes ejercicios. Crea uno con "+ Nuevo ejercicio".
        </div>
      ) : shownCount === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          {view === 'free'
            ? 'No tienes ejercicios libres. Todos están asociados a alguna rutina.'
            : view === 'in_routine'
              ? 'Aún no tienes ejercicios asociados a rutinas. Genera una con AI Couch.'
              : 'Ningun ejercicio coincide con los filtros.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onDelete={() => onDelete(ex.id)}
              onTrain={() => navigate(`/sessions/run/${ex.id}`)}
              onEdit={() => navigate(`/exercises/${ex.id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise: ex,
  onTrain,
  onEdit,
  onDelete,
}: {
  exercise: ExerciseWithRoutineCount;
  onTrain: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isFree = ex.routineCount === 0;
  return (
    <div
      className={
        'bg-slate-900 border rounded-xl p-4 ' +
        (isFree ? 'border-slate-800' : 'border-violet-700/40')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UsageBadge routineCount={ex.routineCount} />
            <div className="truncate font-medium">{ex.name}</div>
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {ex.sets} juegos · {labelType(ex.type)} ·{' '}
            {ex.durationPerSetSec ? `${ex.durationPerSetSec}s` : ''}{' '}
            {ex.repsPerSet ? `${ex.repsPerSet} reps` : ''}
            {ex.restSec ? ` · descanso ${ex.restSec}s` : ''}
          </div>
          {ex.notes && (
            <div className="text-sm text-slate-500 mt-2">{ex.notes}</div>
          )}
        </div>
        <TypeBadge type={ex.type} />
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onTrain}
          className="bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-md text-sm"
        >
          Entrenar
        </button>
        <button
          onClick={onEdit}
          className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md text-sm"
        >
          Editar
        </button>
        {isFree && (
          <button
            onClick={onDelete}
            className="bg-slate-800 hover:bg-red-900 px-3 py-1.5 rounded-md text-sm text-red-300"
            title="Solo puedes borrar ejercicios libres"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ' +
        (active
          ? 'bg-violet-600 text-white'
          : 'text-slate-300 hover:text-white')
      }
    >
      <span>{label}</span>
      <span
        className={
          'rounded-full px-1.5 text-[10px] ' +
          (active ? 'bg-white/15' : 'bg-slate-800')
        }
      >
        {count}
      </span>
    </button>
  );
}

function UsageBadge({ routineCount }: { routineCount: number }) {
  if (routineCount === 0) {
    return (
      <span
        className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-200"
        title="No está asociado a ninguna rutina"
      >
        Libre
      </span>
    );
  }
  return (
    <span
      className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-200"
      title={`Asociado a ${routineCount} rutina${routineCount === 1 ? '' : 's'}`}
    >
      {routineCount === 1 ? '1 rutina' : `${routineCount} rutinas`}
    </span>
  );
}

function TypeChips({
  value,
  onChange,
}: {
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
}) {
  const options: Array<{ v: TypeFilter; label: string }> = [
    { v: 'all', label: 'Todos' },
    { v: 'TIME', label: 'Tiempo' },
    { v: 'REPS', label: 'Reps' },
    { v: 'MIXED', label: 'Mixto' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo"
      className="inline-flex flex-wrap gap-1 rounded-md border border-slate-800 bg-[#091121] p-0.5"
    >
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.v)}
            className={
              'rounded px-2.5 py-1 text-xs font-medium transition ' +
              (active
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:text-white')
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }: { type: ExerciseType }) {
  const map: Record<ExerciseType, { label: string; cls: string }> = {
    TIME: { label: 'Tiempo', cls: 'bg-sky-500/15 text-sky-300' },
    REPS: { label: 'Reps', cls: 'bg-violet-500/15 text-violet-300' },
    MIXED: { label: 'Mixto', cls: 'bg-amber-500/15 text-amber-300' },
  };
  const v = map[type];
  return (
    <span
      className={
        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ' + v.cls
      }
    >
      {v.label}
    </span>
  );
}

function labelType(t: ExerciseType): string {
  if (t === 'TIME') return 'por tiempo';
  if (t === 'REPS') return 'por repeticiones';
  return 'mixto';
}

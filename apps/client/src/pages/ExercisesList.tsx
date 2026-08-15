import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exercisesApi } from '../api';
import type { Exercise, ExerciseType } from '../api/types';

type TypeFilter = 'all' | ExerciseType;

export function ExercisesList() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');

  function load() {
    // Endpoint dedicado: solo los creados manualmente por el usuario.
    exercisesApi
      .listManual()
      .then(setExercises)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    await exercisesApi.remove(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (type !== 'all' && e.type !== type) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q);
    });
  }, [exercises, search, type]);

  const totalCount = exercises.length;
  const shownCount = filtered.length;

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Ejercicios propios</h1>
          <p className="mt-1 text-xs text-slate-400">
            {totalCount === 0
              ? 'Aún no tienes ejercicios creados.'
              : `${shownCount} de ${totalCount} mostrados`}
          </p>
        </div>
        <Link
          to="/exercises/new"
          className="bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-md text-sm"
        >
          + Nuevo ejercicio
        </Link>
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
          Ningún ejercicio coincide con los filtros.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{ex.name}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    {ex.sets} juegos · {labelType(ex.type)} ·{' '}
                    {ex.durationPerSetSec ? `${ex.durationPerSetSec}s` : ''}{' '}
                    {ex.repsPerSet ? `${ex.repsPerSet} reps` : ''}
                    {ex.restSec ? ` · descanso ${ex.restSec}s` : ''}
                  </div>
                  {ex.notes && (
                    <div className="text-sm text-slate-500 mt-2">
                      {ex.notes}
                    </div>
                  )}
                </div>
                <TypeBadge type={ex.type} />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => navigate(`/sessions/run/${ex.id}`)}
                  className="bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-md text-sm"
                >
                  Entrenar
                </button>
                <button
                  onClick={() => navigate(`/exercises/${ex.id}/edit`)}
                  className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(ex.id)}
                  className="bg-slate-800 hover:bg-red-900 px-3 py-1.5 rounded-md text-sm text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

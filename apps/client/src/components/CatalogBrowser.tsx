import { useEffect, useState } from 'react';
import { catalogApi } from '../api';
import { CatalogExercise } from '../api/types';

interface Props {
  onImported: () => void;
}

export function CatalogBrowser({ onImported }: Props) {
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    catalogApi
      .list({ category: selectedCategory || undefined, search: search || undefined })
      .then(setExercises)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    catalogApi.categories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [selectedCategory]);

  function handleSearch() {
    load();
  }

  async function handleImport(id: string) {
    setImportingId(id);
    try {
      await catalogApi.import(id);
      onImported();
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar ejercicios..."
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <button
          onClick={handleSearch}
          className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm"
        >
          Buscar
        </button>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Cargando catálogo...</div>
      ) : exercises.length === 0 ? (
        <div className="text-slate-500 text-sm">Sin resultados.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {ex.sets} juegos · {labelType(ex.type)}
                  {ex.durationPerSetSec ? ` · ${ex.durationPerSetSec}s` : ''}
                  {ex.repsPerSet ? ` · ${ex.repsPerSet} reps` : ''}
                  {ex.restSec ? ` · desc ${ex.restSec}s` : ''}
                </div>
                {ex.category && (
                  <span className="inline-block mt-1 text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    {ex.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleImport(ex.id)}
                disabled={importingId === ex.id}
                className="shrink-0 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs px-3 py-1.5 rounded-md"
              >
                {importingId === ex.id ? '...' : '+ Agregar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelType(t: string) {
  if (t === 'TIME') return 'tiempo';
  if (t === 'REPS') return 'reps';
  return 'mixto';
}

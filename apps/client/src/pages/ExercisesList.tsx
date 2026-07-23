import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exercisesApi } from '../api';
import { Exercise } from '../api/types';

export function ExercisesList() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ejercicios</h1>
        <Link
          to="/exercises/new"
          className="bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-md text-sm"
        >
          + Nuevo
        </Link>
      </div>

      {exercises.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          Aún no tienes ejercicios.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="font-medium">{ex.name}</div>
              <div className="text-sm text-slate-400 mt-1">
                {ex.sets} juegos · {labelType(ex.type)} ·{' '}
                {ex.durationPerSetSec ? `${ex.durationPerSetSec}s` : ''}{' '}
                {ex.repsPerSet ? `${ex.repsPerSet} reps` : ''}
                {ex.restSec ? ` · descanso ${ex.restSec}s` : ''}
              </div>
              {ex.notes && (
                <div className="text-sm text-slate-500 mt-2">{ex.notes}</div>
              )}
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

function labelType(t: string) {
  if (t === 'TIME') return 'por tiempo';
  if (t === 'REPS') return 'por repeticiones';
  return 'mixto';
}

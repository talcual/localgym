import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exercisesApi } from '../api';
import { ExerciseType } from '../api/types';

export function ExerciseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('TIME');
  const [sets, setSets] = useState(3);
  const [durationPerSetSec, setDurationPerSetSec] = useState(60);
  const [repsPerSet, setRepsPerSet] = useState(10);
  const [restSec, setRestSec] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    exercisesApi
      .get(id)
      .then((ex) => {
        setName(ex.name);
        setType(ex.type);
        setSets(ex.sets);
        setDurationPerSetSec(ex.durationPerSetSec ?? 60);
        setRepsPerSet(ex.repsPerSet ?? 10);
        setRestSec(ex.restSec ?? 30);
        setNotes(ex.notes ?? '');
      })
      .catch(() => setError('No se pudo cargar el ejercicio'));
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload: any = {
      name,
      type,
      sets,
      restSec,
      notes: notes || undefined,
    };
    if (type === 'TIME' || type === 'MIXED') {
      payload.durationPerSetSec = Number(durationPerSetSec);
    }
    if (type === 'REPS' || type === 'MIXED') {
      payload.repsPerSet = Number(repsPerSet);
    }
    try {
      if (isEdit && id) {
        await exercisesApi.update(id, payload);
      } else {
        await exercisesApi.create(payload);
      }
      navigate('/exercises');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">
        {isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Plancha frontal"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          >
            <option value="TIME">Por tiempo</option>
            <option value="REPS">Por repeticiones</option>
            <option value="MIXED">Mixto (tiempo + reps)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Número de juegos
          </label>
          <input
            type="number"
            min={1}
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          />
        </div>

        {(type === 'TIME' || type === 'MIXED') && (
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Duración por juego (segundos)
            </label>
            <input
              type="number"
              min={1}
              value={durationPerSetSec}
              onChange={(e) => setDurationPerSetSec(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
            />
          </div>
        )}

        {(type === 'REPS' || type === 'MIXED') && (
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Repeticiones por juego
            </label>
            <input
              type="number"
              min={1}
              value={repsPerSet}
              onChange={(e) => setRepsPerSet(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Descanso entre juegos (segundos)
          </label>
          <input
            type="number"
            min={0}
            value={restSec}
            onChange={(e) => setRestSec(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition rounded-lg px-4 py-2 font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

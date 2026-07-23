import { useEffect, useState } from 'react';
import { sessionsApi } from '../api';
import { SessionLog } from '../api/types';
import { formatDuration } from '../utils/time';

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  function load() {
    setLoading(true);
    sessionsApi
      .list({
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
      })
      .then(setSessions)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Historial</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-lg"
          >
            Filtrar
          </button>
          <button
            onClick={() => {
              setFrom('');
              setTo('');
              setTimeout(load, 0);
            }}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
          >
            Limpiar
          </button>
        </div>
        <button
          onClick={() => {
            const today = new Date();
            const monthAgo = new Date();
            monthAgo.setDate(today.getDate() - 30);
            setFrom(toDateInput(monthAgo));
            setTo(toDateInput(today));
            setTimeout(load, 0);
          }}
          className="text-sm text-brand-400 hover:underline ml-auto"
        >
          Últimos 30 días
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Cargando...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          No hay sesiones registradas.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {s.exercise?.name ?? 'Ejercicio'}
                </div>
                <div className="text-sm text-slate-400">
                  {new Date(s.performedAt).toLocaleString()} ·{' '}
                  {s.setsCompleted} juegos
                  {s.totalDurationSec
                    ? ` · ${formatDuration(s.totalDurationSec)}`
                    : ''}
                  {s.totalReps ? ` · ${s.totalReps} reps` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { weightApi, usersApi } from '../api';
import { UserProfile, WeightEntry } from '../api/types';
import { LineChart } from '../components/LineChart';
import { formatDate, computeBmi } from '../utils/time';

export function Weight() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    Promise.all([weightApi.list(), usersApi.me()])
      .then(([w, p]) => {
        setEntries(w);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await weightApi.create({
        weightKg: Number(weight),
        recordedAt: date ? new Date(date).toISOString() : undefined,
        note: note || undefined,
      });
      setWeight('');
      setDate('');
      setNote('');
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return;
    await weightApi.remove(id);
    refresh();
  }

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  const chartData = [...entries]
    .reverse()
    .map((e) => ({
      label: formatDate(e.recordedAt),
      value: e.weightKg,
    }));

  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const delta = latest && previous
    ? Number((latest.weightKg - previous.weightKg).toFixed(2))
    : null;

  const currentBmi = computeBmi(profile?.heightCm, latest?.weightKg);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Peso</h1>
          <p className="text-slate-400 text-sm">
            Lleva el registro de tu peso para ver tu progreso en el tiempo.
          </p>
        </div>
        {!profile?.heightCm && (
          <Link
            to="/profile"
            className="text-sm bg-amber-900/30 border border-amber-800 text-amber-200 px-3 py-2 rounded-md hover:bg-amber-900/50"
          >
            <i className="fa-solid fa-triangle-exclamation mr-1"></i>
            Define tu altura
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Peso actual"
          value={latest ? `${latest.weightKg.toFixed(1)} kg` : '-'}
        />
        <SummaryCard
          label="Cambio"
          value={
            delta == null
              ? '-'
              : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`
          }
          accent={
            delta == null
              ? ''
              : delta < 0
                ? 'text-emerald-400'
                : delta > 0
                  ? 'text-amber-400'
                  : 'text-slate-300'
          }
        />
        <SummaryCard
          label="IMC actual"
          value={currentBmi ? currentBmi.toFixed(1) : '-'}
        />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Tendencia</h2>
        <LineChart
          data={chartData}
          height={200}
          yFormat={(n) => `${n.toFixed(1)} kg`}
        />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Registrar peso</h2>
        <form
          onSubmit={onSubmit}
          className="grid sm:grid-cols-4 gap-3 items-end"
        >
          <div className="sm:col-span-1">
            <label className="block text-sm text-slate-300 mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min={20}
              max={500}
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ej. 72.5"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm text-slate-300 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm text-slate-300 mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ayuno, post-entreno…"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition rounded-lg py-2 font-medium"
          >
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 mt-3">
            {error}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Historial</h2>
        {entries.length === 0 ? (
          <div className="text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            Aún no has registrado pesos.
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{e.weightKg.toFixed(1)} kg</div>
                  <div className="text-sm text-slate-400">
                    {formatDate(e.recordedAt)}
                    {e.note ? ` · ${e.note}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(e.id)}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? ''}`}>
        {value}
      </div>
    </div>
  );
}

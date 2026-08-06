import { FormEvent, useEffect, useMemo, useState } from 'react';
import { measurementsApi } from '../api';
import { BodyMeasurement } from '../api/types';
import { LineChart } from '../components/LineChart';
import { formatDate, toDateInput } from '../utils/time';

interface MetricDef {
  key: keyof BodyMeasurement;
  label: string;
  unit: string;
}

const METRICS: MetricDef[] = [
  { key: 'chestCm', label: 'Pecho', unit: 'cm' },
  { key: 'shouldersCm', label: 'Hombros', unit: 'cm' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'hipsCm', label: 'Caderas', unit: 'cm' },
  { key: 'neckCm', label: 'Cuello', unit: 'cm' },
  { key: 'leftArmCm', label: 'Brazo izquierdo', unit: 'cm' },
  { key: 'rightArmCm', label: 'Brazo derecho', unit: 'cm' },
  { key: 'leftThighCm', label: 'Muslo izquierdo', unit: 'cm' },
  { key: 'rightThighCm', label: 'Muslo derecho', unit: 'cm' },
  { key: 'leftCalfCm', label: 'Pantorrilla izquierda', unit: 'cm' },
  { key: 'rightCalfCm', label: 'Pantorrilla derecha', unit: 'cm' },
  { key: 'bodyFatPct', label: 'Grasa corporal', unit: '%' },
];

export function Measurements() {
  const [items, setItems] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<string>('waistCm');

  function refresh() {
    setLoading(true);
    measurementsApi
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, number | string | null> = {};
    for (const m of METRICS) {
      const raw = values[m.key];
      if (raw && raw.trim() !== '') {
        const n = Number(raw);
        if (isNaN(n)) {
          setError(`Valor inválido para ${m.label}`);
          return;
        }
        payload[m.key] = n;
      }
    }
    if (Object.keys(payload).length === 0) {
      setError('Ingresa al menos una medida');
      return;
    }
    setSaving(true);
    try {
      await measurementsApi.create({
        ...payload,
        recordedAt: date ? new Date(date).toISOString() : undefined,
        note: note || undefined,
      } as any);
      setValues({});
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
    await measurementsApi.remove(id);
    refresh();
  }

  const latest = items[0] ?? null;
  const previous = items[1] ?? null;

  const activeDef = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];

  const chartData = useMemo(() => {
    const reversed = [...items].reverse();
    return reversed
      .filter((it) => (it as any)[activeDef.key] != null)
      .map((it) => ({
        label: formatDate(it.recordedAt),
        value: Number((it as any)[activeDef.key]),
      }));
  }, [items, activeDef.key]);

  const activeDelta =
    latest && previous
      ? Number((latest as any)[activeDef.key]) -
        Number((previous as any)[activeDef.key])
      : null;
  const activeValue = latest ? (latest as any)[activeDef.key] : null;
  const prevActiveValue = previous ? (previous as any)[activeDef.key] : null;

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Medidas corporales</h1>
        <p className="text-slate-400 text-sm">
          Guarda tus medidas base para ver cómo cambian con el tiempo.
        </p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Tendencia</h2>
          <select
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <MiniStat
            label={`${activeDef.label} actual`}
            value={
              activeValue == null ? '-' : `${activeValue} ${activeDef.unit}`
            }
          />
          <MiniStat
            label="Anterior"
            value={
              prevActiveValue == null
                ? '-'
                : `${prevActiveValue} ${activeDef.unit}`
            }
          />
          <MiniStat
            label="Cambio"
            value={
              activeDelta == null || isNaN(activeDelta)
                ? '-'
                : `${activeDelta > 0 ? '+' : ''}${activeDelta.toFixed(1)} ${activeDef.unit}`
            }
            accent={
              activeDelta == null
                ? ''
                : activeDelta < 0
                  ? 'text-emerald-400'
                  : activeDelta > 0
                    ? 'text-amber-400'
                    : 'text-slate-300'
            }
          />
        </div>

        <LineChart
          data={chartData}
          height={200}
          yFormat={(n) => `${n.toFixed(1)} ${activeDef.unit}`}
        />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Registrar medidas</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="mañana, relajado, después de comer…"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {METRICS.map((m) => (
              <div key={m.key}>
                <label className="block text-sm text-slate-300 mb-1">
                  {m.label}{' '}
                  <span className="text-xs text-slate-500">({m.unit})</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={values[m.key] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [m.key]: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="—"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition rounded-lg py-2 px-5 font-medium"
            >
              {saving ? 'Guardando...' : 'Guardar medidas'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Historial</h2>
        {items.length === 0 ? (
          <div className="text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            Aún no has registrado medidas.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{formatDate(m.recordedAt)}</div>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="text-sm text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {METRICS.map((def) => {
                    const v = (m as any)[def.key];
                    if (v == null) return null;
                    return (
                      <span key={def.key}>
                        <span className="text-slate-500">{def.label}:</span>{' '}
                        {v} {def.unit}
                      </span>
                    );
                  })}
                  {m.note && (
                    <span className="text-slate-500 italic">· {m.note}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`text-lg font-semibold mt-1 ${accent ?? ''}`}>{value}</div>
    </div>
  );
}

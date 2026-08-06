import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { progressApi, weightApi, measurementsApi, usersApi } from '../api';
import { BmiInfo, BmiHistoryPoint, BodyMeasurement, ProgressSummary, UserProfile, WeightEntry } from '../api/types';
import { LineChart } from '../components/LineChart';
import { formatDate, formatDateTime } from '../utils/time';

const BMI_RANGES: Array<{ max: number; label: string; color: string; key: BmiInfo['category'] }> = [
  { max: 18.5, label: 'Bajo peso', color: 'bg-sky-500', key: 'UNDERWEIGHT' },
  { max: 25, label: 'Normal', color: 'bg-emerald-500', key: 'NORMAL' },
  { max: 30, label: 'Sobrepeso', color: 'bg-amber-500', key: 'OVERWEIGHT' },
  { max: 35, label: 'Obesidad I', color: 'bg-orange-500', key: 'OBESE_I' },
  { max: 40, label: 'Obesidad II', color: 'bg-red-500', key: 'OBESE_II' },
  { max: Infinity, label: 'Obesidad III', color: 'bg-red-700', key: 'OBESE_III' },
];

function bmiColor(category: BmiInfo['category'] | null): string {
  if (!category) return 'text-slate-400';
  const map: Record<string, string> = {
    UNDERWEIGHT: 'text-sky-400',
    NORMAL: 'text-emerald-400',
    OVERWEIGHT: 'text-amber-400',
    OBESE_I: 'text-orange-400',
    OBESE_II: 'text-red-400',
    OBESE_III: 'text-red-500',
  };
  return map[category] ?? 'text-slate-400';
}

export function Progress() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [history, setHistory] = useState<BmiHistoryPoint[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      progressApi.summary(),
      progressApi.bmiHistory(),
      weightApi.list(),
      measurementsApi.list(),
      usersApi.me(),
    ])
      .then(([s, h, w, m, p]) => {
        setSummary(s);
        setHistory(h);
        setWeights(w);
        setMeasurements(m);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const bmiMarkerPosition = useMemo(() => {
    const bmi = summary?.bmi.bmi;
    if (bmi == null) return null;
    const min = 12;
    const max = 45;
    const pct = Math.max(0, Math.min(100, ((bmi - min) / (max - min)) * 100));
    return pct;
  }, [summary?.bmi.bmi]);

  if (loading) return <div className="text-slate-400">Cargando...</div>;
  if (!summary) return <div className="text-slate-400">Sin datos</div>;

  const bmi = summary.bmi;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Progreso</h1>
        <p className="text-slate-400 text-sm">
          IMC, peso y medidas a lo largo del tiempo.
        </p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Índice de Masa Corporal (IMC)</h2>
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

        <div className="grid sm:grid-cols-2 gap-4 items-center">
          <div className="text-center sm:text-left">
            <div className={`text-5xl font-bold ${bmiColor(bmi.category)}`}>
              {bmi.bmi ?? '-'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {bmi.categoryLabel
                ? `Categoría: ${bmi.categoryLabel}`
                : 'Define tu altura y registra tu peso'}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Fórmula: peso (kg) / altura² (m). Orientativa, no reemplaza consejo médico.
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden">
              {BMI_RANGES.map((r) => (
                <div
                  key={r.key ?? r.label}
                  className={`${r.color} flex-1`}
                  title={r.label}
                />
              ))}
            </div>
            {bmiMarkerPosition != null && (
              <div className="relative h-4">
                <div
                  className="absolute -top-1 w-1 h-6 bg-white"
                  style={{ left: `${bmiMarkerPosition}%` }}
                />
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500">
              <span>12</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>35</span>
              <span>40+</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-slate-400 mt-2">
              {BMI_RANGES.map((r) => (
                <div key={r.key ?? r.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${r.color}`} />
                  {r.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat
          label="Peso actual"
          value={
            summary.latestWeight
              ? `${summary.latestWeight.weightKg.toFixed(1)} kg`
              : '-'
          }
        />
        <Stat
          label="Cambio"
          value={
            summary.weightDelta == null
              ? '-'
              : `${summary.weightDelta > 0 ? '+' : ''}${summary.weightDelta.toFixed(1)} kg`
          }
          accent={
            summary.weightDelta == null
              ? ''
              : summary.weightDelta < 0
                ? 'text-emerald-400'
                : summary.weightDelta > 0
                  ? 'text-amber-400'
                  : ''
          }
        />
        <Stat
          label="Última medida"
          value={
            summary.latestMeasurement
              ? formatDate(summary.latestMeasurement.recordedAt)
              : '-'
          }
        />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Historial de IMC</h2>
          {history.length > 0 && (
            <Link
              to="/weight"
              className="text-sm text-brand-400 hover:underline"
            >
              Registrar peso
            </Link>
          )}
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-slate-400">
            {profile?.heightCm
              ? 'Registra tu peso para ver la curva de IMC.'
              : 'Define tu altura y registra tu peso para empezar.'}
          </div>
        ) : (
          <LineChart
            data={history.map((p) => ({
              label: formatDate(p.recordedAt),
              value: p.bmi,
            }))}
            height={200}
            yFormat={(n) => n.toFixed(1)}
          />
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Peso en el tiempo</h2>
          <Link
            to="/weight"
            className="text-sm text-brand-400 hover:underline"
          >
            Ver todo
          </Link>
        </div>
        {weights.length === 0 ? (
          <div className="text-sm text-slate-400">Sin registros de peso.</div>
        ) : (
          <LineChart
            data={[...weights].reverse().map((w) => ({
              label: formatDate(w.recordedAt),
              value: w.weightKg,
            }))}
            height={200}
            yFormat={(n) => `${n.toFixed(1)} kg`}
          />
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Últimas medidas</h2>
          <Link
            to="/measurements"
            className="text-sm text-brand-400 hover:underline"
          >
            Ver todas
          </Link>
        </div>
        {summary.latestMeasurement ? (
          <MeasurementSummary
            current={summary.latestMeasurement}
            previous={summary.previousMeasurement}
          />
        ) : (
          <div className="text-sm text-slate-400">
            Sin medidas registradas.{' '}
            <Link to="/measurements" className="text-brand-400 hover:underline">
              Agrega tu primera toma
            </Link>
            .
          </div>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Bitácora reciente</h2>
        {weights.length === 0 ? (
          <div className="text-sm text-slate-400">Sin entradas recientes.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {weights.slice(0, 5).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between border-b border-slate-800 last:border-0 py-1"
              >
                <span className="text-slate-400">Peso</span>
                <span className="font-medium">
                  {w.weightKg.toFixed(1)} kg
                </span>
                <span className="text-slate-500">
                  {formatDateTime(w.recordedAt)}
                </span>
              </li>
            ))}
            {measurements.slice(0, 5).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between border-b border-slate-800 last:border-0 py-1"
              >
                <span className="text-slate-400">Medidas</span>
                <span className="font-medium">
                  {m.chestCm ?? m.waistCm ?? m.hipsCm
                    ? 'ver detalle'
                    : 'registradas'}
                </span>
                <span className="text-slate-500">
                  {formatDateTime(m.recordedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
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

const LABEL_MAP: Array<[string, string]> = [
  ['chestCm', 'Pecho'],
  ['waistCm', 'Cintura'],
  ['hipsCm', 'Caderas'],
  ['shouldersCm', 'Hombros'],
  ['neckCm', 'Cuello'],
  ['leftArmCm', 'Brazo izq.'],
  ['rightArmCm', 'Brazo der.'],
  ['leftThighCm', 'Muslo izq.'],
  ['rightThighCm', 'Muslo der.'],
  ['leftCalfCm', 'Pantorrilla izq.'],
  ['rightCalfCm', 'Pantorrilla der.'],
  ['bodyFatPct', 'Grasa'],
];

function MeasurementSummary({
  current,
  previous,
}: {
  current: BodyMeasurement;
  previous: BodyMeasurement | null;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 text-sm">
      {LABEL_MAP.map(([key, label]) => {
        const cur = (current as any)[key];
        if (cur == null) return null;
        const prev = previous ? (previous as any)[key] : null;
        const delta = prev != null ? Number((cur - prev).toFixed(1)) : null;
        const unit = key === 'bodyFatPct' ? '%' : 'cm';
        return (
          <div
            key={key}
            className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
          >
            <span className="text-slate-400">{label}</span>
            <span className="font-medium">
              {cur} {unit}
            </span>
            <span
              className={
                delta == null
                  ? 'text-slate-500'
                  : delta < 0
                    ? 'text-emerald-400'
                    : delta > 0
                      ? 'text-amber-400'
                      : 'text-slate-500'
              }
            >
              {delta == null
                ? '—'
                : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`}
            </span>
          </div>
        );
      })}
      <div className="text-xs text-slate-500 col-span-full mt-1">
        {formatDate(current.recordedAt)}
        {current.note ? ` · ${current.note}` : ''}
      </div>
    </div>
  );
}

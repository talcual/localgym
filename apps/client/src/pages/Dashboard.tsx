import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  exercisesApi,
  sessionsApi,
  statsApi,
  progressApi,
  weightApi,
  usersApi,
} from '../api';
import type {
  BmiCategory,
  Exercise,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
} from '../api/types';
import { BmiBar, bmiCategoryColor } from '../components/BmiBar';
import { formatDuration } from '../utils/time';

export function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      exercisesApi.list(),
      sessionsApi.list(),
      statsApi.summary(),
      progressApi.summary(),
      weightApi.list(),
      usersApi.me(),
    ])
      .then(([exs, allSessions, summary, prog, w, p]) => {
        setExercises(exs);
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        setTodaySessions(
          allSessions.filter(
            (s) => new Date(s.performedAt).toISOString().slice(0, 10) === key,
          ),
        );
        setStats(summary);
        setProgress(prog);
        setWeights(w);
        setProfile(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  const bmi = progress?.bmi.bmi ?? null;
  const bmiCategory = progress?.bmi.category ?? null;

  const totalMinutes = Math.round((stats?.totalDurationSec ?? 0) / 60);
  const weeklyProgress = Math.min(100, (stats?.currentStreakDays ?? 0) * 10);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Hola, {user?.displayName} <span className="text-xl">👋</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Tu actividad reciente de un vistazo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WeightCard
          weightKg={progress?.latestWeight?.weightKg ?? null}
          previousWeightKg={progress?.previousWeight?.weightKg ?? null}
          delta={progress?.weightDelta ?? null}
          history={weights}
        />
        <BmiCard
          bmi={bmi}
          category={bmiCategory}
          categoryLabel={progress?.bmi.categoryLabel ?? null}
          hasHeight={Boolean(profile?.heightCm)}
        />
        <MetricCard
          label="Progreso semanal"
          value={`${weeklyProgress}%`}
          detail={stats?.currentStreakDays ? 'Sigue así!' : 'Empieza hoy'}
          icon="⌁"
          accent="violet"
          progress={weeklyProgress}
        />
        <MetricCard
          label="Entrenamientos"
          value={String(stats?.totalSessions ?? 0)}
          detail="Total registrado"
          icon="↔"
          accent="blue"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <SummaryCard
            sessions={todaySessions}
            totalMinutes={totalMinutes}
            totalReps={stats?.totalReps ?? 0}
            completed={todaySessions.length}
          />
          <BodyMetricsCard progress={progress} />
        </div>
        <AiFitnessCard profile={profile} progress={progress} stats={stats} />
      </div>
    </div>
  );
}

function AiFitnessCard({
  profile,
  progress,
  stats,
}: {
  profile: UserProfile | null;
  progress: ProgressSummary | null;
  stats: SummaryStats | null;
}) {
  const [goal, setGoal] = useState<FitnessGoal>('strength');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [days, setDays] = useState<number>(4);
  const [status, setStatus] = useState<AiStatus>('idle');

  const canGenerate = status !== 'loading';

  const age = useMemo(() => {
    if (!profile?.birthdate) return null;
    const b = new Date(profile.birthdate);
    const diff = Date.now() - b.getTime();
    if (Number.isNaN(diff)) return null;
    return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
  }, [profile?.birthdate]);

  const inputSummary = [
    profile?.heightCm != null ? `${Math.round(profile.heightCm)} cm` : null,
    profile?.sex ? labelSex(profile.sex) : null,
    age != null ? `${age} años` : null,
    progress?.latestWeight?.weightKg != null
      ? `${progress.latestWeight.weightKg.toFixed(1)} kg`
      : null,
  ].filter(Boolean);

  const demoPlan = useMemo(
    () => buildDemoPlan({ goal, level, days }),
    [goal, level, days],
  );

  function handleGenerate() {
    setStatus('loading');
    window.setTimeout(() => setStatus('ready'), 1400);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <h2 className="font-semibold">Recomendado fitness</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Genera un plan personalizado con IA a partir de tus métricas.
          </p>
          {inputSummary.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-500">
              Usaremos: {inputSummary.join(' · ')}
            </p>
          )}
        </div>
        {status === 'ready' && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            Demo: pendiente Ollama
          </span>
        )}
      </div>

      {status !== 'ready' ? (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          <FieldSelect
            label="Objetivo"
            value={goal}
            onChange={(v) => setGoal(v as FitnessGoal)}
            options={[
              ['strength', 'Fuerza'],
              ['hypertrophy', 'Hipertrofia'],
              ['fat_loss', 'Pérdida de grasa'],
              ['endurance', 'Resistencia'],
            ]}
          />
          <FieldSelect
            label="Nivel"
            value={level}
            onChange={(v) => setLevel(v as FitnessLevel)}
            options={[
              ['beginner', 'Principiante'],
              ['intermediate', 'Intermedio'],
              ['advanced', 'Avanzado'],
            ]}
          />
          <FieldSelect
            label="Días por semana"
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            options={[
              ['3', '3 días'],
              ['4', '4 días'],
              ['5', '5 días'],
              ['6', '6 días'],
            ]}
          />
          <div className="mt-auto flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-600/60"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {status === 'loading' ? 'Generando plan…' : 'Generar plan con IA'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {demoPlan.title}
            </div>
            <ul className="mt-2 space-y-2">
              {demoPlan.days.map((day) => (
                <li key={day.label} className="text-xs">
                  <div className="font-medium text-slate-200">{day.label}</div>
                  <div className="text-slate-400">{day.items.join(' · ')}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
            >
              Editar selección
            </button>
            <button
              type="button"
              onClick={() => undefined}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white"
            >
              Crear como rutina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-800 bg-[#091121] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

type FitnessGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance';
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
type AiStatus = 'idle' | 'loading' | 'ready';

function labelSex(sex: UserProfile['sex']) {
  switch (sex) {
    case 'MALE':
      return 'Hombre';
    case 'FEMALE':
      return 'Mujer';
    case 'OTHER':
      return 'Otro';
    default:
      return '';
  }
}

function buildDemoPlan({
  goal,
  level,
  days,
}: {
  goal: FitnessGoal;
  level: FitnessLevel;
  days: number;
}) {
  const goalLabel = {
    strength: 'Fuerza',
    hypertrophy: 'Hipertrofia',
    fat_loss: 'Pérdida de grasa',
    endurance: 'Resistencia',
  }[goal];
  const levelLabel = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  }[level];
  const baseDays = {
    3: ['Tren superior', 'Tren inferior', 'Cuerpo completo'],
    4: ['Tren superior', 'Tren inferior', 'Empuje', 'Tirón'],
    5: ['Empuje', 'Tirón', 'Pierna', 'Deficit calórico', 'Movilidad'],
    6: ['Empuje', 'Tirón', 'Pierna', 'Upper ligero', 'Lower ligero', 'Core'],
  } as const;
  const labels = baseDays[days as 3 | 4 | 5 | 6] ?? baseDays[4];
  const repsByGoal: Record<FitnessGoal, string> = {
    strength: '5 x 5 al 80%',
    hypertrophy: '4 x 10 al 70%',
    fat_loss: '3 x 15 al 60%',
    endurance: '3 x 20 al 50%',
  };
  return {
    title: `Plan ${levelLabel} · ${goalLabel} · ${days} días`,
    days: labels.map((label) => ({
      label,
      items: [
        repsByGoal[goal],
        'Descanso entre series 60s',
        'Calentamiento 5–8 min',
      ],
    })),
  };
}


function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent: 'violet' | 'blue';
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-sm text-slate-200">{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${accent === 'violet' ? 'text-violet-400' : 'text-slate-100'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
      {progress != null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}

function SummaryCard({ sessions, totalMinutes, totalReps, completed }: { sessions: SessionLog[]; totalMinutes: number; totalReps: number; completed: number }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Resumen de hoy</h2><Link to="/sessions" className="text-xs text-violet-400 hover:text-violet-300">Ver historial</Link></div>
      <div className="mt-6 grid grid-cols-4 divide-x divide-slate-800">
        <SummaryValue icon="◷" value={String(totalMinutes)} label="minutos" />
        <SummaryValue icon="♨" value={String(totalReps)} label="repeticiones" />
        <SummaryValue icon="◉" value={String(sessions.length)} label="ejercicios" />
        <SummaryValue icon="✓" value={completed ? '100%' : '0%'} label="completado" />
      </div>
    </div>
  );
}

function SummaryValue({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <div className="px-2 text-center first:pl-0 last:pr-0"><div className="text-lg text-violet-400">{icon}</div><div className="mt-1 text-xl font-semibold">{value}</div><div className="mt-1 text-[10px] text-slate-400">{label}</div></div>;
}

function BodyMetricsCard({ progress }: { progress: ProgressSummary | null }) {
  const measurement = progress?.latestMeasurement;
  const rows = [
    ['Peso', progress?.latestWeight?.weightKg != null ? `${progress.latestWeight.weightKg.toFixed(1)} kg` : 'Sin historial'],
    ['IMC', progress?.bmi.bmi != null ? progress.bmi.bmi.toFixed(1) : 'Sin datos'],
    ['Grasa corporal', measurement?.bodyFatPct != null ? `${measurement.bodyFatPct.toFixed(1)}%` : 'Sin datos'],
    ['Cintura', measurement?.waistCm != null ? `${measurement.waistCm.toFixed(1)} cm` : 'Sin datos'],
  ];
  return <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Body Metrics</h2><Link to="/progress" className="text-xs text-violet-400 hover:text-violet-300">Ver historial</Link></div><div className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-200">{value}</span></div>)}</div></div>;
}

function WeightCard({
  weightKg,
  previousWeightKg,
  delta,
  history,
}: {
  weightKg: number | null;
  previousWeightKg: number | null;
  delta: number | null;
  history: WeightEntry[];
}) {
  const deltaColor =
    delta == null
      ? 'text-slate-400'
      : delta < 0
        ? 'text-emerald-400'
        : delta > 0
          ? 'text-amber-400'
          : 'text-slate-300';

  const sparkline = [...history].reverse().slice(-30).map((w) => w.weightKg);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Peso
        </div>
        <Link to="/weight" className="text-xs text-brand-400 hover:underline">
          Ver
        </Link>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-semibold">
          {weightKg != null ? `${weightKg.toFixed(1)} kg` : '—'}
        </div>
        <div className={`text-sm ${deltaColor}`}>
          {delta == null
            ? previousWeightKg == null
              ? 'Sin historial'
              : ''
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`}
        </div>
      </div>
      <div className="h-10 mt-2">
        <WeightSparkline values={sparkline} />
      </div>
    </div>
  );
}

function BmiCard({
  bmi,
  category,
  categoryLabel,
  hasHeight,
}: {
  bmi: number | null;
  category: BmiCategory | null;
  categoryLabel: string | null;
  hasHeight: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          IMC
        </div>
        <Link to="/progress" className="text-xs text-brand-400 hover:underline">
          Ver
        </Link>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className={`text-3xl font-semibold ${bmiCategoryColor(category)}`}>
          {bmi != null ? bmi.toFixed(1) : '—'}
        </div>
        <div className="text-sm text-slate-400">
          {categoryLabel ??
            (hasHeight ? 'Registra tu peso' : 'Define tu altura')}
        </div>
      </div>
      <div className="mt-2">
        <BmiBar bmi={bmi} category={category} compact />
      </div>
    </div>
  );
}

function WeightSparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div className="h-full flex items-center text-xs text-slate-500">
        Registra tu peso para ver la curva.
      </div>
    );
  }
  if (values.length === 1) {
    return (
      <div className="h-full flex items-center text-xs text-slate-500">
        Una sola medición. Registra más para ver la tendencia.
      </div>
    );
  }
  const w = 240;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <path
        d={points}
        fill="none"
        className="stroke-brand-400"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

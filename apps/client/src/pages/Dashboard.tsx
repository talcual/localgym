import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
          {exercises.length === 0
            ? 'Crea tu primera rutina para empezar.'
            : 'Elige una rutina para empezar tu sesión de hoy.'}
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

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tu rutina de hoy</h2>
          <Link
            to="/exercises/new"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            + Nueva rutina
          </Link>
        </div>

        {exercises.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            Aún no tienes ninguna rutina.{' '}
            <Link to="/exercises/new" className="text-brand-400 hover:underline">
              Crea el primero
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {exercises.map((ex, index) => (
              <Link
                key={ex.id}
                to={`/sessions/run/${ex.id}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0d1526] p-3 transition hover:border-violet-500/60 hover:bg-[#111b31]"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${routineColors[index % routineColors.length]}`}>
                  {routineIcons[index % routineIcons.length]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium group-hover:text-white">{ex.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {ex.sets} juegos ·{' '}
                    {ex.type === 'TIME' || ex.type === 'MIXED'
                      ? `${ex.durationPerSetSec ?? 0}s`
                      : `${ex.repsPerSet ?? 0} reps`}
                    {ex.restSec ? ` · Descanso ${ex.restSec}s` : ''}
                  </div>
                </div>
                <span className="px-1 text-lg text-slate-500">⋮</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <SummaryCard
          sessions={todaySessions}
          totalMinutes={totalMinutes}
          totalReps={stats?.totalReps ?? 0}
          completed={todaySessions.length}
        />
        <BodyMetricsCard progress={progress} />
      </div>
    </div>
  );
}

const routineIcons = ['♜', '◖', '✣', '◒', '♜', '◈'];
const routineColors = [
  'bg-violet-500/20 text-violet-400',
  'bg-rose-500/20 text-rose-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-orange-500/20 text-orange-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-sky-500/20 text-sky-400',
];

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

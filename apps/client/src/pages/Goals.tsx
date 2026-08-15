import { useEffect, useMemo, useState } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import {
  progressApi,
  statsApi,
  weightApi,
  sessionsApi,
  routinesApi,
} from '../api';
import type {
  BodyMeasurement,
  BmiHistoryPoint,
  ProgressSummary,
  RoutineWithItems,
  SessionLog,
  SummaryStats,
  WeightEntry,
} from '../api';
import { routineGoalLabel } from '../api/routines';

type GoalKind = 'weight' | 'bmi' | 'streak' | 'sessions' | 'minutes';

interface LocalGoal {
  id: string;
  kind: GoalKind;
  title: string;
  target: number;
  unit: string;
  /** Para 'weight'/'bmi', si target < current = bajar, si target > current = subir. */
  direction?: 'up' | 'down' | 'none';
  createdAt: string;
}

const STORAGE_KEY = 'modofit_goals_v1';

export function Goals() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement | null>(
    null,
  );
  const [bmiHistory, setBmiHistory] = useState<BmiHistoryPoint[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [activeRoutine, setActiveRoutine] =
    useState<RoutineWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  // Objetivos del usuario (persistidos en localStorage; no requieren backend).
  const [goals, setGoals] = useState<LocalGoal[]>(() => loadGoals());
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      progressApi.summary().catch(() => null),
      statsApi.summary().catch(() => null),
      weightApi.list().catch(() => []),
      progressApi.bmiHistory().catch(() => []),
      sessionsApi.list().catch(() => []),
      routinesApi.active().catch(() => null),
    ]).then(
      ([p, s, w, bmi, sess, active]) => {
        setProgress(p);
        setStats(s);
        setWeights(w);
        setBmiHistory(bmi);
        setSessions(sess);
        setActiveRoutine(active);
        // Tomamos la última medición si la expone ProgressSummary.
        setMeasurements(p?.latestMeasurement ?? null);
      },
    )
    .finally(() => setLoading(false));
  }, []);

  // Persistir objetivos cada vez que cambien.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      /* noop */
    }
  }, [goals]);

  const computedKpis = useMemo(
    () => ({
      currentWeightKg: progress?.latestWeight?.weightKg ?? null,
      currentBmi: progress?.bmi.bmi ?? null,
      currentStreak: stats?.currentStreakDays ?? 0,
      totalSessions: stats?.totalSessions ?? 0,
      totalMinutes: Math.round((stats?.totalDurationSec ?? 0) / 60),
    }),
    [progress, stats],
  );

  const suggested = useMemo(
    () => buildSuggestedGoals(computedKpis, activeRoutine),
    [computedKpis, activeRoutine],
  );

  function addGoal(g: Omit<LocalGoal, 'id' | 'createdAt'>) {
    setGoals((prev) => [
      ...prev,
      {
        ...g,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function updateGoalProgress(id: string, current: number) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              // Sólo guardamos el último current como "última actualización"
              title: g.title,
            }
          : g,
      ),
    );
    // Para mantenerlo simple, el current se calcula en cada render via progressFor.
    void current;
  }

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Objetivos
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Fija metas realistas y sigue tu progreso con datos reales.
        </p>
      </div>

      {/* KPIs actuales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Peso"
          value={
            computedKpis.currentWeightKg != null
              ? `${computedKpis.currentWeightKg.toFixed(1)} kg`
              : '—'
          }
          hint={
            weights.length > 1
              ? `vs ${weights[1]?.weightKg.toFixed(1)} kg inicial`
              : 'Sin historial'
          }
        />
        <KpiCard
          label="IMC"
          value={
            computedKpis.currentBmi != null
              ? computedKpis.currentBmi.toFixed(1)
              : '—'
          }
          hint={progress?.bmi.categoryLabel ?? 'Sin datos'}
        />
        <KpiCard
          label="Racha"
          value={`${computedKpis.currentStreak} días`}
          hint={
            stats?.bestStreakDays
              ? `Mejor: ${stats.bestStreakDays}`
              : 'Sin registros'
          }
        />
        <KpiCard
          label="Sesiones"
          value={String(computedKpis.totalSessions)}
          hint={`${computedKpis.totalMinutes} min totales`}
        />
      </div>

      {/* Sugeridos */}
      {suggested.length > 0 && (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" aria-hidden />
            <h2 className="text-base font-semibold">Sugeridos</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            En base a tu progreso actual. Agrégalos con un clic.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {suggested.map((s) => (
              <button
                key={s.kind}
                type="button"
                onClick={() =>
                  addGoal({
                    kind: s.kind,
                    title: s.title,
                    target: s.target,
                    unit: s.unit,
                    direction: s.direction,
                  })
                }
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-left hover:border-violet-500"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    {s.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Meta: {s.target} {s.unit}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-violet-400" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de objetivos */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" aria-hidden />
            <h2 className="text-base font-semibold">Mis objetivos</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nuevo
          </button>
        </div>

        {showForm && (
          <NewGoalForm
            onCancel={() => setShowForm(false)}
            onSubmit={(g) => {
              addGoal(g);
              setShowForm(false);
            }}
          />
        )}

        {goals.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">
            Aún no tienes objetivos. Prueba agregando uno sugerido o crea uno
            propio.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {goals.map((g) => {
              const progressFor = computeProgress(g, {
                progress,
                stats,
                weights,
                measurements,
                bmiHistory,
                sessions,
              });
              return (
                <li
                  key={g.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100">
                        {g.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Meta: {g.target} {g.unit} · Actual:{' '}
                        <span className="text-slate-200">
                          {progressFor.current.toFixed(1)} {g.unit}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGoal(g.id)}
                      title="Eliminar"
                      className="inline-flex items-center justify-center rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={
                        'h-full rounded-full ' +
                        (progressFor.done
                          ? 'bg-emerald-500'
                          : 'bg-violet-500')
                      }
                      style={{ width: `${Math.min(100, progressFor.pct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[11px] text-slate-400">
                    {progressFor.pct.toFixed(0)}%
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function NewGoalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (g: Omit<LocalGoal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<GoalKind>('weight');
  const [target, setTarget] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  const presets: Record<GoalKind, { unit: string; direction?: 'up' | 'down' | 'none'; defaultTitle: string }> = {
    weight: { unit: 'kg', direction: 'none', defaultTitle: 'Llegar a un peso objetivo' },
    bmi: { unit: '', direction: 'none', defaultTitle: 'Alcanzar un IMC objetivo' },
    streak: { unit: 'días', direction: 'up', defaultTitle: 'Mantener una racha' },
    sessions: { unit: 'sesiones', direction: 'up', defaultTitle: 'Acumular sesiones' },
    minutes: { unit: 'min', direction: 'up', defaultTitle: 'Acumular minutos entrenados' },
  };

  function handleSubmit() {
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) return;
    const preset = presets[kind];
    onSubmit({
      kind,
      title: title.trim() || preset.defaultTitle,
      target: n,
      unit: preset.unit,
      direction: preset.direction,
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
            Tipo
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as GoalKind)}
            className="w-full rounded-md border border-slate-800 bg-[#091121] px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-500"
          >
            <option value="weight">Peso (kg)</option>
            <option value="bmi">IMC</option>
            <option value="streak">Racha (días)</option>
            <option value="sessions">Sesiones totales</option>
            <option value="minutes">Minutos totales</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
            Meta
          </span>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-[#091121] px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-500"
            placeholder={presets[kind].unit ? `ej. 75 ${presets[kind].unit}` : 'ej. 22'}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
            Título (opcional)
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-[#091121] px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-500"
            placeholder={presets[kind].defaultTitle}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-500"
        >
          Agregar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-rose-500 hover:text-rose-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers de progreso
// ──────────────────────────────────────────────────────────────────────

interface ProgressCtx {
  progress: ProgressSummary | null;
  stats: SummaryStats | null;
  weights: WeightEntry[];
  measurements: BodyMeasurement | null;
  bmiHistory: BmiHistoryPoint[];
  sessions: SessionLog[];
}

function computeProgress(
  goal: LocalGoal,
  ctx: ProgressCtx,
): { current: number; pct: number; done: boolean } {
  let current = 0;
  switch (goal.kind) {
    case 'weight':
      current = ctx.progress?.latestWeight?.weightKg ?? 0;
      break;
    case 'bmi':
      current = ctx.progress?.bmi.bmi ?? 0;
      break;
    case 'streak':
      current = ctx.stats?.currentStreakDays ?? 0;
      break;
    case 'sessions':
      current = ctx.stats?.totalSessions ?? 0;
      break;
    case 'minutes':
      current = Math.round((ctx.stats?.totalDurationSec ?? 0) / 60);
      break;
  }
  if (goal.target <= 0) {
    return { current, pct: 0, done: false };
  }
  // Para peso/IMC, dirección importa: si target < current, "bajar" cuenta.
  let pct = (current / goal.target) * 100;
  let done = pct >= 100;
  if (
    (goal.kind === 'weight' || goal.kind === 'bmi') &&
    goal.direction === 'down' &&
    current > 0
  ) {
    // Si el usuario quiere bajar y todavía no llegó, mostramos progreso
    // como "distancia recorrida" usando el primer peso registrado.
    const initial =
      ctx.weights.length > 0
        ? ctx.weights[ctx.weights.length - 1].weightKg
        : current;
    if (initial > goal.target) {
      pct = Math.max(
        0,
        Math.min(100, ((initial - current) / (initial - goal.target)) * 100),
      );
      done = current <= goal.target;
    }
  }
  return { current, pct: Math.max(0, Math.min(100, pct)), done };
}

function loadGoals(): LocalGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g) => isLocalGoal(g));
  } catch {
    return [];
  }
}

function isLocalGoal(g: any): g is LocalGoal {
  return (
    g &&
    typeof g.id === 'string' &&
    typeof g.title === 'string' &&
    typeof g.target === 'number' &&
    typeof g.unit === 'string' &&
    ['weight', 'bmi', 'streak', 'sessions', 'minutes'].includes(g.kind)
  );
}

function buildSuggestedGoals(
  kpis: {
    currentWeightKg: number | null;
    currentBmi: number | null;
    currentStreak: number;
    totalSessions: number;
    totalMinutes: number;
  },
  activeRoutine: RoutineWithItems | null,
): Array<{
  kind: GoalKind;
  title: string;
  target: number;
  unit: string;
  direction?: 'up' | 'down' | 'none';
}> {
  const out: Array<{
    kind: GoalKind;
    title: string;
    target: number;
    unit: string;
    direction?: 'up' | 'down' | 'none';
  }> = [];

  if (kpis.currentStreak < 7) {
    out.push({
      kind: 'streak',
      title: 'Llegar a 7 días de racha',
      target: 7,
      unit: 'días',
      direction: 'up',
    });
  } else if (kpis.currentStreak < 30) {
    out.push({
      kind: 'streak',
      title: 'Llegar a 30 días de racha',
      target: 30,
      unit: 'días',
      direction: 'up',
    });
  }

  if (kpis.totalSessions < 20) {
    out.push({
      kind: 'sessions',
      title: 'Completar 20 sesiones',
      target: 20,
      unit: 'sesiones',
      direction: 'up',
    });
  } else if (kpis.totalSessions < 50) {
    out.push({
      kind: 'sessions',
      title: 'Llegar a 50 sesiones',
      target: 50,
      unit: 'sesiones',
      direction: 'up',
    });
  }

  if (kpis.totalMinutes < 600) {
    out.push({
      kind: 'minutes',
      title: 'Acumular 600 min de entrenamiento',
      target: 600,
      unit: 'min',
      direction: 'up',
    });
  } else if (kpis.totalMinutes < 1500) {
    out.push({
      kind: 'minutes',
      title: 'Acumular 1500 min',
      target: 1500,
      unit: 'min',
      direction: 'up',
    });
  }

  if (kpis.currentBmi != null && kpis.currentBmi >= 25) {
    out.push({
      kind: 'bmi',
      title: 'Bajar el IMC por debajo de 25',
      target: 24.9,
      unit: '',
      direction: 'down',
    });
  }

  if (activeRoutine) {
    const goalLabel = routineGoalLabel(activeRoutine.goal);
    out.push({
      kind: 'sessions',
      title: `Cumplir 1 semana de "${goalLabel}" (${activeRoutine.daysPerWeek} sesiones)`,
      target: activeRoutine.daysPerWeek,
      unit: 'sesiones',
      direction: 'up',
    });
  }

  return out.slice(0, 4);
}

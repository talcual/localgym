import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  catalogApi,
  exercisesApi,
  measurementsApi,
  sessionsApi,
  statsApi,
  progressApi,
  weightApi,
  usersApi,
  routinesApi,
} from '../api';
import type {
  BodyMeasurement,
  BmiCategory,
  CatalogExercise,
  Exercise,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
} from '../api/types';
import type { RoutineWithItems, CreateRoutineInput } from '../api';
import { BmiBar, bmiCategoryColor } from '../components/BmiBar';
import { formatDuration } from '../utils/time';
import { useOllamaStream, ollamaStructuredJson } from '../api/ollama';
import {
  groupRoutineItemsByDay,
  routineGoalLabel,
  routineLevelLabel,
} from '../api/routines';

export function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [measurement, setMeasurement] = useState<BodyMeasurement | null>(null);
  const [todaySessions, setTodaySessions] = useState<SessionLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [routines, setRoutines] = useState<RoutineWithItems[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRoutines = useCallback(async () => {
    try {
      const [list, active] = await Promise.all([
        routinesApi.list(),
        routinesApi.active(),
      ]);
      setRoutines(list);
      setActiveRoutineId(active?.id ?? null);
    } catch {
      // Silencioso: si falla la carga de rutinas seguimos mostrando el resto.
    }
  }, []);

  useEffect(() => {
    Promise.all([
      exercisesApi.list(),
      sessionsApi.list(),
      statsApi.summary(),
      progressApi.summary(),
      weightApi.list(),
      usersApi.me(),
      catalogApi.list(),
      measurementsApi.latest(),
      routinesApi.list().catch(() => [] as RoutineWithItems[]),
      routinesApi.active().catch(() => null as RoutineWithItems | null),
    ])
      .then(
        ([
          exs,
          allSessions,
          summary,
          prog,
          w,
          p,
          cat,
          meas,
          routs,
          active,
        ]) => {
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
          setCatalog(cat);
          setMeasurement(meas);
          setRoutines(routs);
          setActiveRoutineId(active?.id ?? null);
        },
      )
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
          <AiFitnessCard
            profile={profile}
            progress={progress}
            stats={stats}
            catalog={catalog}
            userExercises={exercises}
            measurement={measurement}
            onRoutineSaved={refreshRoutines}
          />
      </div>

      <RoutinesListCard
        routines={routines}
        activeRoutineId={activeRoutineId}
        onChanged={refreshRoutines}
      />
    </div>
  );
}

function AiFitnessCard({
  profile,
  progress,
  stats,
  catalog,
  userExercises,
  measurement,
  onRoutineSaved,
}: {
  profile: UserProfile | null;
  progress: ProgressSummary | null;
  stats: SummaryStats | null;
  catalog: CatalogExercise[];
  userExercises: Exercise[];
  measurement: BodyMeasurement | null;
  onRoutineSaved?: () => void | Promise<void>;
}) {
  const [goal, setGoal] = useState<FitnessGoal>('strength');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [days, setDays] = useState<number>(4);
  const [status, setStatus] = useState<AiStatus>('idle');
  const [request, setRequest] = useState<ReturnType<typeof buildAiPrompt> | null>(null);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [savedRoutineId, setSavedRoutineId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canGenerate = status !== 'streaming';

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

  const catalogById = useMemo(() => {
    const m = new Map<string, CatalogExercise>();
    for (const c of catalog) m.set(c.id, c);
    return m;
  }, [catalog]);

  const { text: planText, streaming, error, abort } = useOllamaStream({
    request,
    onComplete: () => setStatus('ready'),
  });

  // Mientras streamea, status=streaming. Cuando termina, status=ready.
  useEffect(() => {
    if (streaming) setStatus('streaming');
  }, [streaming]);

  // Al cambiar de selección (goal/level/days) resetamos flags de guardado.
  useEffect(() => {
    setSavedRoutineId(null);
    setSaveError(null);
  }, [goal, level, days]);

  function handleGenerate() {
    setStatus('streaming');
    setRequest(
      buildAiPrompt({
        profile,
        progress,
        stats,
        catalog,
        userExercises,
        measurement,
        goal,
        level,
        days,
      }),
    );
  }

  function handleStop() {
    abort();
    if (planText.length > 0) setStatus('ready');
    else setStatus('idle');
  }

  function handleReset() {
    abort();
    setRequest(null);
    setStatus('idle');
    setSavedRoutineId(null);
    setSaveError(null);
  }

  async function handleSaveRoutine() {
    if (!request || savingRoutine) return;
    setSavingRoutine(true);
    setSaveError(null);
    try {
      // 1) Pedimos la versión estructurada al backend (que llama a Ollama
      //    en modo format:json con el mismo system+prompt).
      const raw = await ollamaStructuredJson({
        system: request.system,
        prompt: request.messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join('\n'),
        schemaHint: ROUTINE_JSON_SCHEMA,
      });
      const parsed = parseRoutineStructured(raw, days);
      if (!parsed) {
        throw new Error('La IA no devolvió un plan estructurado válido.');
      }

      // 2) Aseguramos que los ejercicios referenciados existan como
      //    `exercises` del usuario. Para los que vienen del catálogo,
      //    los importamos.
      const exerciseIdByCatalog = new Map<string, string>();
      const missingCatalog = new Set<string>();
      for (const it of parsed.items) {
        if (!it.catalogId) continue;
        const existing = userExercises.find(
          (e) =>
            e.name.trim().toLowerCase() ===
            (catalogById.get(it.catalogId!)?.name ?? '').trim().toLowerCase(),
        );
        if (existing) {
          exerciseIdByCatalog.set(it.catalogId!, existing.id);
        } else {
          missingCatalog.add(it.catalogId!);
        }
      }

      // Importamos los que faltan del catálogo (paralelo).
      const importResults = await Promise.all(
        Array.from(missingCatalog).map(async (cid) => {
          try {
            const imported = await catalogApi.import(cid);
            return { cid, exercise: imported };
          } catch {
            return { cid, exercise: null };
          }
        }),
      );
      for (const r of importResults) {
        if (r.exercise) exerciseIdByCatalog.set(r.cid, r.exercise.id);
      }

      // 3) Construimos el payload final y lo enviamos.
      const itemsPayload = parsed.items.map((it) => ({
        dayIndex: it.dayIndex,
        dayLabel: it.dayLabel,
        exerciseId: it.exerciseId ?? it.catalogId ? exerciseIdByCatalog.get(it.catalogId ?? '') ?? undefined : undefined,
        catalogId: it.catalogId,
        sets: it.sets,
        reps: it.reps,
        durationPerSetSec: it.durationPerSetSec,
        restSec: it.restSec,
        notes: it.notes,
      }));

      const createInput: CreateRoutineInput = {
        title: parsed.title,
        goal,
        level,
        daysPerWeek: days,
        summary: parsed.summary ?? planText.slice(0, 500),
        items: itemsPayload.filter((it) => it.catalogId || it.exerciseId),
      };
      const saved = await routinesApi.create(createInput);
      setSavedRoutineId(saved.id);
      await onRoutineSaved?.();
    } catch (err) {
      setSaveError((err as Error).message || 'No se pudo guardar la rutina.');
    } finally {
      setSavingRoutine(false);
    }
  }

  async function handleActivateRoutine() {
    if (!savedRoutineId) return;
    try {
      await routinesApi.activate(savedRoutineId);
      await onRoutineSaved?.();
    } catch (err) {
      setSaveError((err as Error).message || 'No se pudo activar la rutina.');
    }
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
        {status === 'streaming' && (
          <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            Ollama streameando
          </span>
        )}
        {status === 'ready' && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Plan listo
          </span>
        )}
        {error && (
          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
            Error
          </span>
        )}
      </div>

      {status === 'idle' || status === 'streaming' ? (
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
            {status === 'streaming' ? (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium shadow-lg shadow-rose-950/30 transition hover:bg-rose-500"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Detener
              </button>
            ) : (
              <button
                type="button"
                disabled={!canGenerate}
                onClick={handleGenerate}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-600/60"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Generar plan con IA
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          {error ? (
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
              <div className="font-medium">No se pudo generar el plan</div>
              <div className="mt-1 text-rose-300/80">{error}</div>
              <p className="mt-2 text-[11px] text-rose-300/60">
                Verificá que Ollama esté corriendo en
                {' '}<code className="font-mono">OLLAMA_BASE_URL</code>.
              </p>
            </div>
          ) : (
            <div className="min-h-[140px] flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-200">
                {planText || 'Esperando respuesta…'}
                {streaming && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-violet-400 align-middle" />
                )}
              </pre>
            </div>
          )}
          <div className="mt-auto flex items-center gap-2 pt-3">
            {savedRoutineId ? (
              <button
                type="button"
                onClick={handleActivateRoutine}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Activar esta rutina
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveRoutine}
                disabled={savingRoutine || !planText}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-600/60"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {savingRoutine ? 'Guardando…' : 'Guardar como rutina'}
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(planText)}
              disabled={!planText}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copiar
            </button>
          </div>
          {saveError && (
            <p className="mt-2 text-[11px] text-rose-300">{saveError}</p>
          )}
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
type AiStatus = 'idle' | 'streaming' | 'ready';

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

/**
 * Esquema mínimo que se envía como `format` a Ollama para forzar JSON.
 * Coincide con la forma que luego validamos en `parseRoutineStructured`.
 */
const ROUTINE_JSON_SCHEMA = {
  type: 'object',
  required: ['title', 'days', 'items'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    days: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        required: ['dayIndex', 'dayLabel', 'items'],
        properties: {
          dayIndex: { type: 'integer', minimum: 0, maximum: 5 },
          dayLabel: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                catalogId: { type: 'string' },
                exerciseId: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'integer' },
                durationPerSetSec: { type: 'integer' },
                restSec: { type: 'integer' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
    },
    items: {
      type: 'array',
      description:
        'Lista plana de todos los items (mismos objetos que dentro de days.items). Útil si el modelo prefiere aplanar.',
      items: {
        type: 'object',
        required: ['dayIndex', 'dayLabel', 'name'],
        properties: {
          dayIndex: { type: 'integer' },
          dayLabel: { type: 'string' },
          name: { type: 'string' },
          catalogId: { type: 'string' },
          exerciseId: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'integer' },
          durationPerSetSec: { type: 'integer' },
          restSec: { type: 'integer' },
          notes: { type: 'string' },
        },
      },
    },
  },
} as const;

interface ParsedRoutineItem {
  dayIndex: number;
  dayLabel: string;
  catalogId?: string;
  exerciseId?: string;
  name: string;
  sets?: number;
  reps?: number;
  durationPerSetSec?: number;
  restSec?: number;
  notes?: string;
}

interface ParsedRoutine {
  title: string;
  summary?: string;
  items: ParsedRoutineItem[];
}

/**
 * Convierte el JSON libre del modelo en una estructura normalizada.
 * Acepta dos formas:
 *   A) { title, days: [{ dayIndex, dayLabel, items: [...] }] }
 *   B) { title, items: [{ dayIndex, dayLabel, ... }] }
 * Si el modelo no devolvió `days`, lo infiere de `items` truncando a N días.
 */
function parseRoutineStructured(
  raw: unknown,
  requestedDays: number,
): ParsedRoutine | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const summary = typeof obj.summary === 'string' ? obj.summary : undefined;

  const flat: ParsedRoutineItem[] = [];
  if (Array.isArray(obj.days)) {
    for (const d of obj.days) {
      if (!d || typeof d !== 'object') continue;
      const dayIndex = Number(d.dayIndex);
      const dayLabel = String(d.dayLabel ?? `Día ${dayIndex + 1}`);
      if (Array.isArray(d.items)) {
        for (const it of d.items) {
          const item = normalizeItem(it, dayIndex, dayLabel);
          if (item) flat.push(item);
        }
      }
    }
  }
  if (flat.length === 0 && Array.isArray(obj.items)) {
    for (const it of obj.items) {
      const di = Number(it?.dayIndex);
      const dl = String(it?.dayLabel ?? `Día ${di + 1}`);
      const item = normalizeItem(it, Number.isFinite(di) ? di : 0, dl);
      if (item) flat.push(item);
    }
  }

  if (!title || flat.length === 0) return null;

  // Si pidió N días, recortamos el resultado a N días distintos.
  const days = new Set<number>();
  for (const it of flat) {
    days.add(it.dayIndex);
    if (days.size >= requestedDays) break;
  }
  const kept = flat.filter((it) => days.has(it.dayIndex));

  return { title, summary, items: kept };
}

function normalizeItem(
  it: any,
  fallbackDayIndex: number,
  fallbackDayLabel: string,
): ParsedRoutineItem | null {
  if (!it || typeof it !== 'object') return null;
  const name = typeof it.name === 'string' ? it.name.trim() : '';
  if (!name) return null;
  const di = Number(it.dayIndex);
  const dl = String(it.dayLabel ?? fallbackDayLabel);
  return {
    dayIndex: Number.isFinite(di) ? di : fallbackDayIndex,
    dayLabel: dl || fallbackDayLabel,
    name,
    catalogId: typeof it.catalogId === 'string' ? it.catalogId : undefined,
    exerciseId: typeof it.exerciseId === 'string' ? it.exerciseId : undefined,
    sets: numOrUndef(it.sets),
    reps: numOrUndef(it.reps),
    durationPerSetSec: numOrUndef(it.durationPerSetSec),
    restSec: numOrUndef(it.restSec),
    notes: typeof it.notes === 'string' ? it.notes : undefined,
  };
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Construye el prompt estructurado que enviaremos a Ollama.
 *
 * Secciones (en orden):
 *   1) System: rol + restricciones de formato/longitud.
 *   2) User:   perfil · métricas corporales · catálogo disponible ·
 *              ejercicios del usuario · selección del usuario.
 *
 * El catálogo se inyecta con nombre + tipo + sets/reps/duración + categoría
 * para que el modelo pueda elegir ejercicios REALES del sistema y no inventar.
 */
function buildAiPrompt(args: {
  profile: UserProfile | null;
  progress: ProgressSummary | null;
  stats: SummaryStats | null;
  catalog: CatalogExercise[];
  userExercises: Exercise[];
  measurement: BodyMeasurement | null;
  goal: FitnessGoal;
  level: FitnessLevel;
  days: number;
}): { model?: string; system: string; messages: Array<{ role: 'system' | 'user'; content: string }> } {
  const { profile, progress, stats, catalog, userExercises, measurement, goal, level, days } = args;

  const goalLabel = {
    strength: 'fuerza',
    hypertrophy: 'hipertrofia',
    fat_loss: 'pérdida de grasa',
    endurance: 'resistencia',
  }[goal];

  const levelLabel = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  }[level];

  // ── Sección 1: Perfil ────────────────────────────────────────────────
  const perfil: string[] = [];
  if (profile?.heightCm != null) perfil.push(`Altura: ${Math.round(profile.heightCm)} cm`);
  if (profile?.sex) perfil.push(`Sexo: ${labelSex(profile.sex)}`);
  if (profile?.birthdate) {
    const b = new Date(profile.birthdate);
    const age = Math.max(0, Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000)));
    if (!Number.isNaN(age)) perfil.push(`Edad: ${age} años`);
  }
  if (progress?.latestWeight?.weightKg != null)
    perfil.push(`Peso actual: ${progress.latestWeight.weightKg.toFixed(1)} kg`);
  if (stats?.totalSessions != null)
    perfil.push(`Sesiones registradas (total): ${stats.totalSessions}`);
  if (stats?.currentStreakDays != null)
    perfil.push(`Racha actual: ${stats.currentStreakDays} días`);

  // ── Sección 2: Body metrics ──────────────────────────────────────────
  const metricas: string[] = [];
  const m = measurement;
  const metricPairs: Array<[string, number | null | undefined]> = [
    ['Pecho', m?.chestCm],
    ['Cintura', m?.waistCm],
    ['Cadera', m?.hipsCm],
    ['Hombros', m?.shouldersCm],
    ['Cuello', m?.neckCm],
    ['Brazo izquierdo', m?.leftArmCm],
    ['Brazo derecho', m?.rightArmCm],
    ['Muslo izquierdo', m?.leftThighCm],
    ['Muslo derecho', m?.rightThighCm],
    ['Pantorrilla izquierda', m?.leftCalfCm],
    ['Pantorrilla derecha', m?.rightCalfCm],
    ['% grasa corporal', m?.bodyFatPct],
  ];
  for (const [label, val] of metricPairs) {
    if (val == null) continue;
    const unit = label.includes('grasa') ? '%' : ' cm';
    const formatted = label.includes('grasa')
      ? val.toFixed(1)
      : val.toFixed(1);
    metricas.push(`${label}: ${formatted}${unit}`);
  }
  if (progress?.bmi.bmi != null) {
    metricas.push(
      `IMC: ${progress.bmi.bmi.toFixed(1)} (${progress.bmi.categoryLabel ?? ''})`.trim(),
    );
  }

  // ── Sección 3: Catálogo disponible ───────────────────────────────────
  // Formato compacto, una línea por ejercicio. Sin truncar nombres
  // duplicados (dejamos que el modelo vea el universo completo).
  const catalogo = (catalog ?? [])
    .slice(0, 200) // tope defensivo por si el catálogo crece
    .map((c) => {
      const parts = [`- ${c.name}`];
      parts.push(`(${c.category ?? 'general'})`);
      parts.push(`tipo ${c.type}`);
      if (c.repsPerSet != null) parts.push(`${c.sets}x${c.repsPerSet}`);
      else if (c.durationPerSetSec != null)
        parts.push(`${c.sets}x${c.durationPerSetSec}s`);
      else parts.push(`${c.sets} series`);
      if (c.restSec != null) parts.push(`descanso ${c.restSec}s`);
      return parts.join(' ');
    });

  // ── Sección 4: Ejercicios ya creados por el usuario ─────────────────
  const userExLines = (userExercises ?? []).map((e) => {
    const parts = [`- ${e.name}`, `tipo ${e.type}`];
    if (e.repsPerSet != null) parts.push(`${e.sets}x${e.repsPerSet}`);
    else if (e.durationPerSetSec != null)
      parts.push(`${e.sets}x${e.durationPerSetSec}s`);
    else parts.push(`${e.sets} series`);
    return parts.join(' ');
  });

  // ── System prompt (rol + restricciones) ──────────────────────────────
  const system =
    `Sos un coach de fitness. Respondé SIEMPRE en español rioplatense, en texto plano (sin markdown, sin JSON, sin tablas, sin emojis). Sé conciso: máximo ~250 palabras. ` +
    `Usá SOLO ejercicios que aparezcan listados en la sección "Catálogo disponible" del mensaje del usuario. ` +
    `Si un ejercicio está también en "Ejercicios del usuario", podés sugerirlo igual. ` +
    `No inventes nombres de ejercicios. Si el catálogo no tiene lo que necesitás, indicá brevemente "ejercicio alternativo" en su lugar.`;

  // ── User prompt (secciones estructuradas) ────────────────────────────
  const sections: string[] = [];
  sections.push(`# Selección del usuario`);
  sections.push(`- Objetivo: ${goalLabel}`);
  sections.push(`- Nivel: ${levelLabel}`);
  sections.push(`- Días por semana: ${days}`);

  if (perfil.length > 0) {
    sections.push('');
    sections.push(`# Perfil`);
    perfil.forEach((l) => sections.push(`- ${l}`));
  }

  if (metricas.length > 0) {
    sections.push('');
    sections.push(`# Métricas corporales`);
    metricas.forEach((l) => sections.push(`- ${l}`));
  } else {
    sections.push('');
    sections.push(`# Métricas corporales`);
    sections.push(`- (sin datos cargados)`);
  }

  if (catalogo.length > 0) {
    sections.push('');
    sections.push(`# Catálogo disponible (usar solo estos ejercicios)`);
    catalogo.forEach((l) => sections.push(l));
  }

  if (userExLines.length > 0) {
    sections.push('');
    sections.push(`# Ejercicios del usuario (ya los tiene)`);
    userExLines.forEach((l) => sections.push(l));
  }

  sections.push('');
  sections.push(`# Formato de respuesta (texto plano)`);
  sections.push(`1) Una sola línea con el título del plan (ej: "Plan X · Y · Z días").`);
  sections.push(`2) Por cada día, una línea con el nombre del día y debajo una lista corta separada por " · " con: nombre del ejercicio principal (del catálogo), series x reps o segundos, descanso, y nota breve.`);
  sections.push(`3) Una línea final con un único consejo práctico para esta semana.`);

  const user = sections.join('\n');

  return {
    system,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
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
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Resumen de hoy</h2><Link to="/sessions" className="text-sm text-violet-400 hover:text-violet-300">Ver historial</Link></div>
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
  return (
    <div className="px-2 text-center first:pl-0 last:pr-0">
      <div className="text-2xl text-violet-400">{icon}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function BodyMetricsCard({ progress }: { progress: ProgressSummary | null }) {
  const measurement = progress?.latestMeasurement;
  const rows = [
    ['Peso', progress?.latestWeight?.weightKg != null ? `${progress.latestWeight.weightKg.toFixed(1)} kg` : 'Sin historial'],
    ['IMC', progress?.bmi.bmi != null ? progress.bmi.bmi.toFixed(1) : 'Sin datos'],
    ['Grasa corporal', measurement?.bodyFatPct != null ? `${measurement.bodyFatPct.toFixed(1)}%` : 'Sin datos'],
    ['Cintura', measurement?.waistCm != null ? `${measurement.waistCm.toFixed(1)} cm` : 'Sin datos'],
  ];
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Body Metrics</h2>
        <Link to="/progress" className="text-sm text-violet-400 hover:text-violet-300">Ver historial</Link>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{label}</span>
            <span className="font-medium text-slate-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
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


function RoutinesListCard({
  routines,
  activeRoutineId,
  onChanged,
}: {
  routines: RoutineWithItems[];
  activeRoutineId: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function activate(id: string) {
    setBusyId(id);
    try {
      await routinesApi.activate(id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate() {
    setBusyId('__deactivate');
    try {
      await routinesApi.deactivate();
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Borrar esta rutina? No se puede deshacer.')) return;
    setBusyId(id);
    try {
      await routinesApi.remove(id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (routines.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="font-semibold">Mis rutinas</h2>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Aún no tenés rutinas guardadas. Generá una con IA desde la tarjeta
          de "Recomendado fitness" para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="font-semibold">Mis rutinas</h2>
        </div>
        <span className="text-xs text-slate-500">{routines.length} guardadas</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {routines.map((r) => {
          const days = groupRoutineItemsByDay(r.items);
          const isActive = r.id === activeRoutineId;
          return (
            <div
              key={r.id}
              className={
                'flex flex-col rounded-lg border bg-slate-900/40 p-3 ' +
                (isActive
                  ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'border-slate-800')
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {routineGoalLabel(r.goal)} · {routineLevelLabel(r.level)} · {r.daysPerWeek} días
                  </div>
                </div>
                {isActive ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Activa
                  </span>
                ) : null}
              </div>

              <ul className="mt-2 space-y-1.5 text-xs">
                {days.slice(0, r.daysPerWeek).map((d) => (
                  <li key={d.dayIndex} className="text-slate-300">
                    <span className="font-medium">{d.dayLabel}:</span>{' '}
                    <span className="text-slate-400">
                      {d.items.length} ejercicio{d.items.length === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 pt-3">
                {isActive ? (
                  <button
                    type="button"
                    onClick={deactivate}
                    disabled={busyId !== null}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500 hover:text-amber-200 disabled:opacity-50"
                  >
                    {busyId === '__deactivate' ? 'Desactivando…' : 'Desactivar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => activate(r.id)}
                    disabled={busyId !== null}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:opacity-50"
                  >
                    {busyId === r.id ? 'Activando…' : 'Activar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={busyId !== null}
                  title="Borrar rutina"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

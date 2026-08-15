import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { statsApi, routinesApi } from '../api';
import type { DailyCount, RoutineWithItems } from '../api';
import { groupRoutineItemsByDay } from '../api/routines';

interface CalendarDay {
  date: Date;
  iso: string; // YYYY-MM-DD
  inMonth: boolean;
  sessions: number;
  durationSec: number;
  routineDayIndex: number | null;
}

export function Calendar() {
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [byDay, setByDay] = useState<Map<string, DailyCount>>(
    new Map(),
  );
  const [activeRoutine, setActiveRoutine] =
    useState<RoutineWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      statsApi.byDay(120).catch(() => [] as DailyCount[]),
      routinesApi.active().catch(() => null),
    ]).then(([days, active]) => {
      const m = new Map<string, DailyCount>();
      for (const d of days) m.set(d.date, d);
      setByDay(m);
      setActiveRoutine(active);
    })
    .finally(() => setLoading(false));
  }, []);

  const grid = useMemo<CalendarDay[]>(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // lunes=0
    const start = new Date(year, month, 1 - offset);
    const days: CalendarDay[] = [];
    // 6 filas × 7 = 42 celdas
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoDate(d);
      const c = byDay.get(iso);
      days.push({
        date: d,
        iso,
        inMonth: d.getMonth() === month,
        sessions: c?.sessions ?? 0,
        durationSec: c?.durationSec ?? 0,
        routineDayIndex: routineDayIndexFor(d, activeRoutine),
      });
    }
    return days;
  }, [cursor, byDay, activeRoutine]);

  const monthLabel = cursor.toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDay = selected
    ? grid.find((g) => g.iso === selected)
    : grid.find(
        (g) => g.iso === isoDate(new Date()),
      );

  // Stats del mes actual
  const monthStats = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    let sessions = 0;
    let durationSec = 0;
    let activeDays = 0;
    for (const d of grid) {
      if (!d.inMonth) continue;
      sessions += d.sessions;
      durationSec += d.durationSec;
      if (d.sessions > 0) activeDays++;
    }
    return { sessions, durationSec, activeDays, month, year };
  }, [grid, cursor]);

  if (loading) {
    return <div className="text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Calendario
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Tu actividad reciente y los días sugeridos por la rutina activa.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(cursor, setCursor, -1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 hover:border-violet-500"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="text-center">
            <div className="text-base font-semibold capitalize">
              {monthLabel}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {monthStats.sessions} sesiones · {monthStats.activeDays} días activos ·{' '}
              {Math.round(monthStats.durationSec / 60)} min
            </div>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(cursor, setCursor, 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 hover:border-violet-500"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((d) => (
            <DayCell
              key={d.iso}
              day={d}
              isSelected={d.iso === (selected ?? isoDate(new Date()))}
              onSelect={() => setSelected(d.iso)}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <Legend color="bg-violet-500/40 ring-violet-500/60" label="Día sugerido por la rutina activa" />
          <Legend color="bg-emerald-500" label="Sesión registrada" />
          <Legend color="bg-emerald-700" label="Sesiones múltiples" />
        </div>
      </div>

      {selectedDay && (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
          <div className="text-sm font-medium">
            {selectedDay.date.toLocaleDateString('es', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Sesiones" value={String(selectedDay.sessions)} />
            <MiniStat
              label="Duración"
              value={`${Math.round(selectedDay.durationSec / 60)} min`}
            />
            <MiniStat
              label="Rutina"
              value={
                selectedDay.routineDayIndex == null
                  ? 'Sin sugerencia'
                  : `Día ${selectedDay.routineDayIndex + 1}`
              }
            />
            <MiniStat
              label="Estado"
              value={
                selectedDay.sessions > 0
                  ? 'Cumplido'
                  : selectedDay.routineDayIndex != null
                    ? 'Pendiente'
                    : 'Libre'
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DayCell({
  day,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const intensity =
    day.sessions === 0 ? 0 : day.sessions === 1 ? 1 : day.sessions <= 3 ? 2 : 3;
  const intensityClass = [
    'bg-slate-900',
    'bg-emerald-500',
    'bg-emerald-600',
    'bg-emerald-700',
  ][intensity];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'relative flex h-14 flex-col items-center justify-center rounded-md border text-xs transition ' +
        (day.inMonth ? 'text-slate-200' : 'text-slate-600') +
        (isSelected
          ? ' border-violet-500 ring-1 ring-violet-500/40'
          : ' border-slate-800 hover:border-violet-500/60') +
        (intensity > 0 ? ' ' : '')
      }
    >
      {intensity > 0 && (
        <span
          className={'absolute inset-0 rounded-md opacity-25 ' + intensityClass}
        />
      )}
      {day.routineDayIndex != null && day.inMonth && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-violet-500/30" />
      )}
      <span className="relative font-medium">{day.date.getDate()}</span>
      {day.sessions > 0 && (
        <span className="relative text-[9px] text-slate-100/80">
          {day.sessions}
        </span>
      )}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={'inline-block h-2.5 w-2.5 rounded-full ' + color} />
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftMonth(
  cursor: Date,
  setCursor: (d: Date) => void,
  delta: number,
): void {
  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
}

/**
 * Devuelve el índice de día (0..daysPerWeek-1) que corresponde a la fecha,
 * siguiendo un patrón "semana inicia en lunes" y rotando por la cantidad
 * de días de la rutina activa. Si no hay rutina, devuelve null.
 */
function routineDayIndexFor(
  d: Date,
  routine: RoutineWithItems | null,
): number | null {
  if (!routine) return null;
  const days = groupRoutineItemsByDay(routine.items);
  if (days.length === 0) return null;
  // Lunes = 0 ... Domingo = 6
  const dow = (d.getDay() + 6) % 7;
  // Si la rutina tiene menos días que 7, sólo marcamos dow < daysPerWeek.
  if (dow >= routine.daysPerWeek) return null;
  // Mapear al dayIndex real de la rutina.
  return days.find((x) => x.dayIndex === dow)?.dayIndex ?? dow;
}

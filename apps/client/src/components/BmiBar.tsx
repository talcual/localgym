import { BmiCategory } from '../api/types';

interface BmiRange {
  max: number;
  label: string;
  color: string;
  key: BmiCategory | null;
}

export const BMI_RANGES: BmiRange[] = [
  { max: 18.5, label: 'Bajo peso', color: 'bg-sky-500', key: 'UNDERWEIGHT' },
  { max: 25, label: 'Normal', color: 'bg-emerald-500', key: 'NORMAL' },
  { max: 30, label: 'Sobrepeso', color: 'bg-amber-500', key: 'OVERWEIGHT' },
  { max: 35, label: 'Obesidad I', color: 'bg-orange-500', key: 'OBESE_I' },
  { max: 40, label: 'Obesidad II', color: 'bg-red-500', key: 'OBESE_II' },
  { max: Infinity, label: 'Obesidad III', color: 'bg-red-700', key: 'OBESE_III' },
];

export function bmiCategoryColor(category: BmiCategory | null): string {
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

export function bmiMarkerPercent(bmi: number | null): number | null {
  if (bmi == null) return null;
  const min = 12;
  const max = 45;
  return Math.max(0, Math.min(100, ((bmi - min) / (max - min)) * 100));
}

interface BmiBarProps {
  bmi: number | null;
  category: BmiCategory | null;
  compact?: boolean;
}

export function BmiBar({ bmi, category, compact = false }: BmiBarProps) {
  const pct = bmiMarkerPercent(bmi);
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden">
        {BMI_RANGES.map((r) => (
          <div
            key={r.key ?? r.label}
            className={`${r.color} flex-1`}
            title={r.label}
          />
        ))}
      </div>
      {pct != null && (
        <div className="relative h-3 mt-0.5">
          <div
            className="absolute -top-0.5 w-0.5 h-4 bg-white shadow"
            style={{ left: `${pct}%` }}
          />
        </div>
      )}
      {!compact && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>12</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40+</span>
        </div>
      )}
    </div>
  );
}

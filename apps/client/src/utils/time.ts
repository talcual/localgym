import { formatInUserZone, isoDateInUserZone } from './timezone';

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return formatInUserZone(iso, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return formatInUserZone(iso, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  // Importante: usar la zona del usuario para que el día mostrado
  // corresponda al día civil del usuario (no al día UTC).
  return isoDateInUserZone(iso);
}

export function computeBmi(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
): number | null {
  if (!heightCm || !weightKg) return null;
  const h = heightCm / 100;
  return Number((weightKg / (h * h)).toFixed(2));
}

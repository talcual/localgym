/**
 * Zona horaria del usuario.
 *
 * Por defecto la app usa UTC-5 (Colombia, Ecuador, Perú, etc.).
 * Se puede sobreescribir con `localStorage.setItem('user.timezone', 'America/Mexico_City')`
 * desde el perfil del usuario en el futuro.
 *
 * Las llamadas a `toLocaleDateString` / `toLocaleString` en el cliente
 * deberían usar `formatInUserZone(...)` / `formatDateTimeInUserZone(...)`
 * para que la fecha mostrada corresponda al día "civil" del usuario.
 */

export const DEFAULT_TIMEZONE = 'Etc/GMT+5'; // UTC-5, sin DST.

const STORAGE_KEY = 'user.timezone';

/**
 * Devuelve la zona horaria configurada por el usuario,
 * o el default (UTC-5) si no está configurada o el valor es inválido.
 */
export function getUserTimeZone(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.trim().length > 0 && isValidTimeZone(raw.trim())) {
      return raw.trim();
    }
  } catch {
    // localStorage no disponible (SSR, modo privado, etc.).
  }
  return DEFAULT_TIMEZONE;
}

/** Persiste la zona horaria del usuario. */
export function setUserTimeZone(tz: string): void {
  try {
    if (isValidTimeZone(tz)) {
      localStorage.setItem(STORAGE_KEY, tz);
    }
  } catch {
    // ignore
  }
}

/** Comprueba que el identificador sea realmente una zona horaria IANA válida. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Formatea una fecha (Date o ISO string) según la zona del usuario.
 *
 * @param value Date o string ISO (UTC) a formatear.
 * @param opts opciones de Intl.DateTimeFormat.
 */
export function formatInUserZone(
  value: Date | string | number | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (value == null) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es', {
    timeZone: getUserTimeZone(),
    ...opts,
  });
}

/**
 * Devuelve la fecha en formato `YYYY-MM-DD` pero interpretada
 * en la zona horaria del usuario (no en UTC).
 *
 * Esto es importante para el calendario, el historial y los inputs `type=date`,
 * donde el usuario espera ver/editar el día según su hora local.
 */
export function isoDateInUserZone(
  value: Date | string | number | null | undefined,
): string {
  if (value == null) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  // Formateamos con la zona del usuario y reconstruimos YYYY-MM-DD
  // a partir de las partes localizadas, evitando el desplazamiento UTC.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getUserTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

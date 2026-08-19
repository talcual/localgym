import { FormEvent, useEffect, useState } from 'react';
import { usersApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Sex, UserProfile } from '../api/types';
import { computeBmi, toDateInput, formatDate } from '../utils/time';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
];

export function Profile() {
  const { setUser: setAuthUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [birthdate, setBirthdate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .me()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
        setHeightCm(p.heightCm ? String(p.heightCm) : '');
        setSex(p.sex ?? '');
        setBirthdate(toDateInput(p.birthdate));
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: Partial<UserProfile> = {
        displayName,
        heightCm: heightCm ? Number(heightCm) : null,
        sex: sex === '' ? null : (sex as Sex),
        birthdate: birthdate ? new Date(birthdate).toISOString() : null,
      };
      const updated = await usersApi.update(payload);
      setProfile(updated);
      if (setAuthUser) setAuthUser({ id: updated.id, email: updated.email, displayName: updated.displayName });
      setSuccess('Perfil actualizado');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-slate-400">Cargando...</div>;
  if (!profile) return <div className="text-slate-400">Sin datos</div>;

  const age = profile.birthdate
    ? Math.floor(
        (Date.now() - new Date(profile.birthdate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-slate-400 text-sm">
          Datos básicos para calcular tu IMC y llevar tu progreso.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre</label>
          <input
            type="text"
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Altura (cm)
            </label>
            <input
              type="number"
              min={50}
              max={260}
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ej. 175"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Sexo</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | '')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Sin especificar</option>
              {SEX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {age != null && (
            <p className="text-xs text-slate-500 mt-1">{age} años</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition rounded-lg py-2 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400">
        <div>
          <span className="text-slate-300">Email:</span> {profile.email}
        </div>
        <div>
          <span className="text-slate-300">Miembro desde:</span>{' '}
          {formatDate(profile.createdAt)}
        </div>
        {profile.heightCm && (
          <div className="mt-2">
            <span className="text-slate-300">Altura registrada:</span>{' '}
            {profile.heightCm} cm
            <span className="ml-3 text-xs text-slate-500">
              IMC base (70 kg): {computeBmi(profile.heightCm, 70) ?? '-'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

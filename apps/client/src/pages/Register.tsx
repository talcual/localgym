import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Register({ onSwitch }: { onSwitch?: () => void }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate('/app');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium mb-1">Crear cuenta</h2>
      <p className="text-sm text-slate-400 mb-6">
        Empieza a registrar tus entrenamientos
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
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
        <div>
          <label className="block text-sm text-slate-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 transition rounded-lg py-2 font-medium"
        >
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>
      {onSwitch && (
        <p className="text-sm text-slate-400 mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-brand-400 hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      )}
    </div>
  );
}

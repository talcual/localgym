import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { instructorsApi } from '../api';
import { useAuth } from '../auth/AuthContext';

export function AcceptInvitation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/accept-invitation?' + params.toString())}`);
      return;
    }
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setError('Falta el token de invitación.');
      return;
    }
    setStatus('busy');
    instructorsApi
      .acceptInvitation(token)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setStatus('error');
        setError((err as Error).message || 'No se pudo aceptar la invitación');
      });
  }, [params, user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0d1526] p-6 text-center">
        {status === 'busy' && <p className="text-slate-400">Aceptando invitación...</p>}
        {status === 'ok' && (
          <>
            <h1 className="text-2xl font-semibold">¡Listo!</h1>
            <p className="mt-2 text-sm text-slate-400">
              Ya puedes entrenar con las rutinas de tu instructor.
            </p>
            <button
              onClick={() => navigate('/routines')}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500"
            >
              Ver mis rutinas
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold text-rose-300">No se pudo aceptar</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => navigate('/app')}
              className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
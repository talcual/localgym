import { useEffect, useState } from 'react';
import { Copy, Send } from 'lucide-react';
import { instructorsApi } from '../../api';
import type { InstructorInvitation, InviteResult } from '../../api/types';

export function Invitations() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<InstructorInvitation[]>([]);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const list = await instructorsApi.listInvitations();
    setPending(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const inv = await instructorsApi.invite(email.trim(), 'EMAIL');
      setLastInvite(inv);
      setEmail('');
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'No se pudo enviar la invitación');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Invitaciones
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Invita a tus clientes por email. Comparte el link o el token cuando
          el cliente aún no tenga cuenta.
        </p>
      </div>

      <form
        onSubmit={send}
        className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-[#0d1526] p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Email del cliente
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="cliente@ejemplo.com"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Invitar
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {lastInvite && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4">
          <div className="text-sm font-medium text-emerald-200">
            Invitación enviada a {lastInvite.clientEmail}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-200">
              {lastInvite.inviteUrl}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(lastInvite.inviteUrl)}
              className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs hover:border-violet-500"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Comparte este link al cliente. Caduca el{' '}
            {new Date(lastInvite.expiresAt).toLocaleDateString('es')}.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
          Invitaciones pendientes
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">Sin invitaciones pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3"
              >
                <div>
                  <div className="font-medium">{inv.clientEmail}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(inv.expiresAt).toLocaleDateString('es')} · {inv.kind}
                  </div>
                </div>
                <code className="hidden rounded bg-slate-900 px-2 py-1 text-xs text-slate-300 sm:block">
                  {inv.token.slice(0, 12)}…
                </code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
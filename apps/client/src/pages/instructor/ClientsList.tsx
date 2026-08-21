import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageSquare, X } from 'lucide-react';
import { instructorsApi } from '../../api';
import type { InstructorClient } from '../../api/types';

export function ClientsList() {
  const [clients, setClients] = useState<InstructorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await instructorsApi.listClients();
      setClients(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function revoke(clientId: string) {
    if (!confirm('¿Revocar la relación con este cliente?')) return;
    setBusyId(clientId);
    try {
      await instructorsApi.revokeClient(clientId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const active = clients.filter((c) => c.status === 'ACTIVE');
  const others = clients.filter((c) => c.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Mis clientes
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Accede al detalle de cada cliente para ver su progreso, asignar
          rutinas y conversar.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400">Cargando...</div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-8 text-center text-slate-400">
          <p>Aún no tienes clientes.</p>
          <p className="mt-1 text-xs">
            Invita a uno desde{' '}
            <Link to="/instructor/invitations" className="text-violet-300 underline">
              Invitaciones
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-300">
                Activos
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((c) => (
                  <ClientRow
                    key={c.id}
                    client={c}
                    busy={busyId === c.id}
                    onRevoke={() => revoke(c.clientId)}
                  />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Historial
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {others.map((c) => (
                  <ClientRow key={c.id} client={c} busy={false} onRevoke={() => undefined} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ClientRow({
  client,
  busy,
  onRevoke,
}: {
  client: InstructorClient;
  busy: boolean;
  onRevoke: () => void;
}) {
  const isActive = client.status === 'ACTIVE';
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ' +
              (isActive
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-slate-700/40 text-slate-400')
            }
          >
            {client.status}
          </span>
          <span className="text-xs text-slate-500">
            desde {new Date(client.createdAt).toLocaleDateString('es')}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-medium text-slate-200">
          Cliente #{client.clientId.slice(0, 8)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isActive && (
          <>
            <Link
              to={`/instructor/clients/${client.clientId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs hover:border-violet-500 hover:text-white"
            >
              Ver <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={onRevoke}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-rose-300 hover:border-rose-500 disabled:opacity-50"
              title="Revocar relación"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {isActive && (
          <Link
            to={`/instructor/messages?to=${client.clientId}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs hover:border-violet-500 hover:text-white"
            title="Mensaje"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
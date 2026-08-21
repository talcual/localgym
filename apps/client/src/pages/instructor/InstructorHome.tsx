import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Inbox, UserPlus, Dumbbell } from 'lucide-react';
import {
  instructorsApi,
  assignmentsApi,
  messagesApi,
} from '../../api';
import type { InstructorClient, MessageThread } from '../../api/types';

export function InstructorHome() {
  const [clients, setClients] = useState<InstructorClient[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, t, invites] = await Promise.all([
          instructorsApi.listClients(),
          messagesApi.threads(),
          instructorsApi.listInvitations(),
        ]);
        setClients(c);
        setThreads(t);
        setPendingInvites(invites.length);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Panel de instructor
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Gestiona tus clientes, asigna rutinas y mantente en contacto.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400">Cargando...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Briefcase className="h-5 w-5" aria-hidden />}
            label="Clientes activos"
            value={activeClients.length}
            accent="violet"
            to="/instructor/clients"
          />
          <StatCard
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            label="Invitaciones pendientes"
            value={pendingInvites}
            accent="indigo"
            to="/instructor/invitations"
          />
          <StatCard
            icon={<Inbox className="h-5 w-5" aria-hidden />}
            label="Conversaciones"
            value={threads.length}
            accent="emerald"
            to="/instructor/messages"
          />
          <StatCard
            icon={<Dumbbell className="h-5 w-5" aria-hidden />}
            label="Rutinas escritas"
            value={0}
            accent="amber"
            to="/instructor/routines"
          />
        </div>
      )}

      <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-6">
        <h2 className="text-lg font-semibold">Cómo empezar</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-300">
          <li>
            <strong className="text-white">1.</strong> Invita a tus clientes
            desde <Link to="/instructor/invitations" className="text-violet-300 underline">Invitaciones</Link>.
          </li>
          <li>
            <strong className="text-white">2.</strong> Cuando acepten, aparecerán
            en <Link to="/instructor/clients" className="text-violet-300 underline">Clientes</Link>.
          </li>
          <li>
            <strong className="text-white">3.</strong> Crea rutinas desde{' '}
            <Link to="/instructor/routines" className="text-violet-300 underline">Rutinas</Link>{' '}
            y asígnalas con una ventana de fechas.
          </li>
          <li>
            <strong className="text-white">4.</strong> Conversa con tus clientes
            desde <Link to="/instructor/messages" className="text-violet-300 underline">Mensajes</Link>.
          </li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: 'violet' | 'indigo' | 'emerald' | 'amber';
  to: string;
}) {
  const map = {
    violet: 'bg-violet-500/15 text-violet-300',
    indigo: 'bg-indigo-500/15 text-indigo-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
  } as const;
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4 transition hover:border-violet-500/40"
    >
      <div className="flex items-center gap-2">
        <span className={'rounded-lg p-1.5 ' + map[accent]}>{icon}</span>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Link>
  );
}
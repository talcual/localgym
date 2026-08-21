import { NavLink, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Dumbbell,
  Home,
  Inbox,
  MessageSquare,
  Send,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-violet-600/35 text-white shadow-[inset_0_0_20px_rgba(139,92,246,0.25)]'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`;

const navigation: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ['Panel', '/instructor', Home],
  ['Clientes', '/instructor/clients', Briefcase],
  ['Rutinas', '/instructor/routines', Dumbbell],
  ['Invitaciones', '/instructor/invitations', UserPlus],
  ['Mensajes', '/instructor/messages', Inbox],
];

function Navigation() {
  return (
    <nav className="flex gap-1 lg:block lg:space-y-1">
      {navigation.map(([label, to, Icon]) => (
        <NavLink
          key={`${label}-${to}`}
          to={to}
          end={to === '/instructor'}
          className={linkClass}
        >
          <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function InstructorSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="border-b border-slate-800/80 bg-[#091121] lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:pt-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold shadow-lg shadow-violet-900/40">
            <Send className="h-4 w-4 text-white" aria-hidden />
          </div>
          <span className="text-lg font-semibold">ModoFit · Pro</span>
        </div>
      </div>

      <div className="px-4 pb-2 lg:px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-violet-300">
          <MessageSquare className="h-3 w-3" aria-hidden /> Instructor
        </span>
      </div>

      <div className="hidden flex-1 px-3 lg:block">
        <Navigation />
      </div>
      <div className="hidden border-t border-slate-800/80 p-3 lg:block">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
            {user?.displayName?.[0] ?? 'I'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user?.displayName}
            </span>
            <span className="block text-xs text-slate-500">Ver perfil</span>
          </span>
          <span className="text-slate-500" aria-hidden>
            ›
          </span>
        </NavLink>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="mt-2 w-full text-sm bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-md"
        >
          Salir
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden">
        <Navigation />
      </div>
    </aside>
  );
}
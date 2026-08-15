import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-600/35 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.18)]'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`;

const navigation = [
  ['Inicio', '/app', '⌂'],
  ['Rutina', '/exercises', '⌘'],
  ['Catálogo', '/catalog', '▣'],
  ['Historial', '/sessions', '◷'],
  ['Progreso', '/progress', '⌁'],
  ['Stats', '/stats', '⌁'],
  ['Calendario', '/sessions', '□'],
  ['Objetivos', '/progress', '♡'],
  ['Ajustes', '/profile', '⚙'],
] as const;

function Navigation() {
  return (
    <nav className="flex gap-1 lg:block lg:space-y-1">
      {navigation.map(([label, to, icon]) => (
        <NavLink key={`${label}-${to}`} to={to} end={to === '/app'} className={linkClass}>
          <span className="w-4 text-center text-base text-slate-400">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="border-b border-slate-800/80 bg-[#091121] lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:pt-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold shadow-lg shadow-violet-900/40">
            <span className="text-white">╬</span>
          </div>
          <span className="text-lg font-semibold">ModoFit</span>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <NavLink
            to="/profile"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm"
            title="Perfil"
          >
            <i className="fa-solid fa-user text-slate-300"></i>
          </NavLink>
          <span className="hidden sm:inline text-sm text-slate-400">
            {user?.displayName}
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-md"
          >
            Salir
          </button>
        </div>
      </div>
        <div className="hidden flex-1 px-3 lg:block">
          <Navigation />
        </div>
        <div className="hidden border-t border-slate-800/80 p-3 lg:block">
          <NavLink to="/profile" className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">{user?.displayName?.[0] ?? 'U'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user?.displayName}</span>
              <span className="block text-xs text-slate-500">Ver perfil</span>
            </span>
            <span className="text-slate-500">›</span>
          </NavLink>
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden">
          <Navigation />
        </div>
    </aside>
  );
}

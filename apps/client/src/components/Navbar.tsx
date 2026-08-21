import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Dumbbell,
  Home,
  Library,
  LineChart,
  ListChecks,
  LogOut,
  Send,
  Settings as SettingsIcon,
  Target,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-600/35 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.18)]'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`;

const linkClassInstructor = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-violet-600/35 text-white shadow-[inset_0_0_20px_rgba(139,92,246,0.25)]'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`;

/**
 * Navbar del Shell de cliente. Los instructores también la ven completa
 * (porque el instructor también entrena) + un link extra "Panel instructor"
 * que los lleva al InstructorShell.
 */
const studentNavigation: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ['Inicio', '/app', Home],
  ['Mis rutinas', '/routines', ListChecks],
  ['Ejercicios', '/exercises', Dumbbell],
  ['Catálogo', '/catalog', Library],
  ['Historial', '/sessions', Calendar],
  ['Calendario', '/calendar', CalendarDays],
  ['Progreso', '/progress', LineChart],
  ['Stats', '/stats', BarChart3],
  ['Objetivos', '/goals', Target],
  ['Ajustes', '/profile', SettingsIcon],
];

const instructorExtraNavigation: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ['Panel instructor', '/instructor', Send],
];

function Navigation({
  items,
  extraItems = [],
}: {
  items: ReadonlyArray<readonly [string, string, LucideIcon]>;
  extraItems?: ReadonlyArray<readonly [string, string, LucideIcon]>;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {extraItems.length > 0 && (
        <div className="mb-2 space-y-1 border-b border-slate-800/80 pb-2">
          {extraItems.map(([label, to, Icon]) => (
            <NavLink
              key={`${label}-${to}`}
              to={to}
              end={to === '/instructor'}
              className={linkClassInstructor}
            >
              <Icon className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      )}
      {items.map(([label, to, Icon]) => (
        <NavLink
          key={`${label}-${to}`}
          to={to}
          end={to === '/app'}
          className={linkClass}
        >
          <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Navbar() {
  const { user, logout, isInstructor } = useAuth();
  const navigate = useNavigate();

  // Instructor ve TODO lo del cliente + el acceso al panel instructor.
  // NO pierde su experiencia personal de entrenamiento.
  return (
    <aside className="border-b border-slate-800/80 bg-[#091121] lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:pt-5">
        <div className="flex items-center gap-2">
          <div
            className={
              'flex h-8 w-8 items-center justify-center rounded-lg font-bold shadow-lg ' +
              (isInstructor
                ? 'bg-violet-600 shadow-violet-900/40'
                : 'bg-indigo-600 shadow-indigo-900/40')
            }
          >
            <Dumbbell className="h-4 w-4 text-white" aria-hidden />
          </div>
          <span className="text-lg font-semibold">
            {isInstructor ? 'ModoFit · Pro' : 'ModoFit'}
          </span>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <NavLink
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm hover:bg-slate-700"
            title="Perfil"
          >
            <User className="h-4 w-4 text-slate-300" aria-hidden />
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
      {isInstructor && (
        <div className="px-4 pb-2 lg:px-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-violet-300">
            Instructor
          </span>
        </div>
      )}
      <div className="hidden flex-1 px-3 lg:block">
        <Navigation
          items={studentNavigation}
          extraItems={isInstructor ? instructorExtraNavigation : []}
        />
      </div>
      <div className="hidden border-t border-slate-800/80 p-3 lg:block">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-slate-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm">
            {user?.displayName?.[0] ?? 'U'}
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
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-700 hover:bg-rose-950/30 hover:text-rose-200"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Cerrar sesión
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden">
        <Navigation
          items={studentNavigation}
          extraItems={isInstructor ? instructorExtraNavigation : []}
        />
      </div>
    </aside>
  );
}
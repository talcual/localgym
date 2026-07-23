import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition ${
    isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold">
             <i className="fa-solid fa-dumbbell text-white"></i> 
          </div>
          <span className="text-lg font-semibold">Local GYM</span>
        </div>
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Inicio
          </NavLink>
          <NavLink to="/exercises" className={linkClass}>
            Ejercicios
          </NavLink>
          <NavLink to="/sessions" className={linkClass}>
            Historial
          </NavLink>
          <NavLink to="/stats" className={linkClass}>
            Stats
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
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
      <nav className="sm:hidden flex items-center gap-1 px-2 pb-2 overflow-x-auto">
        <NavLink to="/" end className={linkClass}>
          Inicio
        </NavLink>
        <NavLink to="/exercises" className={linkClass}>
          Ejercicios
        </NavLink>
        <NavLink to="/sessions" className={linkClass}>
          Historial
        </NavLink>
        <NavLink to="/stats" className={linkClass}>
          Stats
        </NavLink>
      </nav>
    </header>
  );
}

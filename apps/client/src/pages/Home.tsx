import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ShieldCheck, LineChart, MessageSquare } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Login } from './Login';
import { Register } from './Register';

/**
 * Landing pública.
 *
 * - Si el usuario ya está autenticado, lo redirige a su panel
 *   (`/instructor` o `/app` según rol) con `replace: true`.
 * - Si no, muestra una landing real: hero con propuesta de valor +
 *   features destacadas + panel auth (login/registro con switch).
 */
export function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!loading && user) {
      navigate(
        user.role === 'INSTRUCTOR' || user.role === 'ADMIN'
          ? '/instructor'
          : '/app',
        { replace: true },
      );
    }
  }, [user, loading, navigate]);

  // Mientras `AuthProvider` está cargando el token inicial, mostramos un
  // placeholder neutro para evitar el "Cargando..." perpetuo.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070d1a] text-slate-400">
        Cargando…
      </div>
    );
  }

  // Si el usuario está autenticado, el useEffect ya disparó la navegación.
  // Devolvemos null para no pintar la landing mientras React Router cambia
  // la ruta (evita un parpadeo del hero).
  if (user) return null;

  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#091121]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold shadow-lg shadow-indigo-900/40">
              <Dumbbell className="h-4 w-4 text-white" aria-hidden />
            </div>
            <span className="text-lg font-semibold">ModoFit</span>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 sm:flex">
            <a href="#features" className="hover:text-white">
              Funciones
            </a>
            <a href="#instructors" className="hover:text-white">
              Para instructores
            </a>
            <a href="#auth" className="hover:text-white">
              Empezar
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:py-16">
        {/* Hero */}
        <section className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Tu progreso, organizado
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Registra tus rutinas, mide tu progreso
            <br />
            y deja que tu instructor te guíe.
          </h1>
          <p className="mt-4 text-base text-slate-300">
            ModoFit es un entrenador personal digital: anota ejercicios,
            peso, medidas y rachas. Si tienes un instructor, podrá ver tus
            datos, escribirte rutinas y mantener la conversación contigo en
            un solo lugar.
          </p>

          <div id="features" className="mt-8 grid gap-3 sm:grid-cols-2">
            <Feature
              icon={<LineChart className="h-5 w-5" aria-hidden />}
              title="Progreso medible"
              text="Series, repeticiones, peso, medidas e IMC en un solo dashboard."
            />
            <Feature
              icon={<Dumbbell className="h-5 w-5" aria-hidden />}
              title="Rutinas claras"
              text="Genera, edita y activa rutinas por día con recordatorios visuales."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
              title="Privacidad primero"
              text="Tus datos son tuyos. Los instructores sólo ven lo que tú aceptas compartir."
            />
            <Feature
              icon={<MessageSquare className="h-5 w-5" aria-hidden />}
              title="Conversación directa"
              text="Tu instructor puede mandarte mensajes desde su panel — sin WhatsApp."
            />
          </div>
        </section>

        {/* Panel de auth */}
        <section
          id="auth"
          className="rounded-2xl border border-slate-800 bg-[#0d1526] p-6 shadow-2xl lg:p-8"
        >
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-900/60 p-1 text-sm">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={
                'rounded-md px-3 py-1.5 transition ' +
                (authMode === 'login'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800')
              }
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={
                'rounded-md px-3 py-1.5 transition ' +
                (authMode === 'register'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800')
              }
            >
              Crear cuenta
            </button>
          </div>

          {authMode === 'login' ? (
            <Login onSwitch={() => setAuthMode('register')} />
          ) : (
            <Register onSwitch={() => setAuthMode('login')} />
          )}

          <p
            id="instructors"
            className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500"
          >
            ¿Eres instructor? Selecciona "Soy instructor" al crear tu cuenta
            para acceder al panel de gestión de clientes.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        ModoFit · Hecho con cariño para gente seria del gym.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
      <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 p-1.5 text-indigo-300">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {title}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );
}
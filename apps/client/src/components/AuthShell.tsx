import { Link } from 'react-router-dom';
import { Dumbbell, ArrowLeft } from 'lucide-react';

/**
 * Layout compartido para las páginas públicas `/login` y `/register`.
 *
 * Replica la estética de la landing pública (`Home.tsx`) para que, cuando
 * un usuario sin sesión intenta acceder a una ruta protegida, la
 * redirección a `/login` se vea consistente y profesional.
 *
 * Estructura:
 *  - Header con logo "ModoFit" + botón "Volver".
 *  - Layout 2 columnas en `lg`: copy a la izquierda + card de auth a la derecha.
 *  - En móvil: solo la card, centrada, con padding.
 */
export function AuthShell({
  children,
  side,
}: {
  children: React.ReactNode;
  side: 'login' | 'register';
}) {
  const isLogin = side === 'login';
  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#091121]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-90"
            aria-label="Volver al inicio"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold shadow-lg shadow-indigo-900/40">
              <Dumbbell className="h-4 w-4 text-white" aria-hidden />
            </div>
            <span className="text-lg font-semibold">ModoFit</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:py-16">
        {/* Copy lateral (solo lg) */}
        <section className="hidden flex-col justify-center lg:flex">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-300">
            {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {isLogin ? (
              <>
                Continúa tu rutina
                <br />
                justo donde la dejaste.
              </>
            ) : (
              <>
                Empieza a registrar
                <br />
                tus entrenamientos hoy.
              </>
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            {isLogin
              ? 'Inicia sesión para sincronizar tus rutinas, medidas y progreso entre dispositivos. Tu instructor ya está listo para ayudarte.'
              : 'Crea tu cuenta gratuita, importa tus primeros ejercicios y empieza a entrenar. Más tarde podrás vincularte con un instructor.'}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Catálogo con más de 1.300 ejercicios listos para usar.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Calendario, medidas corporales y métricas de progreso.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Modo instructor: asigna rutinas y haz seguimiento.
            </li>
          </ul>
        </section>

        {/* Card auth */}
        <section className="flex items-center">
          <div className="w-full rounded-2xl border border-slate-800 bg-[#0d1526] p-6 shadow-2xl shadow-indigo-950/20 sm:p-8">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
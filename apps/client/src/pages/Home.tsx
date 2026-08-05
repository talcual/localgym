import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Login } from './Login';
import { Register } from './Register';

type Mode = 'login' | 'register';

export function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center font-bold">
            <i className="fa-solid fa-dumbbell text-white"></i>
          </div>
          <span className="text-lg font-semibold">ModoFit</span>
        </div>
        <a
          href="#como-funciona"
          className="text-sm text-slate-300 hover:text-white"
        >
          ¿Cómo funciona?
        </a>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl w-full mx-auto px-4 py-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider bg-brand-900/40 text-brand-300 px-3 py-1 rounded-full border border-brand-800">
              <i className="fa-solid fa-bolt"></i> Tu gimnasio, en modo fit
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Registra cada repetición.
              <span className="text-brand-400"> Construye tu racha.</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl">
              ModoFit es un tracker de ejercicios corporales minimalista.
              Crea tus rutinas, corre sesiones con temporizador, lleva tu
              historial y mira tus estadísticas para no perder el ritmo.
            </p>

            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-900/50 border border-brand-800 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-list-check text-brand-300"></i>
                </span>
                <div>
                  <div className="font-medium">Crea tus rutinas</div>
                  <div className="text-sm text-slate-400">
                    Define ejercicios por tiempo o por repeticiones con sus descansos.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-900/50 border border-brand-800 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-stopwatch text-brand-300"></i>
                </span>
                <div>
                  <div className="font-medium">Corre sesiones guiadas</div>
                  <div className="text-sm text-slate-400">
                    Temporizador, cuenta regresiva de descanso y registro automático.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-900/50 border border-brand-800 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-chart-line text-brand-300"></i>
                </span>
                <div>
                  <div className="font-medium">Mide tu progreso</div>
                  <div className="text-sm text-slate-400">
                    Racha actual, mejor racha, tiempo total y volumen por ejercicio.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-900/50 border border-brand-800 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-mobile-screen text-brand-300"></i>
                </span>
                <div>
                  <div className="font-medium">Funciona como PWA</div>
                  <div className="text-sm text-slate-400">
                    Instálalo en tu teléfono y úsalo sin conexión.
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="w-full max-w-md mx-auto" id="auth">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-xl shadow-brand-900/10">
              <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
                    mode === 'login'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
                    mode === 'register'
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              {mode === 'login' ? (
                <Login onSwitch={() => setMode('register')} />
              ) : (
                <Register onSwitch={() => setMode('login')} />
              )}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="max-w-6xl w-full mx-auto px-4 py-12 border-t border-slate-900"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">¿Cómo funciona?</h2>
            <p className="text-slate-400 mt-2">
              Cuatro pasos para llevar el control de tu entrenamiento.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Step
              n={1}
              icon="fa-user-plus"
              title="Crea tu cuenta"
              desc="Regístrate gratis con tu email. Tus datos quedan solo para ti."
            />
            <Step
              n={2}
              icon="fa-pen-to-square"
              title="Define tu rutina"
              desc="Agrega ejercicios por tiempo o repeticiones con sus descansos."
            />
            <Step
              n={3}
              icon="fa-play"
              title="Entrena"
              desc="Inicia la sesión: el temporizador marca el ritmo y guarda tu progreso."
            />
            <Step
              n={4}
              icon="fa-trophy"
              title="Revisa tus stats"
              desc="Consulta racha, tiempo total y volumen por ejercicio."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          ModoFit · Tu tracker de ejercicios personales
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-lg bg-brand-600/20 border border-brand-800 flex items-center justify-center text-brand-300 font-bold">
          {n}
        </span>
        <i className={`fa-solid ${icon} text-slate-400`}></i>
      </div>
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-slate-400">{desc}</div>
    </div>
  );
}

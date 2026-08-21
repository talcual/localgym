import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { instructorsApi, routinesApi } from '../../api';
import type { InstructorClient } from '../../api/types';
import type { RoutineWithItems } from '../../api/routines';

export function InstructorRoutines() {
  const [clients, setClients] = useState<InstructorClient[]>([]);
  const [routinesByClient, setRoutinesByClient] = useState<Record<string, RoutineWithItems[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await instructorsApi.listClients();
        setClients(c.filter((x) => x.status === 'ACTIVE'));
        const result: Record<string, RoutineWithItems[]> = {};
        for (const cli of c) {
          if (cli.status === 'ACTIVE') {
            const list = await routinesApi.list(cli.clientId);
            result[cli.clientId] = list.filter(
              (r) => r.writtenByInstructorId != null,
            );
          }
        }
        setRoutinesByClient(result);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Rutinas escritas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Crea rutinas para tus clientes y asígnalas con una ventana de
            fechas.
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-8 text-center text-slate-400">
          Sin clientes activos. Acepta una invitación para empezar.
        </div>
      ) : (
        clients.map((c) => (
          <section key={c.id} className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                Cliente #{c.clientId.slice(0, 8)}
              </h2>
              <Link
                to={`/instructor/clients/${c.clientId}`}
                className="text-xs text-slate-400 underline hover:text-white"
              >
                Ver detalle
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {(routinesByClient[c.clientId] ?? []).length === 0 ? (
                <li className="text-xs text-slate-500">
                  Aún no has escrito rutinas para este cliente.
                </li>
              ) : (
                routinesByClient[c.clientId].map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                  >
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {r.goal} · {r.daysPerWeek} días ·{' '}
                        {r.items.length} ejercicios
                      </div>
                    </div>
                    <Link
                      to={`/instructor/routines/${r.id}/edit`}
                      className="text-xs text-violet-300 underline"
                    >
                      Editar
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
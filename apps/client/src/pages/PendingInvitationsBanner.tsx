import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus } from 'lucide-react';
import { instructorsApi } from '../api';
import type { InstructorInvitation } from '../api/types';

/**
 * Banner opcional que muestra invitaciones pendientes para el cliente.
 * Se puede incluir dentro del Shell.
 */
export function PendingInvitationsBanner() {
  const [items, setItems] = useState<InstructorInvitation[]>([]);
  const [dismissedIds, setDisabledIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    instructorsApi
      .pendingForMe()
      .then(setItems)
      .catch(() => undefined);
  }, []);

  const visible = items.filter((i) => !dismissedIds.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {visible.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-violet-700/40 bg-violet-950/30 px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2 text-violet-100">
            <UserPlus className="h-4 w-4" />
            Tienes una invitación pendiente como cliente.
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                navigate(
                  `/accept-invitation?token=${encodeURIComponent(inv.token)}`,
                )
              }
              className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500"
            >
              Aceptar
            </button>
            <button
              onClick={() => setDisabledIds((d) => [...d, inv.id])}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Descartar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
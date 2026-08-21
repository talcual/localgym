import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../api/types';

/**
 * Route guard que verifica el rol del usuario. Si no tiene un rol permitido,
 * redirige a `/app` (los clientes no ven el panel instructor).
 */
export function RoleRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow: ReadonlyArray<UserRole>;
}) {
  const { user, loading, isInstructor } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role ?? 'CLIENT';
  if (!allow.includes(role) && !isInstructor) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { Navbar } from './components/Navbar';
import { InstructorShell } from './components/InstructorShell';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthShell } from './components/AuthShell';
import { Dashboard } from './pages/Dashboard';
import { ExercisesList } from './pages/ExercisesList';
import { ExerciseForm } from './pages/ExerciseForm';
import { Catalog } from './pages/Catalog';
import { SessionRunner } from './pages/SessionRunner';
import { SessionHistory } from './pages/SessionHistory';
import { Stats } from './pages/Stats';
import { Profile } from './pages/Profile';
import { Weight } from './pages/Weight';
import { Measurements } from './pages/Measurements';
import { Progress } from './pages/Progress';
import { Routines } from './pages/Routines';
import { Calendar } from './pages/Calendar';
import { Goals } from './pages/Goals';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { InstructorHome } from './pages/instructor/InstructorHome';
import { ClientsList } from './pages/instructor/ClientsList';
import { ClientDetail } from './pages/instructor/ClientDetail';
import { InstructorRoutines } from './pages/instructor/InstructorRoutines';
import { InstructorRoutineForm } from './pages/instructor/InstructorRoutineForm';
import { Invitations } from './pages/instructor/Invitations';
import { Messages } from './pages/instructor/Messages';
import { useAuth } from './auth/AuthContext';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-100 lg:flex">
      <Navbar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </main>
    </div>
  );
}

export function App() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <AuthShell side="login">
            <Login />
          </AuthShell>
        }
      />
      <Route
        path="/register"
        element={
          <AuthShell side="register">
            <Register />
          </AuthShell>
        }
      />
      <Route
        path="/accept-invitation"
        element={
          <ProtectedRoute>
            <AcceptInvitation />
          </ProtectedRoute>
        }
      />

      {/* Rutas instructor */}
      <Route
        path="/instructor"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <InstructorHome />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/clients"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <ClientsList />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/clients/:clientId"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <ClientDetail />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/routines"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <InstructorRoutines />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/routines/:routineId/edit"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <InstructorRoutineForm />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/invitations"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <Invitations />
            </InstructorShell>
          </RoleRoute>
        }
      />
      <Route
        path="/instructor/messages"
        element={
          <RoleRoute allow={['INSTRUCTOR', 'ADMIN']}>
            <InstructorShell>
              <Messages />
            </InstructorShell>
          </RoleRoute>
        }
      />

      {/* Rutas cliente (también accesibles a instructores por si quieren ver su cuenta personal) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exercises"
        element={
          <ProtectedRoute>
            <Shell>
              <ExercisesList />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exercises/new"
        element={
          <ProtectedRoute>
            <Shell>
              <ExerciseForm />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exercises/:id/edit"
        element={
          <ProtectedRoute>
            <Shell>
              <ExerciseForm />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/run/:exerciseId"
        element={
          <ProtectedRoute>
            <Shell>
              <SessionRunner />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalog"
        element={
          <ProtectedRoute>
            <Shell>
              <Catalog />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Shell>
              <SessionHistory />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <Shell>
              <Stats />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Shell>
              <Profile />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/weight"
        element={
          <ProtectedRoute>
            <Shell>
              <Weight />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/measurements"
        element={
          <ProtectedRoute>
            <Shell>
              <Measurements />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Shell>
              <Progress />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/routines"
        element={
          <ProtectedRoute>
            <Shell>
              <Routines />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Shell>
              <Calendar />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <Shell>
              <Goals />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
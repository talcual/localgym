import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ExercisesList } from './pages/ExercisesList';
import { ExerciseForm } from './pages/ExerciseForm';
import { SessionRunner } from './pages/SessionRunner';
import { SessionHistory } from './pages/SessionHistory';
import { Stats } from './pages/Stats';
import { useAuth } from './auth/AuthContext';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

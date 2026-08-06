import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

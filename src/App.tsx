import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UIProvider } from './context/UIContext';
import { WithingsCallback } from './components/modules/WithingsCallback';
import { BiometricLock } from './components/auth/BiometricLock';

function App() {
  const { user, loading, isLocked } = useAuth();

  if (isLocked) {
    return <BiometricLock />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/withings-callback"
            element={user ? <WithingsCallback /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}

export default App;

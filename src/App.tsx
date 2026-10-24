import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from '../shared/types';
import { AuthProvider, useAuth } from './lib/auth';
import { homePath, LoginPage, SetupPage } from './pages/AuthPages';
import { LoadingScreen } from './components/ScreenBits';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrganizerPage = lazy(() => import('./pages/OrganizerPage'));
const ProjectorPage = lazy(() => import('./pages/ProjectorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WordsPage = lazy(() => import('./pages/WordsPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const PlayerViewPage = lazy(() => import('./pages/PlayerViewPage'));

/** Protected route: requires login, an optional role, and a non-temporary password. */
function Protected({ role, children, allowPending = false }: { role?: Role; children: ReactNode; allowPending?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword && !allowPending) return <Navigate to="/account" replace />;
  if (role && user.role !== role) return <Navigate to={homePath(user)} replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user ? homePath(user) : '/login'} replace />;
}

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="font-display text-5xl font-black text-neon-pink">404</div>
      <Link to="/" className="text-neon-cyan underline">Back to start</Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/dashboard" element={<Protected role="ORGANIZER"><DashboardPage /></Protected>} />
            <Route path="/organizer" element={<Protected role="ORGANIZER"><OrganizerPage /></Protected>} />
            <Route path="/projector" element={<Protected role="ORGANIZER"><ProjectorPage /></Protected>} />
            <Route path="/settings" element={<Protected role="ORGANIZER"><SettingsPage /></Protected>} />
            <Route path="/words" element={<Protected role="ORGANIZER"><WordsPage /></Protected>} />
            <Route path="/players" element={<Protected role="ORGANIZER"><PlayersPage /></Protected>} />
            <Route path="/account" element={<Protected allowPending><AccountPage /></Protected>} />
            <Route path="/play" element={<Protected role="PLAYER"><PlayerViewPage /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

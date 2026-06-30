import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import OwnerLayout from './pages/owner/OwnerLayout';
import Dashboard from './pages/owner/Dashboard';
import Subscribers from './pages/owner/Subscribers';
import SubscriberDetail from './pages/owner/SubscriberDetail';
import Billing from './pages/owner/Billing';
import Plans from './pages/owner/Plans';
import Portal from './pages/portal/Portal';

function Protected({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'COLLECTOR' ? '/portal' : '/owner'} replace />;
  }
  return <>{children}</>;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'OWNER' || user.role === 'ADMIN' ? '/owner' : '/portal'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />

        <Route path="/owner" element={<Protected roles={['OWNER', 'ADMIN']}><OwnerLayout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="subscribers/:id" element={<SubscriberDetail />} />
          <Route path="billing" element={<Billing />} />
          <Route path="plans" element={<Plans />} />
        </Route>

        <Route path="/portal" element={<Protected roles={['COLLECTOR', 'OWNER', 'ADMIN']}><Portal /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

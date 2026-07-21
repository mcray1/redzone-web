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
import Staff from './pages/owner/Staff';
import Roles from './pages/owner/Roles';
import Tickets from './pages/owner/Tickets';
import Collector from './pages/collector/Collector';
import Technician from './pages/technician/Technician';
import Installations from './pages/owner/Installations';
import Payroll from './pages/owner/Payroll';
import Reports from './pages/owner/Reports';
import Expenses from './pages/owner/Expenses';
import Audit from './pages/owner/Audit';
import Inventory from './pages/owner/Inventory';
import Network from './pages/owner/Network';
import Devices from './pages/owner/Devices';
import Vendo from './pages/owner/Vendo';
import Disconnections from './pages/owner/Disconnections';
import Settings from './pages/owner/Settings';
import Portal from './pages/portal/Portal';
import Register from './pages/Register';
import Registrations from './pages/owner/Registrations';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PasswordResets from './pages/owner/PasswordResets';
import StartWorkspace from './pages/StartWorkspace';
import Tenants from './pages/owner/Tenants';

// Landing considers EVERY role the user holds (not just the primary), so a
// multi-role user (e.g. MANAGER+TECHNICIAN) is always sent somewhere they can
// actually enter instead of bouncing between areas.
function landingForUser(user: { role: string; roles?: string[] }) {
  const held = user.roles && user.roles.length ? user.roles : [user.role];
  if (held.some((r) => r === 'OWNER' || r === 'ADMIN' || r === 'MANAGER')) return '/owner';
  if (held.includes('COLLECTOR')) return '/collector';
  if (held.includes('TECHNICIAN')) return '/technician';
  return '/portal';
}

function Protected({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const held: string[] = user.roles && user.roles.length ? user.roles : [user.role];
  if (!roles.some((r) => held.includes(r))) {
    return <Navigate to={landingForUser(user)} replace />;
  }
  return <>{children}</>;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={landingForUser(user)} replace />;
}

// A manager without reports.view shouldn't land on a Dashboard the nav hides
// from them — send them to Subscribers (always visible to owner-area staff).
function OwnerIndex() {
  const { hasPerm } = useAuth();
  return hasPerm('reports.view') ? <Dashboard /> : <Navigate to="/owner/subscribers" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/start" element={<StartWorkspace />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />

        <Route path="/owner" element={<Protected roles={['OWNER', 'ADMIN', 'MANAGER']}><OwnerLayout /></Protected>}>
          <Route index element={<OwnerIndex />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="subscribers/:id" element={<SubscriberDetail />} />
          <Route path="registrations" element={<Registrations />} />
          <Route path="password-resets" element={<PasswordResets />} />
          <Route path="billing" element={<Billing />} />
          <Route path="plans" element={<Plans />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="staff" element={<Staff />} />
          <Route path="roles" element={<Roles />} />
          <Route path="settings" element={<Settings />} />
          <Route path="installations" element={<Installations />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="disconnections" element={<Disconnections />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="audit" element={<Audit />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="network" element={<Network />} />
          <Route path="devices" element={<Devices />} />
          <Route path="vendo" element={<Vendo />} />
          <Route path="tenants" element={<Tenants />} />
        </Route>

        <Route path="/collector" element={<Protected roles={['COLLECTOR']}><Collector /></Protected>} />
        <Route path="/technician" element={<Protected roles={['TECHNICIAN']}><Technician /></Protected>} />

        <Route path="/portal" element={<Protected roles={['CUSTOMER', 'COLLECTOR', 'OWNER', 'ADMIN']}><Portal /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

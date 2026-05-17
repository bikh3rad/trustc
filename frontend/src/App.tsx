import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { CurrentStartupProvider } from "./context/CurrentStartupContext";
import { FrozenProvider } from "./context/FrozenContext";
import { PersonaProvider } from "./context/PersonaContext";
import { ToastProvider } from "./context/ToastContext";
import { useUser } from "./context/AuthContext";

import { Dashboard } from "./modules/founder/Dashboard";
import { Procurements } from "./modules/founder/Procurements";
import { ProcurementDetail } from "./modules/founder/ProcurementDetail";
import { NewProcurement } from "./modules/founder/NewProcurement";
import { Invoices } from "./modules/founder/Invoices";
import { Escrow } from "./modules/founder/Escrow";
import { Ledger } from "./modules/founder/Ledger";

import { Portfolio } from "./modules/vc/Portfolio";
import { Recycling } from "./modules/vc/Recycling";
import { KillSwitch } from "./modules/vc/KillSwitch";

import { Audit } from "./modules/auditor/Audit";
import { Reports } from "./modules/auditor/Reports";

import { AdminOverview } from "./modules/admin/Overview";
import { AdminUsers } from "./modules/admin/Users";
import { AdminSettings } from "./modules/admin/Settings";

import { ROLE_HOME, RoleGuard } from "./routes/RoleGuard";

// HomeRedirect routes "/" to the role's default landing page. The role comes
// from the authenticated JWT, NOT from PersonaContext (which is just an
// admin/dev impersonation toggle now).
function HomeRedirect() {
  const user = useUser();
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

// Roles permitted per route family. ADMIN is added to every allow-list so
// admins can impersonate any persona for debugging (Phase 4.2). The gateway
// enforces real authorization on the API; this just keeps the UI honest.
const FOUNDER_ROLES = ["FOUNDER", "ADMIN"] as const;
const VC_ROLES      = ["VC", "ADMIN"] as const;
const AUDITOR_ROLES = ["AUDITOR", "ADMIN"] as const;
const ADMIN_ROLES   = ["ADMIN"] as const;

export function App() {
  return (
    <PersonaProvider>
      <ToastProvider>
        <CurrentStartupProvider>
          <FrozenProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />

                {/* Founder */}
                <Route path="/dashboard" element={<RoleGuard allow={[...FOUNDER_ROLES]}><Dashboard /></RoleGuard>} />
                <Route path="/procurements" element={<RoleGuard allow={[...FOUNDER_ROLES]}><Procurements /></RoleGuard>} />
                <Route path="/procurements/new" element={<RoleGuard allow={[...FOUNDER_ROLES]}><NewProcurement /></RoleGuard>} />
                <Route path="/procurements/:id" element={<RoleGuard allow={[...FOUNDER_ROLES]}><ProcurementDetail /></RoleGuard>} />
                <Route path="/invoices" element={<RoleGuard allow={[...FOUNDER_ROLES]}><Invoices /></RoleGuard>} />
                <Route path="/escrow" element={<RoleGuard allow={[...FOUNDER_ROLES]}><Escrow /></RoleGuard>} />
                <Route path="/ledger" element={<RoleGuard allow={[...FOUNDER_ROLES]}><Ledger /></RoleGuard>} />

                {/* VC */}
                <Route path="/vc/portfolio" element={<RoleGuard allow={[...VC_ROLES]}><Portfolio /></RoleGuard>} />
                <Route path="/vc/recycling" element={<RoleGuard allow={[...VC_ROLES]}><Recycling /></RoleGuard>} />
                <Route path="/vc/killswitch" element={<RoleGuard allow={[...VC_ROLES]}><KillSwitch /></RoleGuard>} />

                {/* Auditor */}
                <Route path="/auditor/audit" element={<RoleGuard allow={[...AUDITOR_ROLES]}><Audit /></RoleGuard>} />
                <Route path="/auditor/reports" element={<RoleGuard allow={[...AUDITOR_ROLES]}><Reports /></RoleGuard>} />

                {/* Admin */}
                <Route path="/admin" element={<RoleGuard allow={[...ADMIN_ROLES]}><AdminOverview /></RoleGuard>} />
                <Route path="/admin/users" element={<RoleGuard allow={[...ADMIN_ROLES]}><AdminUsers /></RoleGuard>} />
                <Route path="/admin/settings" element={<RoleGuard allow={[...ADMIN_ROLES]}><AdminSettings /></RoleGuard>} />

                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </AppShell>
          </FrozenProvider>
        </CurrentStartupProvider>
      </ToastProvider>
    </PersonaProvider>
  );
}

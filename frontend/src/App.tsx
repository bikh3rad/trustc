import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ensureDevToken } from "./api";
import { AppShell } from "./layout/AppShell";
import { CurrentStartupProvider } from "./context/CurrentStartupContext";
import { FrozenProvider } from "./context/FrozenContext";
import { PERSONA_HOME, PersonaProvider, usePersona } from "./context/PersonaContext";
import { ToastProvider } from "./context/ToastContext";

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

function HomeRedirect() {
  const { persona } = usePersona();
  return <Navigate to={PERSONA_HOME[persona]} replace />;
}

export function App() {
  useEffect(() => {
    void ensureDevToken();
  }, []);

  return (
    <PersonaProvider>
      <ToastProvider>
        <CurrentStartupProvider>
          <FrozenProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />

                {/* Founder */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/procurements" element={<Procurements />} />
                <Route path="/procurements/new" element={<NewProcurement />} />
                <Route path="/procurements/:id" element={<ProcurementDetail />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/escrow" element={<Escrow />} />
                <Route path="/ledger" element={<Ledger />} />

                {/* VC */}
                <Route path="/vc/portfolio" element={<Portfolio />} />
                <Route path="/vc/recycling" element={<Recycling />} />
                <Route path="/vc/killswitch" element={<KillSwitch />} />

                {/* Auditor */}
                <Route path="/auditor/audit" element={<Audit />} />
                <Route path="/auditor/reports" element={<Reports />} />

                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </AppShell>
          </FrozenProvider>
        </CurrentStartupProvider>
      </ToastProvider>
    </PersonaProvider>
  );
}

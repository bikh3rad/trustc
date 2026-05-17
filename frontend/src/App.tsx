import { NavLink, Route, Routes } from "react-router-dom";
import { Dashboard } from "./modules/Dashboard";
import { Startups } from "./modules/Startups";
import { Procurements } from "./modules/Procurements";
import { ProcurementDetail } from "./modules/ProcurementDetail";
import { Audit } from "./modules/Audit";
import { Governance } from "./modules/Governance";
import { useEffect } from "react";
import { ensureDevToken } from "./api";

export function App() {
  useEffect(() => {
    void ensureDevToken();
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">trustC</div>
        <div className="brand-sub">Venture Financial OS</div>
        <nav>
          <NavLink to="/" end>Portfolio</NavLink>
          <NavLink to="/startups">Startups</NavLink>
          <NavLink to="/procurements">Procurements</NavLink>
          <NavLink to="/governance">Governance</NavLink>
          <NavLink to="/audit">Audit log</NavLink>
        </nav>
        <div className="footer">Phase 1 vertical slice</div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/startups" element={<Startups />} />
          <Route path="/procurements" element={<Procurements />} />
          <Route path="/procurements/:id" element={<ProcurementDetail />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/audit" element={<Audit />} />
        </Routes>
      </main>
    </div>
  );
}

import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import RequireAllowedUser from "../auth/RequireAllowedUser";
import RequireAuth from "../auth/RequireAuth";
import { getAllowedEmails } from "../auth/publiclogicConfig";
import AppShell from "./shell/AppShell";
import Builder from "./pages/Builder";
import Dashboard from "./pages/Dashboard";
import Environments from "./pages/Environments";
import Pipeline from "./pages/Pipeline";
import Playbooks from "./pages/Playbooks";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Lists from "./pages/Lists";
import Today from "./pages/Today";
import Tools from "./pages/Tools";
import { HomePage } from "../pages/HomePage";
import PhillipstonPRR from "./environments/phillipston/prr/PhillipstonPRR";
import PhillipstonLegacy from "./pages/PhillipstonLegacy";
import TownShell from "./environments/TownShell";
import PhillipstonHome from "./environments/phillipston/PhillipstonHome";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function HomeRedirect() {
  // Always land on the LogicCommons OS entry portal; environments remain available via explicit routes.
  return <HomePage />;
}

function PhillipstonLayout() {
  const location = useLocation();
  const isPrr = location.pathname.startsWith("/phillipston/prr");

  return (
    <TownShell
      town="Phillipston"
      subtitle={
        isPrr ? "Public Records Requests (M.G.L. c. 66 §10)" : "CaseSpace"
      }
      className="env-phillipston"
      homeTo={isPrr ? "/phillipston" : "/phillipston/prr/staff"}
      homeLabel={isPrr ? "CaseSpace" : "PRR"}
    >
      <Outlet />
    </TownShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomeRedirect />
          </RequireAuth>
        }
      />

      {/* Phillipston governed app (enclosed). */}
      <Route
        path="/phillipston"
        element={
          <RequireAuth>
            <PhillipstonLayout />
          </RequireAuth>
        }
      >
        <Route index element={<PhillipstonHome />} />
        <Route path="prr/*" element={<PhillipstonPRR />} />
      </Route>

      {/* PublicLogic ops portal (private) */}
      <Route
        element={
          <RequireAuth>
            <RequireAllowedUser>
              <AppShell>
                <Outlet />
              </AppShell>
            </RequireAllowedUser>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/today" element={<Today />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/tasks" element={<Navigate to="/lists" replace />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/playbooks" element={<Playbooks />} />
        <Route path="/writing" element={<Navigate to="/playbooks" replace />} />
        <Route path="/discovery" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/environments" element={<Environments />} />
        <Route path="/settings" element={<Settings />} />

        {/* Legacy demo screens (reference only) */}
        <Route path="/legacy/phillipston" element={<PhillipstonLegacy />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

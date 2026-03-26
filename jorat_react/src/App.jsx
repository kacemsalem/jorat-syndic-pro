import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Residences from "./pages/Residences";
import LotsKanban from "./pages/LotsKanban";
import GroupesPage from "./pages/GroupesPage";
import PersonnesPage from "./pages/PersonnesPage";
import LotsPage from "./pages/LotsPage";
import AppelsChargePage from "./pages/AppelsChargePage";
import DetailsAppelPage from "./pages/DetailsAppelPage";
import PaiementPage from "./pages/PaiementPage";
import SynthesePage from "./pages/SynthesePage";
import SituationPaiementsPage from "./pages/SituationPaiementsPage";
import FicheLotPage from "./pages/FicheLotPage";
import CategoriesDepensePage from "./pages/CategoriesDepensePage";
import FournisseursPage from "./pages/FournisseursPage";
import ComptesComptablesPage from "./pages/ComptesComptablesPage";
import DepensesPage from "./pages/DepensesPage";
import CaissePage from "./pages/CaissePage";
import RecettesPage from "./pages/RecettesPage";
import LandingApp from "./pages/LandingPage";
import RapportsPage from "./pages/RapportsPage";
import RapportFinancierPage from "./pages/RapportFinancierPage";
import BureauSyndicalPage from "./pages/BureauSyndicalPage";
import AssembleesPage from "./pages/AssembleesPage";
import ResolutionsPage from "./pages/ResolutionsPage";
import DocumentsGouvernancePage from "./pages/DocumentsGouvernancePage";
import ExportPage from "./pages/ExportPage";
import ImportPage from "./pages/ImportPage";
import ResidentPortalPage from "./pages/ResidentPortalPage";
import AccueilPage from "./pages/AccueilPage";
import GestionUtilisateursPage from "./pages/GestionUtilisateursPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import InitialisationPage from "./pages/InitialisationPage";
import ArchivagePage from "./pages/ArchivagePage";
import HelpPage from "./pages/HelpPage";
import TravauxPage from "./pages/TravauxPage";
import NotificationsPage from "./pages/NotificationsPage";
import FamillesDepensePage from "./pages/FamillesDepensePage";
import ModelesDepensePage from "./pages/ModelesDepensePage";
import MessagesResidentPage from "./pages/MessagesResidentPage";
import ConsultationPage from "./pages/ConsultationPage";
import EtatMensuelPage from "./pages/EtatMensuelPage";
import PassationConsignesPage from "./pages/PassationConsignesPage";
import ResolutionsVotePage from "./pages/ResolutionsVotePage";
import KanbanResolutionsPage from "./pages/KanbanResolutionsPage";
import ResidentVotePage from "./pages/ResidentVotePage";
import SuperuserDashboardPage from "./pages/SuperuserDashboardPage";
import IAChatPage from "./pages/IAChatPage";
import IASettingsPage from "./pages/IASettingsPage";
import JournalPage    from "./pages/comptabilite/JournalPage";
import GrandLivrePage from "./pages/comptabilite/GrandLivrePage";
import BalancePage    from "./pages/comptabilite/BalancePage";
import CpcPage        from "./pages/comptabilite/CpcPage";
import BilanPage      from "./pages/comptabilite/BilanPage";
import { AdminRoute, ResidentRoute } from "./components/ProtectedRoutes";
import Sidebar from "./components/Sidebar";
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import { ToastProvider } from "./components/Toast";

// Pages that use their own full-screen layout (no sidebar/header)
const PUBLIC_PATHS = ["/login", "/resident", "/change-password", "/espace-resident/votes", "/superuser"];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [residence, setResidence] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  const handleUnauthorized = () => {
    localStorage.removeItem("syndic_user");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (isPublic) {
      setAuthReady(true);
      return;
    }
    // Superuser has no ResidenceMembership — redirect directly, don't fetch
    const storedUser = JSON.parse(localStorage.getItem("syndic_user") || "null");
    if (storedUser?.is_superuser) {
      navigate("/superuser", { replace: true });
      setAuthReady(true);
      return;
    }
    fetch("/api/residences/", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        if (r.status === 403) {
          // Could be a superuser whose localStorage was set after this effect ran
          const u = JSON.parse(localStorage.getItem("syndic_user") || "null");
          if (u?.is_superuser) navigate("/superuser", { replace: true });
          else handleUnauthorized();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        setAuthReady(true);
        if (!data) return;
        const list = Array.isArray(data) ? data : (data.results ?? []);
        if (list.length > 0) {
          setResidence(list[0]);
          localStorage.setItem("active_residence", String(list[0].id));
        }
      })
      .catch(() => setAuthReady(true));
  }, [isPublic]); // re-fetch only when switching between public/private, not on every route change

  // Redirect to change-password if flag is set
  const storedUser = JSON.parse(localStorage.getItem("syndic_user") || "null");
  if (!isPublic && storedUser?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  // Block render until backend confirms the session
  if (!isPublic && !authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Public pages (login / resident portal) ─────────────
  if (isPublic) {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/login"                  element={<LandingApp />} />
          <Route path="/change-password"        element={<ChangePasswordPage />} />
          <Route path="/resident"               element={<ResidentRoute><ResidentPortalPage /></ResidentRoute>} />
          <Route path="/espace-resident/votes"  element={<ResidentRoute><ResidentVotePage /></ResidentRoute>} />
          <Route path="/superuser"              element={<SuperuserDashboardPage />} />
        </Routes>
      </div>
    );
  }

  // ── Authenticated dashboard layout ──────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">

      <AppHeader residence={residence} onToggleSidebar={() => setSidebarOpen(o => !o)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-auto p-3 sm:p-6 pb-20">
          <AdminRoute>
            <Routes>
              <Route path="/accueil"            element={<AccueilPage />} />
              <Route path="/residences"         element={<Residences />} />
              <Route path="/kanban"             element={<LotsKanban />} />
              <Route path="/groupes"            element={<GroupesPage />} />
              <Route path="/personnes"          element={<PersonnesPage />} />
              <Route path="/lots/new"           element={<LotsPage />} />
              <Route path="/lots/:id"           element={<LotsPage />} />
              <Route path="/appels-charge"      element={<AppelsChargePage />} />
              <Route path="/details-appel"      element={<DetailsAppelPage />} />
              <Route path="/paiements"          element={<PaiementPage />} />
              <Route path="/synthese"              element={<SynthesePage />} />
              <Route path="/situation-paiements" element={<SituationPaiementsPage />} />
              <Route path="/fiche-lot"          element={<FicheLotPage />} />
              <Route path="/categories-depense" element={<CategoriesDepensePage />} />
              <Route path="/familles-depense"   element={<FamillesDepensePage />} />
              <Route path="/modeles-depense"    element={<ModelesDepensePage />} />
              <Route path="/fournisseurs"       element={<FournisseursPage />} />
              <Route path="/comptes-comptables" element={<ComptesComptablesPage />} />
              <Route path="/depenses"           element={<DepensesPage />} />
              <Route path="/caisse"             element={<CaissePage />} />
              <Route path="/recettes"           element={<RecettesPage />} />
              <Route path="/rapports"           element={<RapportsPage />} />
              <Route path="/rapport-financier"  element={<RapportFinancierPage />} />
              <Route path="/gouvernance/bureau"      element={<BureauSyndicalPage />} />
              <Route path="/gouvernance/assemblees"  element={<AssembleesPage />} />
              <Route path="/gouvernance/resolutions" element={<ResolutionsPage />} />
              <Route path="/gouvernance/documents"   element={<DocumentsGouvernancePage />} />
              <Route path="/gouvernance/travaux"          element={<TravauxPage />} />
              <Route path="/gouvernance/notifications"        element={<NotificationsPage />} />
              <Route path="/gouvernance/resolutions-vote"    element={<ResolutionsVotePage />} />
              <Route path="/gouvernance/kanban-resolutions"  element={<KanbanResolutionsPage />} />
              <Route path="/espace-resident/messages"        element={<MessagesResidentPage />} />
              <Route path="/espace-resident/consultation"    element={<ConsultationPage />} />
              <Route path="/etat-mensuel"                  element={<EtatMensuelPage />} />
              <Route path="/passation-consignes"          element={<PassationConsignesPage />} />
              <Route path="/ia/chat"                      element={<IAChatPage />} />
              <Route path="/parametrage/ia"               element={<IASettingsPage />} />
              <Route path="/comptabilite/journal"    element={<JournalPage />} />
              <Route path="/comptabilite/grand-livre" element={<GrandLivrePage />} />
              <Route path="/comptabilite/balance"    element={<BalancePage />} />
              <Route path="/comptabilite/cpc"        element={<CpcPage />} />
              <Route path="/comptabilite/bilan"      element={<BilanPage />} />
              <Route path="/export"                element={<ExportPage />} />
              <Route path="/import"                element={<ImportPage />} />
              <Route path="/gestion-utilisateurs"  element={<GestionUtilisateursPage />} />
              <Route path="/initialisation"        element={<InitialisationPage />} />
              <Route path="/archivage"             element={<ArchivagePage />} />
              <Route path="/aide"                  element={<HelpPage />} />
              <Route path="/"                      element={<Navigate to="/accueil" replace />} />
            </Routes>
          </AdminRoute>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppLayout />
      </Router>
    </ToastProvider>
  );
}

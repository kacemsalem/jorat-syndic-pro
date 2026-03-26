import { useNavigate, useLocation } from "react-router-dom";

/* ── Icônes SVG ─────────────────────────────────────────── */
const IC = {
  home:   <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  grid:   <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  users:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  balance:<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  wrench: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
};

/* ── 4 sections fixes ───────────────────────────────────── */
const SECTIONS = [
  {
    label: "Gestion",
    icon:  IC.grid,
    path:  "/gestion",
    test:  p => p === "/gestion" || [
      "/caisse", "/paiements", "/depenses", "/recettes",
      "/residences", "/kanban", "/appels-charge", "/groupes",
      "/personnes", "/lots", "/fiche-lot", "/details-appel",
      "/synthese", "/situation-paiements", "/etat-mensuel",
      "/rapport-financier", "/rapports",
    ].some(r => p === r || p.startsWith(r + "/")),
  },
  {
    label: "Gouvernance",
    icon:  IC.users,
    path:  "/gouvernance",
    test:  p => p === "/gouvernance" || p.startsWith("/gouvernance/") || p.startsWith("/passation"),
  },
  // null = bouton Home central
  {
    label: "Comptabilité",
    icon:  IC.balance,
    path:  "/comptabilite",
    test:  p => p === "/comptabilite" || p.startsWith("/comptabilite/"),
  },
  {
    label: "Outils",
    icon:  IC.wrench,
    path:  "/outils",
    test:  p => p === "/outils" || [
      "/import", "/export", "/archivage", "/parametrage",
      "/gestion-utilisateurs", "/initialisation", "/ia/", "/aide",
    ].some(r => p === r || p.startsWith(r + "/") || p.startsWith(r)),
  },
];

/* ── Composant ─────────────────────────────────────────── */
export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isHome = pathname === "/accueil";

  // [gauche1, gauche2, null=home, droite1, droite2]
  const allItems = [SECTIONS[0], SECTIONS[1], null, SECTIONS[2], SECTIONS[3]];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50">
      <div className="flex items-end justify-around h-16 px-2 max-w-2xl mx-auto">
        {allItems.map((item, idx) => {
          /* ─── Bouton Home central ─── */
          if (!item) return (
            <button key="home" onClick={() => navigate("/accueil")}
              className="flex flex-col items-center justify-center flex-1 pb-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg -translate-y-3 transition-all ${isHome ? "bg-blue-700" : "bg-blue-600"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                  {IC.home}
                </svg>
              </div>
            </button>
          );

          const active = item.test(pathname);
          return (
            <button key={idx} onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
              <svg viewBox="0 0 24 24" fill="none"
                stroke={active ? "#2563EB" : "#94A3B8"}
                strokeWidth={active ? "2.2" : "1.8"}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 20, height: 20 }}>
                {item.icon}
              </svg>
              <span className={`text-[9px] font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}>
                {item.label}
              </span>
              {active && <div className="w-1 h-1 rounded-full bg-blue-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

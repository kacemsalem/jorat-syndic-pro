import { useNavigate, useLocation } from "react-router-dom";

/* ── Icônes SVG (enfants de <svg>) ─────────────────────────── */
const IC = {
  home:    <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  caisse:  <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  card:    <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  minus:   <><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  plus:    <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  grid:    <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  file:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  fileP:   <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
  check:   <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  bar:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  cal:     <><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  timeline:<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></>,
  users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  building:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  doc:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></>,
  bell:    <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  msg:     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  search:  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  book:    <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  table:   <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
  balance: <><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  upload:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  archive: <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
  ai:      <><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></>,
};

/* ── Groupes de navigation contextuels ─────────────────────── */
// Chaque groupe définit [gauche1, gauche2, droite1, droite2]
// Le centre est toujours le bouton Accueil
const GROUPS = [
  {
    test: p => ["/caisse", "/paiements", "/depenses", "/recettes"].some(r => p.startsWith(r)),
    items: [
      { label: "Caisse",    path: "/caisse",    icon: IC.caisse },
      { label: "Paiements", path: "/paiements", icon: IC.card   },
      { label: "Dépenses",  path: "/depenses",  icon: IC.minus  },
      { label: "Recettes",  path: "/recettes",  icon: IC.plus   },
    ],
  },
  {
    test: p => ["/residences", "/kanban", "/appels-charge", "/groupes", "/personnes", "/lots/", "/fiche-lot", "/details-appel"].some(r => p.startsWith(r)),
    items: [
      { label: "Résidence", path: "/residences",                  icon: IC.building },
      { label: "Lots",      path: "/kanban",                      icon: IC.grid     },
      { label: "Charge",    path: "/appels-charge?filtre=CHARGE", icon: IC.file     },
      { label: "Fond",      path: "/appels-charge?filtre=FOND",   icon: IC.fileP    },
    ],
  },
  {
    test: p => ["/synthese", "/rapport-financier", "/situation-paiements", "/etat-mensuel", "/rapports"].some(r => p.startsWith(r)),
    items: [
      { label: "Synthèse",  path: "/synthese",            icon: IC.check    },
      { label: "Rapport",   path: "/rapport-financier",   icon: IC.bar      },
      { label: "Timeline",  path: "/situation-paiements", icon: IC.timeline },
      { label: "Mensuel",   path: "/etat-mensuel",        icon: IC.cal      },
    ],
  },
  {
    test: p => p.startsWith("/gouvernance") || p.startsWith("/passation"),
    items: [
      { label: "Assemblées", path: "/gouvernance/assemblees",         icon: IC.users    },
      { label: "Bureau",     path: "/gouvernance/bureau",             icon: IC.building },
      { label: "Résolutions",path: "/gouvernance/kanban-resolutions", icon: IC.check    },
      { label: "Documents",  path: "/gouvernance/documents",          icon: IC.file     },
    ],
  },
  {
    test: p => p.startsWith("/espace-resident") || p.startsWith("/gouvernance/notifications"),
    items: [
      { label: "Notifs",       path: "/gouvernance/notifications",    icon: IC.bell   },
      { label: "Messages",     path: "/espace-resident/messages",     icon: IC.msg    },
      { label: "Consultation", path: "/espace-resident/consultation", icon: IC.search },
      { label: "Passation",    path: "/passation-consignes",          icon: IC.settings},
    ],
  },
  {
    test: p => p.startsWith("/comptabilite"),
    items: [
      { label: "Journal",  path: "/comptabilite/journal",     icon: IC.book    },
      { label: "G. Livre", path: "/comptabilite/grand-livre", icon: IC.table   },
      { label: "Balance",  path: "/comptabilite/balance",     icon: IC.balance },
      { label: "Bilan",    path: "/comptabilite/bilan",       icon: IC.monitor },
    ],
  },
  {
    test: p => ["/import", "/export", "/archivage", "/parametrage", "/gestion-utilisateurs", "/initialisation", "/aide", "/ia/"].some(r => p.startsWith(r)),
    items: [
      { label: "Import",    path: "/import",         icon: IC.upload   },
      { label: "Export",    path: "/export",         icon: IC.download },
      { label: "Archivage", path: "/archivage",      icon: IC.archive  },
      { label: "IA",        path: "/parametrage/ia", icon: IC.ai       },
    ],
  },
];

const DEFAULT = [
  { label: "Gestion",   path: "/caisse",     icon: IC.caisse   },
  { label: "Config.",   path: "/residences", icon: IC.grid     },
  { label: "Synthèse",  path: "/synthese",   icon: IC.bar      },
  { label: "Paramèt.",  path: "/archivage",  icon: IC.settings },
];

/* ── Composant ─────────────────────────────────────────────── */
export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const group = GROUPS.find(g => g.test(path));
  const [l1, l2, r1, r2] = group ? group.items : DEFAULT;

  const isActive = (item) => {
    const base = item.path.split("?")[0];
    const q    = item.path.includes("?") ? item.path.split("?")[1] : null;
    if (q) return path === base && location.search === "?" + q;
    return path === base || path.startsWith(base + "/");
  };

  const isHome = path === "/accueil";

  // [l1, l2, null=home, r1, r2]
  const allItems = [l1, l2, null, r1, r2];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50">
      <div className="flex items-end justify-around h-16 px-2 max-w-2xl mx-auto">
        {allItems.map((item, idx) => {
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
          const active = isActive(item);
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

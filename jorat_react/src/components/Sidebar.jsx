import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ── Minimal inline SVG icon ────────────────────────────────
function Icon({ children, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard:    <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  caisse:       <Icon><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h.01M12 15h.01"/></Icon>,
  recettes:     <Icon><path d="M12 19V5M5 12l7-7 7 7"/></Icon>,
  depenses:     <Icon><path d="M12 5v14M19 12l-7 7-7-7"/></Icon>,
  paiements:    <Icon><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Icon>,
  appel_charge: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>,
  appel_fond:   <Icon><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></Icon>,
  rapport:      <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Icon>,
  situation:    <Icon><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>,
  timeline:     <Icon><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></Icon>,
  bureau:       <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  ag:           <Icon><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>,
  resolutions:  <Icon><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>,
  documents:    <Icon><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Icon>,
  residence:    <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  lots:         <Icon><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></Icon>,
  import:       <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Icon>,
  export:       <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Icon>,
  archive:      <Icon><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></Icon>,
  users:        <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  help:         <Icon><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>,
  travaux:      <Icon><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>,
  notif:        <Icon><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>,
  message:      <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>,
  journal:      <Icon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></Icon>,
  grandlivre:   <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></Icon>,
  balance:      <Icon><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon>,
  cpc:          <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Icon>,
  bilan:        <Icon><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Icon>,
  ai:           <Icon><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></Icon>,
};

// ── Nav groups ─────────────────────────────────────────────
// subSections: nested groups within a collapsible section
const BASE_NAV_GROUPS = [
  {
    label: null,
    collapsible: false,
    items: [
      { label: "Tableau de bord", path: "/accueil", exact: true, icon: "dashboard" },
    ],
  },
  {
    label: "Gestion",
    collapsible: true,
    subSections: [
      {
        label: "Finances",
        items: [
          { label: "Caisse",      path: "/caisse",    icon: "caisse"    },
          { label: "Dépenses",    path: "/depenses",  icon: "depenses"  },
          { label: "Cotisations", path: "/paiements", icon: "paiements" },
          { label: "Recettes",    path: "/recettes",  icon: "recettes"  },
          { label: "Contrats",    path: "/contrats",  icon: "rapport"   },
        ],
      },
      {
        label: "Configuration",
        items: [
          { label: "Résidence",       path: "/residences",                  icon: "residence"    },
          { label: "Lots",            path: "/kanban",                      icon: "lots"         },
          { label: "Appel de charge", path: "/appels-charge?filtre=CHARGE", icon: "appel_charge" },
          { label: "Appel de fond",   path: "/appels-charge?filtre=FOND",   icon: "appel_fond"   },
        ],
      },
    ],
  },
  {
    label: "Analyse",
    collapsible: true,
    items: [
      { label: "Synthèse",      path: "/synthese",            icon: "situation" },
      { label: "Timeline",      path: "/situation-paiements", icon: "timeline"  },
      { label: "État mensuel",  path: "/etat-mensuel",        icon: "ag"        },
      { label: "Rapport",       path: "/rapport-financier",   icon: "rapport"   },
    ],
  },
  {
    label: "Gouvernance",
    collapsible: true,
    subSections: [
      {
        label: null,
        items: [
          { label: "Assemblées",      path: "/gouvernance/assemblees",      icon: "ag"          },
          { label: "Bureau syndical", path: "/gouvernance/bureau",          icon: "bureau"      },
          { label: "Résolutions",     path: "/gouvernance/resolutions",     icon: "resolutions" },
          { label: "PV / Passations", path: "/passation-consignes",         icon: "documents"   },
        ],
      },
      {
        label: null,
        items: [
          { label: "Documents",     path: "/gouvernance/documents",     icon: "documents" },
          { label: "Travaux",       path: "/gouvernance/travaux",       icon: "travaux"   },
          { label: "Notifications", path: "/gouvernance/notifications", icon: "notif"     },
          { label: "Messages",      path: "/espace-resident/messages",  icon: "message"   },
        ],
      },
    ],
  },
  {
    label: "Comptabilité",
    collapsible: true,
    items: [
      { label: "Journal",     path: "/comptabilite/journal",     icon: "journal"    },
      { label: "Grand Livre", path: "/comptabilite/grand-livre", icon: "grandlivre" },
      { label: "Balance",     path: "/comptabilite/balance",     icon: "balance"    },
      { label: "CPC",         path: "/comptabilite/cpc",         icon: "cpc"        },
      { label: "Bilan",       path: "/comptabilite/bilan",       icon: "bilan"      },
    ],
  },
  {
    label: "Outils",
    collapsible: true,
    items: [
      { label: "Paramétrage IA", path: "/parametrage/ia", icon: "ai"      },
      { label: "Import",         path: "/import",         icon: "import"  },
      { label: "Export",         path: "/export",         icon: "export"  },
      { label: "Archivage",      path: "/archivage",      icon: "archive" },
    ],
  },
  {
    label: null,
    collapsible: false,
    items: [
      { label: "Aide", path: "/aide", exact: true, icon: "help" },
    ],
  },
];

const ADMIN_ITEMS = [
  { label: "Utilisateurs",            path: "/gestion-utilisateurs", icon: "users"   },
  { label: "Initialisation complète", path: "/initialisation",       icon: "archive" },
];

// ── Helper: collect all items from a group ─────────────────
function collectItems(group) {
  if (group.subSections) return group.subSections.flatMap(s => s.items);
  return group.items || [];
}

// ── Single nav item ────────────────────────────────────────
function NavItem({ item, isActive, onClose }) {
  const navigate = useNavigate();
  const base = "relative flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer select-none overflow-hidden";

  return (
    <div
      onClick={() => { navigate(item.path); onClose(); }}
      className={`${base} ${
        isActive
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-1 bg-indigo-300 rounded-r" />
      )}
      <span className={`shrink-0 transition-colors ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
        {ICONS[item.icon]}
      </span>
      <span className="truncate">{item.label}</span>
    </div>
  );
}

// ── Chevron ────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 200ms ease", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Sidebar ────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const storedUser = JSON.parse(localStorage.getItem("syndic_user") || "null");
  const isAdmin = storedUser?.role === "ADMIN" || storedUser?.role === "SUPER_ADMIN";

  // All sections collapsed by default
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (label) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Inject admin items into Outils
  const navGroups = BASE_NAV_GROUPS.map((group) => {
    if (group.label === "Outils" && isAdmin) {
      return { ...group, items: [...(group.items || []), ...ADMIN_ITEMS] };
    }
    return group;
  });

  const isActive = (item) => {
    if (!item.path) return false;
    if (item.exact) return location.pathname === item.path;
    if (item.path.startsWith("/appels-charge?filtre=")) {
      const itemFiltre = new URLSearchParams(item.path.split("?")[1]).get("filtre");
      const curFiltre  = new URLSearchParams(location.search).get("filtre") || "CHARGE";
      return location.pathname === "/appels-charge" && curFiltre === itemFiltre;
    }
    return location.pathname.startsWith(item.path);
  };

  // Auto-expand the section containing the active route
  useEffect(() => {
    navGroups.forEach((group) => {
      if (!group.collapsible || !group.label) return;
      const items = collectItems(group);
      if (items.some(item => isActive(item))) {
        setOpenSections(prev => ({ ...prev, [group.label]: true }));
      }
    });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside
      className="bg-[#0f172a] flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: isOpen ? "11rem" : "0" }}
    >
      <div className="w-44 h-full flex flex-col">

        {/* ── Brand ── */}
        <div className="h-12 flex items-center px-3.5 border-b border-white/[0.07] flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center mr-2.5 flex-shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-xs leading-tight tracking-wide">SYNDIC PRO</div>
            <div className="text-slate-600 text-[10px] truncate">Gestion copropriété</div>
          </div>
          <button
            onClick={onClose}
            className="ml-1 text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/[0.06] shrink-0"
            aria-label="Fermer le menu"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-2
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:hover:bg-white/20">
          {navGroups.map((group, gi) => {
            const isCollapsible = group.collapsible && group.label;
            const sectionOpen = isCollapsible ? (openSections[group.label] ?? false) : true;

            return (
              <div key={gi} className="mb-1">
                {/* Section header */}
                {group.label && (
                  isCollapsible ? (
                    <button
                      onClick={() => toggleSection(group.label)}
                      className="w-full flex items-center justify-between px-3.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      <span>{group.label}</span>
                      <Chevron open={sectionOpen} />
                    </button>
                  ) : (
                    <div className="px-3.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {group.label}
                    </div>
                  )
                )}

                {/* Flat items (no sub-sections) */}
                {sectionOpen && group.items && !group.subSections && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem key={item.label} item={item} isActive={isActive(item)} onClose={onClose} />
                    ))}
                  </div>
                )}

                {/* Sub-sections (Gestion, Gouvernance) */}
                {sectionOpen && group.subSections && (
                  <div>
                    {group.subSections.map((sub, si) => (
                      <div key={si} className={si > 0 ? "mt-1" : ""}>
                        {/* Sub-section label */}
                        {sub.label ? (
                          <div className="px-3.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500/70">
                            {sub.label}
                          </div>
                        ) : (
                          si > 0 && <div className="mx-3.5 my-1 border-t border-white/[0.05]" />
                        )}
                        <div className="space-y-0.5">
                          {sub.items.map((item) => (
                            <NavItem key={item.label} item={item} isActive={isActive(item)} onClose={onClose} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.06] px-3.5 py-2.5 flex-shrink-0">
          <div className="text-[10px] text-slate-500 text-center">© {new Date().getFullYear()} Syndic Pro</div>
        </div>

      </div>
    </aside>
  );
}

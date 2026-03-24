import { useState } from "react";
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
  notif:        <Icon><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></Icon>,
  message:      <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>,
  consultation: <Icon><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>,
  journal:      <Icon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></Icon>,
  grandlivre:   <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></Icon>,
  balance:      <Icon><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon>,
  cpc:          <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Icon>,
  bilan:        <Icon><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Icon>,
};

// ── Nav groups definition ──────────────────────────────────
const BASE_NAV_GROUPS = [
  {
    label: null,
    collapsible: false,
    items: [
      { label: "Tableau de bord", path: "/accueil", exact: true, icon: "dashboard" },
    ],
  },
  {
    label: "Finances",
    collapsible: true,
    items: [
      { label: "Paiements", path: "/paiements", icon: "paiements" },
      { label: "Dépenses",  path: "/depenses",  icon: "depenses" },
      { label: "Caisse",    path: "/caisse",    icon: "caisse" },
    ],
  },
  {
    label: "Gouvernance",
    collapsible: true,
    items: [
      { label: "Assemblées",         path: "/gouvernance/assemblees",       icon: "ag" },
      { label: "Bureau syndical",    path: "/gouvernance/bureau",           icon: "bureau" },
      { label: "Résolutions",        path: "/gouvernance/resolutions",      icon: "resolutions" },
      { label: "Documents",          path: "/gouvernance/documents",        icon: "documents" },
      { label: "Résolutions / vote", path: "/gouvernance/resolutions-vote", icon: "resolutions" },
      { label: "Travaux",            path: "/gouvernance/travaux",          icon: "travaux" },
      { label: "Notifications",      path: "/gouvernance/notifications",    icon: "notif" },
    ],
  },
  {
    label: "Administration",
    collapsible: true,
    items: [
      { label: "Import",    path: "/import",    icon: "import" },
      { label: "Export",    path: "/export",    icon: "export" },
      { label: "Archivage", path: "/archivage", icon: "archive" },
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
  { label: "Utilisateurs",            path: "/gestion-utilisateurs", icon: "users" },
  { label: "Initialisation complète", path: "/initialisation",       icon: "archive" },
];

// ── Single nav item ────────────────────────────────────────
function NavItem({ item, isActive, onClose }) {
  const navigate = useNavigate();

  const base = "relative flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer select-none overflow-hidden";

  if (item.disabled) {
    return (
      <div className={`${base} text-slate-600 cursor-not-allowed opacity-40`}>
        <span className="text-slate-600 shrink-0">{ICONS[item.icon]}</span>
        <span className="truncate">{item.label}</span>
        <span className="ml-auto text-[10px] text-slate-600 font-normal shrink-0">bientôt</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => { navigate(item.path); onClose(); }}
      className={`${base} ${
        isActive
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      {/* Left accent bar for active item */}
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-1 bg-indigo-300 rounded-r" />
      )}
      <span className={`shrink-0 transition-colors ${isActive ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-200"}`}>
        {ICONS[item.icon]}
      </span>
      <span className="truncate">{item.label}</span>
    </div>
  );
}

// ── Chevron icon ───────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 200ms ease", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Sidebar ────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const storedUser = JSON.parse(localStorage.getItem("syndic_user") || "null");
  const isAdmin = storedUser?.role === "ADMIN" || storedUser?.role === "SUPER_ADMIN";

  // Track open/closed state for collapsible sections
  const [openSections, setOpenSections] = useState({ Finances: true, "Espace Résident": true, "Administration": true });

  const toggleSection = (label) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Inject admin items into Administration
  const navGroups = BASE_NAV_GROUPS.map((group) => {
    if (group.label === "Administration" && isAdmin) {
      return { ...group, items: [...group.items, ...ADMIN_ITEMS] };
    }
    return group;
  });

  const isActive = (item) => {
    if (!item.path) return false;
    if (item.exact) return location.pathname === item.path;

    // Appel de charge vs Appel de fond : distinguish by filtre query param
    if (item.path.startsWith("/appels-charge?filtre=")) {
      const itemFiltre = new URLSearchParams(item.path.split("?")[1]).get("filtre");
      const curFiltre  = new URLSearchParams(location.search).get("filtre") || "CHARGE";
      return location.pathname === "/appels-charge" && curFiltre === itemFiltre;
    }

    return location.pathname.startsWith(item.path);
  };

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
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:hover:bg-white/20">
        {navGroups.map((group, gi) => {
          const isCollapsible = group.collapsible && group.label;
          const isOpen = isCollapsible ? (openSections[group.label] ?? true) : true;

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
                    <Chevron open={isOpen} />
                  </button>
                ) : (
                  <div className="px-3.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {group.label}
                  </div>
                )
              )}

              {/* Items */}
              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.label} item={item} isActive={isActive(item)} onClose={onClose} />
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

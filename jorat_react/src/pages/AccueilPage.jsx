import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── NavCard — grid button ─────────────────────────────────── */
function NavCard({ onClick, icon, label, accent = "blue" }) {
  const themes = {
    blue:   { bg: "bg-blue-50/50",    wrap: "border-blue-100 hover:border-blue-300 hover:bg-blue-50 hover:shadow-blue-100",       pill: "bg-blue-100 group-hover:bg-blue-200",     ico: "text-blue-600"   },
    emerald:{ bg: "bg-emerald-50/50", wrap: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-emerald-100", pill: "bg-emerald-100 group-hover:bg-emerald-200", ico: "text-emerald-600" },
    violet: { bg: "bg-violet-50/50",  wrap: "border-violet-100 hover:border-violet-300 hover:bg-violet-50 hover:shadow-violet-100",   pill: "bg-violet-100 group-hover:bg-violet-200",   ico: "text-violet-600"  },
    indigo: { bg: "bg-indigo-50/50",  wrap: "border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-indigo-100",   pill: "bg-indigo-100 group-hover:bg-indigo-200",   ico: "text-indigo-600"  },
    sky:    { bg: "bg-sky-50/50",     wrap: "border-sky-100 hover:border-sky-300 hover:bg-sky-50 hover:shadow-sky-100",           pill: "bg-sky-100 group-hover:bg-sky-200",         ico: "text-sky-600"    },
    teal:   { bg: "bg-teal-50/50",   wrap: "border-teal-100 hover:border-teal-300 hover:bg-teal-50 hover:shadow-teal-100",       pill: "bg-teal-100 group-hover:bg-teal-200",       ico: "text-teal-600"   },
    amber:  { bg: "bg-amber-50/50",  wrap: "border-amber-100 hover:border-amber-300 hover:bg-amber-50 hover:shadow-amber-100",   pill: "bg-amber-100 group-hover:bg-amber-200",     ico: "text-amber-600"  },
  };
  const t = themes[accent] || themes.blue;
  return (
    <button onClick={onClick}
      className={`group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl ${t.bg} border shadow-sm hover:shadow-md ${t.wrap} hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-200 ease-out w-full`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${t.pill}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={t.ico} style={{ width: 19, height: 19 }}>
          {icon}
        </svg>
      </div>
      <span className="text-[11px] font-semibold text-slate-800 text-center leading-snug">{label}</span>
    </button>
  );
}

/* ── ActionCard — horizontal featured card ─────────────────── */
function ActionCard({ onClick, icon, label, sub, accent = "emerald", featured = false }) {
  const themes = {
    emerald: {
      wrap:    "border-emerald-200 hover:border-emerald-400 hover:shadow-md",
      bg:      "bg-emerald-50/60",
      bgHover: "hover:bg-emerald-50",
      pill:    "bg-emerald-100 group-hover:bg-emerald-200",
      ico:     "text-emerald-700",
      arr:     "group-hover:text-emerald-600",
      sub:     "text-emerald-700",
    },
    teal: {
      wrap:    "border-teal-200 hover:border-teal-400 hover:shadow-md",
      bg:      "bg-teal-50/60",
      bgHover: "hover:bg-teal-50",
      pill:    "bg-teal-100 group-hover:bg-teal-200",
      ico:     "text-teal-700",
      arr:     "group-hover:text-teal-600",
      sub:     "text-teal-700",
    },
    amber: {
      wrap:    "border-amber-200 hover:border-amber-400 hover:shadow-md",
      bg:      "bg-amber-50/60",
      bgHover: "hover:bg-amber-50",
      pill:    "bg-amber-100 group-hover:bg-amber-200",
      ico:     "text-amber-700",
      arr:     "group-hover:text-amber-600",
      sub:     "text-amber-700",
    },
    blue: {
      wrap:    "border-blue-200 hover:border-blue-400 hover:shadow-md",
      bg:      "bg-blue-50/60",
      bgHover: "hover:bg-blue-50",
      pill:    "bg-blue-100 group-hover:bg-blue-200",
      ico:     "text-blue-700",
      arr:     "group-hover:text-blue-600",
      sub:     "text-blue-700",
    },
    indigo: {
      wrap:    "border-indigo-200 hover:border-indigo-400 hover:shadow-md",
      bg:      "bg-indigo-50/60",
      bgHover: "hover:bg-indigo-50",
      pill:    "bg-indigo-100 group-hover:bg-indigo-200",
      ico:     "text-indigo-700",
      arr:     "group-hover:text-indigo-600",
      sub:     "text-indigo-700",
    },
  };
  const t = themes[accent] || themes.emerald;
  return (
    <button onClick={onClick}
      className={`group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border shadow-sm ${t.wrap} ${t.bg} ${t.bgHover} hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-out`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 shadow-sm ${t.pill}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
          className={t.ico} style={{ width: 17, height: 17 }}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-bold text-slate-800 leading-tight">{label}</div>
        {sub && <div className={`text-[10px] mt-0.5 leading-tight font-medium ${t.sub}`}>{sub}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className={`flex-shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 ${t.arr}`} style={{ width: 15, height: 15 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

/* ── SectionCard wrapper ───────────────────────────────────── */
function SectionCard({ label, dot = "blue", children, featured = false }) {
  const themes = {
    blue:    { dot: "bg-blue-500",    border: "border-blue-200",    hdr: "bg-blue-50/70 border-b border-blue-100",    shadow: "shadow-blue-100/60"   },
    emerald: { dot: "bg-emerald-500", border: "border-emerald-300", hdr: "bg-emerald-50 border-b border-emerald-200", shadow: "shadow-emerald-100/80" },
    amber:   { dot: "bg-amber-500",   border: "border-amber-200",   hdr: "bg-amber-50/70 border-b border-amber-100",  shadow: "shadow-amber-100/60"   },
    indigo:  { dot: "bg-indigo-500",  border: "border-indigo-200",  hdr: "bg-indigo-50/70 border-b border-indigo-100",shadow: "shadow-indigo-100/60"  },
    sky:     { dot: "bg-sky-500",     border: "border-sky-200",     hdr: "bg-sky-50/70 border-b border-sky-100",      shadow: "shadow-sky-100/60"     },
    violet:  { dot: "bg-violet-500",  border: "border-violet-200",  hdr: "bg-violet-50/70 border-b border-violet-100",shadow: "shadow-violet-100/60"  },
    teal:    { dot: "bg-teal-500",    border: "border-teal-200",    hdr: "bg-teal-50/70 border-b border-teal-100",    shadow: "shadow-teal-100/60"    },
  };
  const t = themes[dot] || themes.blue;
  return (
    <div className={`bg-white rounded-2xl overflow-hidden border-2 ${t.border} shadow-md ${t.shadow}`}>
      <div className={`flex items-center gap-2.5 px-4 py-3 ${t.hdr}`}>
        <span className={`w-2 h-2 rounded-full ${t.dot}`} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
        {featured && (
          <span className="ml-auto text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white tracking-wide uppercase">Prioritaire</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AccueilPage() {
  const navigate = useNavigate();
  const [residence, setResidence] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/residences/", { credentials: "include" })
      .then(r => {
        if (r.status === 401 || r.status === 403) { navigate("/login"); return null; }
        return r.ok ? r.json() : [];
      })
      .then(data => {
        if (!data) return;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        if (list.length === 0) { navigate("/login"); return; }
        setResidence(list[0]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence) return null;

  const adresse = [residence.adresse_residence, residence.ville_residence, residence.code_postal_residence]
    .filter(Boolean).join(" — ");

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-6">

      {/* ── Hero résidence ──────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_8px_32px_-6px_rgba(79,70,229,0.32)] border border-indigo-900/25">

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-800 to-[#1a1740] px-5 pt-6 pb-7 overflow-hidden">
          {/* Dot texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          {/* Glow blobs */}
          <div className="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-32 h-20 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Logo */}
            <div className="shrink-0">
              {residence.logo ? (
                <img src={residence.logo} alt="Logo résidence"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white/10 border-2 border-white/25 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.3)]" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/8 border-2 border-white/15 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Text info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide ${
                  residence.statut_residence === "ACTIF"
                    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/35"
                    : "bg-red-400/20 text-red-200 border border-red-400/35"
                }`}>
                  {residence.statut_residence}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight tracking-tight"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
                {residence.nom_residence}
              </h1>
              {adresse && (
                <p className="text-indigo-200/75 text-xs sm:text-sm mt-1.5 font-medium leading-snug">{adresse}</p>
              )}
              {residence.email && (
                <a href={`mailto:${residence.email}`}
                  className="text-yellow-300 text-xs mt-2 hover:text-yellow-100 transition-colors inline-flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {residence.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="bg-[#15123a] px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/[0.06]">
          {residence.nombre_lots != null && (
            <div className="flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="text-yellow-300 text-[11px]">
                <span className="font-bold text-yellow-200">{residence.nombre_lots}</span>
                {" "}lot{residence.nombre_lots > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-yellow-300 text-[11px]">Syndic Pro · {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Description */}
        {residence.description && (
          <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">{residence.description}</p>
          </div>
        )}
      </div>

      {/* ── Configuration ──────────────────────────── */}
      <SectionCard label="Configuration" dot="blue">
        <div className="p-3 grid grid-cols-2 gap-2.5">
          <NavCard accent="blue" onClick={() => navigate("/residences")} label="Résidence"
            icon={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />
          <NavCard accent="blue" onClick={() => navigate("/kanban")} label="Lots"
            icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>} />
          <NavCard accent="blue" onClick={() => navigate("/appels-charge?filtre=CHARGE")} label="Appel de charge"
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />
          <NavCard accent="blue" onClick={() => navigate("/appels-charge?filtre=FOND")} label="Appel de fond"
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>} />
        </div>
      </SectionCard>

      {/* ── Suivi financier — point focal ──────────── */}
      <SectionCard label="Suivi financier" dot="emerald" featured>
        <div className="p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <NavCard accent="emerald" onClick={() => navigate("/synthese")} label="Suivi paiements"
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
            <NavCard accent="emerald" onClick={() => navigate("/rapport-financier")} label="Rapport financier"
              icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
          </div>
          <ActionCard accent="teal" featured onClick={() => navigate("/situation-paiements")}
            label="Analyse Paiements — Timeline"
            sub="Couverture mois par mois par lot"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></>} />
          <ActionCard accent="emerald" onClick={() => navigate("/etat-mensuel")}
            label="État mensuel — Entrées / Sorties"
            sub="Tableau croisé lot × 12 mois"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
        </div>
      </SectionCard>

      {/* ── Gouvernance ────────────────────────────── */}
      <SectionCard label="Gouvernance" dot="amber">
        <div className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <NavCard accent="amber" onClick={() => navigate("/gouvernance/assemblees")} label="Assemblée Générale"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
          <NavCard accent="amber" onClick={() => navigate("/gouvernance/documents")} label="Documents"
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
          <NavCard accent="amber" onClick={() => navigate("/gouvernance/travaux")} label="Événements"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
          <NavCard accent="amber" onClick={() => navigate("/gouvernance/kanban-resolutions")} label="Résolutions"
            icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
          <NavCard accent="amber" onClick={() => navigate("/passation-consignes")} label="Passation"
            icon={<><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/><path d="M15 5l4 4"/></>} />
        </div>
      </SectionCard>

      {/* ── Espace Résident ────────────────────────── */}
      <SectionCard label="Espace Résident" dot="indigo">
        <div className="p-3 grid grid-cols-3 gap-2.5">
          <NavCard accent="indigo" onClick={() => navigate("/gouvernance/notifications")} label="Notifications"
            icon={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
          <NavCard accent="indigo" onClick={() => navigate("/espace-resident/messages")} label="Messages"
            icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />
          <NavCard accent="indigo" onClick={() => navigate("/espace-resident/consultation")} label="Vue Résident"
            icon={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
        </div>
      </SectionCard>

      {/* ── Comptabilité ───────────────────────────── */}
      <SectionCard label="Comptabilité" dot="sky">
        <div className="p-3 grid grid-cols-3 gap-2.5">
          <NavCard accent="sky" onClick={() => navigate("/comptabilite/journal")} label="Journal"
            icon={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></>} />
          <NavCard accent="sky" onClick={() => navigate("/comptabilite/grand-livre")} label="Grand Livre"
            icon={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>} />
          <NavCard accent="sky" onClick={() => navigate("/comptabilite/balance")} label="Balance"
            icon={<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />
          <NavCard accent="sky" onClick={() => navigate("/comptabilite/cpc")} label="CPC"
            icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
          <NavCard accent="sky" onClick={() => navigate("/comptabilite/bilan")} label="Bilan"
            icon={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />
        </div>
      </SectionCard>

    </div>
  );
}

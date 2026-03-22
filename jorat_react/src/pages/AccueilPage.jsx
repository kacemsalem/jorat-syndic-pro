import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── reusable icon card button (grid) ─────────────────────── */
function NavCard({ onClick, icon, label, accent = "blue" }) {
  const themes = {
    blue:   { wrap: "hover:border-blue-200  hover:shadow-[0_8px_20px_-4px_rgba(59,130,246,0.18)]",  pill: "bg-blue-50  group-hover:bg-blue-100",  ico: "text-blue-600"   },
    emerald:{ wrap: "hover:border-emerald-200 hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.16)]", pill: "bg-emerald-50 group-hover:bg-emerald-100", ico: "text-emerald-600" },
    violet: { wrap: "hover:border-violet-200 hover:shadow-[0_8px_20px_-4px_rgba(139,92,246,0.16)]", pill: "bg-violet-50 group-hover:bg-violet-100", ico: "text-violet-600"  },
    indigo: { wrap: "hover:border-indigo-200 hover:shadow-[0_8px_20px_-4px_rgba(99,102,241,0.16)]", pill: "bg-indigo-50 group-hover:bg-indigo-100", ico: "text-indigo-600"  },
    sky:    { wrap: "hover:border-sky-200    hover:shadow-[0_8px_20px_-4px_rgba(14,165,233,0.15)]",  pill: "bg-sky-50    group-hover:bg-sky-100",    ico: "text-sky-600"    },
  };
  const t = themes[accent] || themes.blue;
  return (
    <button onClick={onClick}
      className={`group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl bg-white border border-slate-100 ${t.wrap} hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 w-full`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${t.pill}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          className={`w-4.5 h-4.5 ${t.ico}`} style={{ width: 18, height: 18 }}>
          {icon}
        </svg>
      </div>
      <span className="text-[11px] font-semibold text-slate-600 text-center leading-snug">{label}</span>
    </button>
  );
}

/* ── wide horizontal action card ──────────────────────────── */
function ActionCard({ onClick, icon, label, sub, accent = "emerald" }) {
  const themes = {
    emerald:{ wrap: "hover:border-emerald-200 hover:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.14)]", pill: "bg-emerald-50 group-hover:bg-emerald-100", ico: "text-emerald-600", arr: "group-hover:text-emerald-400" },
    blue:   { wrap: "hover:border-blue-200   hover:shadow-[0_6px_16px_-4px_rgba(59,130,246,0.14)]",  pill: "bg-blue-50   group-hover:bg-blue-100",   ico: "text-blue-600",   arr: "group-hover:text-blue-400"   },
    indigo: { wrap: "hover:border-indigo-200 hover:shadow-[0_6px_16px_-4px_rgba(99,102,241,0.14)]", pill: "bg-indigo-50 group-hover:bg-indigo-100", ico: "text-indigo-600", arr: "group-hover:text-indigo-400" },
  };
  const t = themes[accent] || themes.emerald;
  return (
    <button onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white border border-slate-100 ${t.wrap} hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${t.pill}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          className={t.ico} style={{ width: 16, height: 16 }}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-semibold text-slate-700 leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className={`flex-shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 ${t.arr}`} style={{ width: 14, height: 14 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

/* ── section wrapper ───────────────────────────────────────── */
function SectionCard({ label, dot, children }) {
  const dots = { blue: "bg-blue-400", emerald: "bg-emerald-400", violet: "bg-violet-400", indigo: "bg-indigo-400", sky: "bg-sky-400" };
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50">
        <span className={`w-1.5 h-1.5 rounded-full ${dots[dot] || dots.blue}`} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
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
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setResidence(list[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence) return (
    <div className="max-w-xl mx-auto mt-16 text-center text-slate-400">
      <p className="text-lg font-semibold">Aucune résidence assignée.</p>
    </div>
  );

  const adresse = [residence.adresse_residence, residence.ville_residence, residence.code_postal_residence]
    .filter(Boolean).join(" — ");

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-4">

      {/* ── Hero résidence ──────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_4px_24px_-4px_rgba(79,70,229,0.25)] border border-indigo-900/20">

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-indigo-700 via-indigo-800 to-[#1e1b4b] px-5 pt-6 pb-7 overflow-hidden">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          {/* Glow blob */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Logo */}
            <div className="shrink-0">
              {residence.logo ? (
                <img src={residence.logo} alt="Logo résidence"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white/10 border-2 border-white/20 p-2 shadow-xl" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/8 border-2 border-white/15 flex items-center justify-center shadow-xl backdrop-blur-sm">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Text info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-2.5">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide ${
                  residence.statut_residence === "ACTIF"
                    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                    : "bg-red-400/20 text-red-200 border border-red-400/30"
                }`}>
                  {residence.statut_residence}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">
                {residence.nom_residence}
              </h1>
              {adresse && (
                <p className="text-indigo-200/80 text-xs sm:text-sm mt-1.5 font-medium leading-snug">{adresse}</p>
              )}
              {residence.email && (
                <a href={`mailto:${residence.email}`}
                  className="text-indigo-300/70 text-xs mt-1.5 hover:text-white transition-colors inline-flex items-center gap-1.5">
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
        <div className="bg-[#1e1b4b]/95 px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/5">
          {residence.nombre_lots != null && (
            <div className="flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="text-indigo-300/70 text-[11px]">
                <span className="font-bold text-white">{residence.nombre_lots}</span>
                {" "}lot{residence.nombre_lots > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-indigo-300/70 text-[11px]">Syndic Pro · {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Description */}
        {residence.description && (
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">{residence.description}</p>
          </div>
        )}
      </div>

      {/* ── Configuration ─────────────────────────────── */}
      <SectionCard label="Configuration" dot="blue">
        <div className="p-3 grid grid-cols-2 gap-2">
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

      {/* ── Suivi ─────────────────────────────────────── */}
      <SectionCard label="Suivi financier" dot="emerald">
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <NavCard accent="emerald" onClick={() => navigate("/synthese")} label="Suivi paiements"
              icon={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>} />
            <NavCard accent="emerald" onClick={() => navigate("/rapport-financier")} label="Rapport financier"
              icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
          </div>
          <ActionCard accent="emerald" onClick={() => navigate("/situation-paiements")}
            label="Analyse Paiements — Timeline"
            sub="Couverture mois par mois par lot"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></>} />
          <ActionCard accent="emerald" onClick={() => navigate("/etat-mensuel")}
            label="État mensuel — Entrées / Sorties"
            sub="Tableau croisé lot × 12 mois"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
        </div>
      </SectionCard>

      {/* ── Gouvernance ───────────────────────────────── */}
      <SectionCard label="Gouvernance" dot="violet">
        <div className="p-3 grid grid-cols-3 gap-2">
          <NavCard accent="violet" onClick={() => navigate("/gouvernance/assemblees")} label="Assemblée Générale"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
          <NavCard accent="violet" onClick={() => navigate("/gouvernance/documents")} label="Documents"
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />
          <NavCard accent="violet" onClick={() => navigate("/gouvernance/travaux")} label="Événements"
            icon={<><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
        </div>
      </SectionCard>

      {/* ── Espace Résident ───────────────────────────── */}
      <SectionCard label="Espace Résident" dot="indigo">
        <div className="p-3 grid grid-cols-3 gap-2">
          <NavCard accent="indigo" onClick={() => navigate("/gouvernance/notifications")} label="Notifications"
            icon={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
          <NavCard accent="indigo" onClick={() => navigate("/espace-resident/messages")} label="Messages"
            icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />
          <NavCard accent="indigo" onClick={() => navigate("/espace-resident/consultation")} label="Vue Résident"
            icon={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
        </div>
      </SectionCard>

      {/* ── Comptabilité ──────────────────────────────── */}
      <SectionCard label="Comptabilité" dot="sky">
        <div className="divide-y divide-slate-50/80">
          {[
            { label: "Journal",     path: "/comptabilite/journal",     icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/></> },
            { label: "Grand Livre", path: "/comptabilite/grand-livre", icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></> },
            { label: "Balance",     path: "/comptabilite/balance",     icon: <><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
            { label: "CPC",         path: "/comptabilite/cpc",         icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
            { label: "Bilan",       path: "/comptabilite/bilan",       icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></> },
          ].map(({ label, path, icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className="group w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sky-50/60 transition-colors duration-150 last:rounded-b-2xl">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors duration-150">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  className="text-sky-600" style={{ width: 14, height: 14 }}>
                  {icon}
                </svg>
              </div>
              <span className="flex-1 text-xs font-semibold text-slate-600 text-left">{label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-300 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" style={{ width: 13, height: 13 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}

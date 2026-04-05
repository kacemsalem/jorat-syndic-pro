import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Card ──────────────────────────────────────────────────────────────────────
function SectionCard({ onClick, icon, label, description, topGradient, iconBg, iconColor, accentText, soon }) {
  return (
    <button
      onClick={soon ? undefined : onClick}
      className={`w-full h-full flex flex-col bg-white rounded-2xl shadow-sm text-left overflow-hidden transition-all duration-150 ${
        soon ? "cursor-default opacity-90" : "hover:shadow-lg active:scale-[0.98] cursor-pointer"
      }`}
    >
      {/* Top accent gradient */}
      <div className={`h-[5px] w-full ${topGradient}`} />

      {/* Card body */}
      <div className="flex-1 flex flex-col p-5 gap-4">

        {/* Badge BIENTÔT */}
        {soon && (
          <div className="self-end -mt-1 -mr-1">
            <span className="text-[9px] font-bold tracking-widest text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              BIENTÔT
            </span>
          </div>
        )}

        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            {icon}
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-[17px] font-bold text-slate-800 leading-tight">{label}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">{description}</p>
        </div>

        {/* Accéder / Bientôt */}
        {!soon && (
          <p className={`text-sm font-semibold ${accentText} flex items-center gap-1`}>
            Accéder <span className="text-base leading-none">›</span>
          </p>
        )}
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AccueilPage() {
  const navigate   = useNavigate();
  const [residence, setResidence] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/residences/", { credentials: "include" })
      .then(r => {
        if (r.status === 401 || r.status === 403) { navigate("/login"); return null; }
        return r.ok ? r.json() : null;
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
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence) return null;

  const adresse = [residence.adresse_residence, residence.ville_residence, residence.code_postal_residence]
    .filter(Boolean).join(" · ");

  const CARDS = [
    {
      label:       "Gestion",
      description: "Finances, lots, appels, suivi",
      onClick:     () => navigate("/gestion"),
      topGradient: "bg-gradient-to-r from-cyan-400 to-blue-500",
      iconBg:      "bg-blue-50",
      iconColor:   "#3B82F6",
      accentText:  "text-blue-500",
      icon: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></>,
    },
    {
      label:       "Dépenses",
      description: "Recettes & dépenses",
      onClick:     () => navigate("/depenses"),
      topGradient: "bg-gradient-to-r from-amber-400 to-orange-500",
      iconBg:      "bg-amber-50",
      iconColor:   "#F59E0B",
      accentText:  "text-amber-500",
      icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    },
    {
      label:       "Comptabilité",
      description: "Journaux & bilans",
      onClick:     () => navigate("/comptabilite"),
      topGradient: "bg-gradient-to-r from-violet-400 to-purple-500",
      iconBg:      "bg-violet-50",
      iconColor:   "#8B5CF6",
      accentText:  "text-violet-500",
      soon:        true,
      icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>,
    },
    {
      label:       "Gouvernance",
      description: "Rapports & documents",
      onClick:     () => navigate("/gouvernance"),
      topGradient: "bg-gradient-to-r from-pink-400 to-rose-500",
      iconBg:      "bg-pink-50",
      iconColor:   "#EC4899",
      accentText:  "text-pink-500",
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    },
  ];

  return (
    <div className="bg-slate-100 flex flex-col min-h-screen -m-3 sm:-m-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-8">
        <div className="flex items-center gap-3">
          {residence.logo ? (
            <img src={residence.logo} alt="logo"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shadow-md" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shadow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[9px] font-bold uppercase tracking-wider">Syndic Pro</p>
            <h1 className="text-white font-bold text-[15px] truncate leading-tight">{residence.nom_residence}</h1>
            {adresse && <p className="text-white/60 text-[10px] mt-0.5 truncate">{adresse}</p>}
          </div>
          {residence.nombre_lots != null && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center border border-white/20">
              <p className="text-white font-bold text-base leading-none">{residence.nombre_lots}</p>
              <p className="text-white/70 text-[9px] mt-0.5">lots</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
            residence.statut_residence === "ACTIF"
              ? "bg-emerald-400/25 text-emerald-100 border border-emerald-300/40"
              : "bg-red-400/25 text-red-100 border border-red-300/40"
          }`}>{residence.statut_residence}</span>
          {residence.email && <span className="text-white/50 text-[10px]">{residence.email}</span>}
        </div>
      </div>

      {/* ── Cartes ──────────────────────────────────────────────── */}
      <div className="flex flex-col px-4 -mt-4 pb-4 sm:flex-1">

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 sm:flex-1" style={{ gridAutoRows: "auto" }}>
          {CARDS.map(card => (
            <SectionCard key={card.label} {...card} />
          ))}
        </div>

        {/* Boutons ronds secondaires */}
        <div className="flex justify-center gap-10 mt-5">
          <button onClick={() => navigate("/outils")}
            className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:shadow-md group-active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">Outils</span>
          </button>

          <button onClick={() => navigate("/ia/chat")}
            className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-violet-50 shadow-sm border border-violet-200 flex items-center justify-center group-hover:shadow-md group-active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <circle cx="9" cy="14" r="1" fill="#7C3AED" stroke="none"/>
                <circle cx="15" cy="14" r="1" fill="#7C3AED" stroke="none"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold text-violet-600">IA</span>
          </button>

          <button onClick={() => navigate("/aide")}
            className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:shadow-md group-active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">Aide</span>
          </button>
        </div>

      </div>
    </div>
  );
}

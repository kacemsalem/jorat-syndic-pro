import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function SectionCard({ onClick, icon, label, description, color }) {
  return (
    <button onClick={onClick}
      className="w-full flex flex-col items-start gap-3 p-4 bg-white rounded-2xl shadow-sm
                 hover:shadow-md active:scale-[0.97] transition-all duration-150 text-left">
      <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          {icon}
        </svg>
      </div>
      <div className="flex-1 min-w-0 w-full">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{description}</p>
      </div>
      <div className="self-end">
        <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

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

  return (
    <div className="bg-slate-100 flex flex-col min-h-screen -m-3 sm:-m-6">

      {/* ── Header bleu dégradé ──────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-12">
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
            <h1 className="text-white font-bold text-[15px] truncate leading-tight">
              {residence.nom_residence}
            </h1>
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

      {/* ── Cartes + boutons secondaires ─────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-4 -mt-6 pb-24">

        {/* 4 cartes principales */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <SectionCard
            onClick={() => navigate("/gestion")}
            label="Gestion"
            description="Finances, lots, appels, suivi"
            color="bg-blue-600"
            icon={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>}
          />
          <SectionCard
            onClick={() => navigate("/gouvernance")}
            label="Gouvernance"
            description="Assemblées, résolutions, documents"
            color="bg-indigo-600"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          />
          <SectionCard
            onClick={() => navigate("/comptabilite")}
            label="Comptabilité"
            description="Journal, grand livre, bilans"
            color="bg-violet-600"
            icon={<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>}
          />
          <SectionCard
            onClick={() => navigate("/analyse")}
            label="Analyse"
            description="Suivi, rapports, graphes"
            color="bg-sky-600"
            icon={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
          />
        </div>

        {/* Outils + Aide — boutons ronds */}
        <div className="flex justify-center gap-10 mt-6">
          <button onClick={() => navigate("/outils")}
            className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:shadow-md group-active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">Outils</span>
          </button>

          <button onClick={() => navigate("/aide")}
            className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:shadow-md group-active:scale-95 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
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

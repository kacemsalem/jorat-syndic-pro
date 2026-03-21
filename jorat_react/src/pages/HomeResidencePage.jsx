import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function StatCard({ icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
    emerald:"bg-emerald-50 border-emerald-100 text-emerald-600",
    sky:    "bg-sky-50 border-sky-100 text-sky-600",
    amber:  "bg-amber-50 border-amber-100 text-amber-600",
  };
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <div className="shrink-0 w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <p className="font-bold text-slate-800 text-base leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] opacity-60 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, color }) {
  const cls = {
    blue:    "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    violet:  "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
    indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    sky:     "bg-sky-50    text-sky-700    border-sky-200    hover:bg-sky-100",
    amber:   "bg-amber-50  text-amber-700  border-amber-200  hover:bg-amber-100",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold hover:shadow-md transition ${cls[color] || cls.indigo}`}
    >
      {icon}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

export default function HomeResidencePage() {
  const navigate = useNavigate();
  const [residence, setResidence] = useState(null);
  const [bureau,    setBureau]    = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/residences/", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setResidence(list[0] ?? null);
      })
      .finally(() => setLoading(false));

    fetch("/api/mandats-bureau/?actif=true", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        if (list.length > 0) setBureau(list[0]);
      })
      .catch(() => {});
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── Hero ── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-indigo-100">
        {/* Gradient top band */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 px-6 pt-7 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

            {/* Logo */}
            <div className="shrink-0">
              {residence.logo ? (
                <img
                  src={residence.logo}
                  alt="Logo résidence"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain bg-white/10 border-2 border-white/30 p-2 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border-2 border-white/30 flex items-center justify-center shadow-lg">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  residence.statut_residence === "ACTIF"
                    ? "bg-emerald-400/30 text-emerald-100 border border-emerald-400/40"
                    : "bg-red-400/30 text-red-100 border border-red-400/40"
                }`}>
                  {residence.statut_residence}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {residence.nom_residence}
              </h1>
              {adresse && (
                <p className="text-indigo-200 text-sm mt-1.5 font-medium">{adresse}</p>
              )}
              {residence.email && (
                <a href={`mailto:${residence.email}`}
                  className="text-indigo-300 text-xs mt-1 hover:text-white transition inline-block">
                  {residence.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats bottom strip */}
        <div className="bg-indigo-900/95 px-6 py-3 flex flex-wrap gap-x-8 gap-y-1">
          {residence.nombre_lots != null && (
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="text-indigo-200 text-xs">
                <span className="font-bold text-white">{residence.nombre_lots}</span>
                {" "}lot{residence.nombre_lots > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {bureau && (
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              <span className="text-indigo-200 text-xs">
                Bureau actif
                {bureau.date_fin ? ` · jusqu'au ${String(bureau.date_fin).slice(0, 10)}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {residence.description && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{residence.description}</p>
        </div>
      )}

      {/* ── Bureau syndical ── */}
      {bureau?.membres?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3">Bureau syndical</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {bureau.membres.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 bg-violet-50 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                  {(m.personne_nom || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {m.personne_prenom || ""} {m.personne_nom || ""}
                  </p>
                  <p className="text-[11px] text-violet-600 truncate">
                    {m.fonction_label || m.fonction || ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Accès rapide ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider px-1">Accès rapide</p>

        {/* Configuration */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-1 mb-1.5">Configuration</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <QuickBtn color="blue" onClick={() => navigate("/residences")} label="Résidence"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            />
            <QuickBtn color="blue" onClick={() => navigate("/kanban")} label="Lots"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>}
            />
            <QuickBtn color="blue" onClick={() => navigate("/appels-charge?filtre=CHARGE")} label="Appel de charge"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
            />
            <QuickBtn color="blue" onClick={() => navigate("/appels-charge?filtre=FOND")} label="Appel de fond"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>}
            />
          </div>
        </div>

        {/* Suivi */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-1 mb-1.5">Suivi</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <QuickBtn color="emerald" onClick={() => navigate("/paiements")} label="Paiements"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            />
            <QuickBtn color="emerald" onClick={() => navigate("/synthese")} label="Suivi paiements"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
            />
            <QuickBtn color="emerald" onClick={() => navigate("/rapport-financier")} label="Rapport financier"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
            />
          </div>
        </div>

        {/* Espace résident */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-1 mb-1.5">Espace Résident</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <QuickBtn color="indigo" onClick={() => navigate("/espace-resident/messages")} label="Messages"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            />
            <QuickBtn color="indigo" onClick={() => navigate("/espace-resident/consultation")} label="Vue résident"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
            />
            <QuickBtn color="indigo" onClick={() => navigate("/gouvernance/notifications")} label="Notifications"
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

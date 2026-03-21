import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 text-right">{value}</span>
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
    <div className="max-w-xl mx-auto space-y-4">

      {/* ── Fiche résidence ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
          {residence.logo ? (
            <img
              src={residence.logo}
              alt="logo"
              className="h-14 w-14 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1.5 flex-shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">{residence.nom_residence}</h1>
            {adresse && <p className="text-xs text-slate-500 mt-0.5 truncate">{adresse}</p>}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
            residence.statut_residence === "ACTIF" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}>
            {residence.statut_residence}
          </span>
        </div>
        <div className="px-5 py-1">
          <InfoRow label="Nombre de lots" value={residence.nombre_lots != null ? `${residence.nombre_lots} lot${residence.nombre_lots > 1 ? "s" : ""}` : null} />
          {residence.description && (
            <div className="py-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{residence.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Configuration ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Configuration</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate("/residences")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span className="text-xs font-semibold">Résidence</span>
          </button>
          <button onClick={() => navigate("/kanban")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span className="text-xs font-semibold">Lots</span>
          </button>
          <button onClick={() => navigate("/appels-charge?filtre=CHARGE")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span className="text-xs font-semibold">Appel de charge</span>
          </button>
          <button onClick={() => navigate("/appels-charge?filtre=FOND")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span className="text-xs font-semibold">Appel de fond</span>
          </button>
        </div>
      </div>

      {/* ── Suivi ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Suivi</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate("/synthese")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span className="text-xs font-semibold">Suivi paiements</span>
          </button>
          <button onClick={() => navigate("/rapport-financier")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span className="text-xs font-semibold">Rapport financier</span>
          </button>
        </div>
        <button onClick={() => navigate("/situation-paiements")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/>
          </svg>
          <span className="text-xs font-semibold">Analyse Paiements — Timeline</span>
        </button>
      </div>

      {/* ── Gouvernance ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Gouvernance</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => navigate("/gouvernance/assemblees")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-xs font-semibold">Assemblée Générale</span>
          </button>
          <button onClick={() => navigate("/gouvernance/documents")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs font-semibold">Documents</span>
          </button>
          <button onClick={() => navigate("/gouvernance/travaux")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-xs font-semibold">Événements</span>
          </button>
        </div>
      </div>

      {/* ── Comptabilité ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Comptabilité</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Journal",     path: "/comptabilite/journal"     },
            { label: "Grand Livre", path: "/comptabilite/grand-livre" },
            { label: "Balance",     path: "/comptabilite/balance"     },
            { label: "CPC",         path: "/comptabilite/cpc"         },
            { label: "Bilan",       path: "/comptabilite/bilan"       },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="flex items-center justify-center py-2.5 rounded-xl text-white text-xs font-semibold transition bg-sky-600 hover:bg-sky-700">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Espace Résident ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Espace Résident</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => navigate("/gouvernance/notifications")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="text-xs font-semibold">Notifications</span>
          </button>
          <button onClick={() => navigate("/espace-resident/messages")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-xs font-semibold">Messages</span>
          </button>
          <button onClick={() => navigate("/espace-resident/consultation")}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="text-xs font-semibold">Vue Résident</span>
          </button>
        </div>
      </div>

    </div>
  );
}

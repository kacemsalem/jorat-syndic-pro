import { useEffect, useState } from "react";

export default function HomeResidencePage() {
  const [residence, setResidence] = useState(null);
  const [loading,   setLoading]   = useState(true);

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
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Hero ── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-indigo-100">

        {/* Gradient band */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 px-6 pt-8 pb-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Logo */}
            <div className="shrink-0">
              {residence.logo ? (
                <img
                  src={residence.logo}
                  alt="Logo résidence"
                  className="w-28 h-28 rounded-2xl object-contain bg-white/15 border-2 border-white/30 p-2 shadow-xl"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-white/10 border-2 border-white/25 flex items-center justify-center shadow-xl">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  residence.statut_residence === "ACTIF"
                    ? "bg-emerald-400/25 text-emerald-100 border border-emerald-400/35"
                    : "bg-red-400/25 text-red-100 border border-red-400/35"
                }`}>
                  {residence.statut_residence}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
                {residence.nom_residence}
              </h1>
              {adresse && (
                <p className="text-indigo-200 text-sm mt-2 font-medium">{adresse}</p>
              )}
              {residence.email && (
                <a href={`mailto:${residence.email}`}
                  className="text-indigo-300 text-xs mt-1.5 hover:text-white transition inline-flex items-center gap-1">
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
        <div className="bg-indigo-900 px-6 py-3 flex flex-wrap gap-x-8 gap-y-1.5">
          {residence.nombre_lots != null && (
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="text-indigo-200 text-xs">
                <span className="font-bold text-white text-sm">{residence.nombre_lots}</span>
                {" "}lot{residence.nombre_lots > 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-indigo-200 text-xs">
              Syndic Pro — {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Description ── */}
      {residence.description && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{residence.description}</p>
        </div>
      )}

      {/* ── Info complémentaires ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {adresse && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Adresse</p>
              <p className="text-sm text-slate-700 mt-0.5 leading-snug">{adresse}</p>
            </div>
          </div>
        )}
        {residence.email && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Contact</p>
              <a href={`mailto:${residence.email}`} className="text-sm text-indigo-600 hover:text-indigo-800 mt-0.5 block">{residence.email}</a>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

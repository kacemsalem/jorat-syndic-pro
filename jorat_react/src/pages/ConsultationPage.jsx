import { useState, useEffect } from "react";

const STATUT_COLORS = {
  PAYE:       "bg-green-100 text-green-700",
  PARTIEL:    "bg-yellow-100 text-yellow-700",
  EN_ATTENTE: "bg-slate-100 text-slate-500",
  RETARD:     "bg-red-100 text-red-700",
};

const FONCTION_COLORS = {
  PRESIDENT:      "bg-amber-100 text-amber-800",
  VICE_PRESIDENT: "bg-orange-100 text-orange-800",
  TRESORIER:      "bg-blue-100 text-blue-800",
  SECRETAIRE:     "bg-violet-100 text-violet-800",
  MEMBRE:         "bg-slate-100 text-slate-600",
};

function fmt(val) {
  if (val === null || val === undefined) return "—";
  return Number(val).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}

function AccordionSection({ title, icon, headerCls, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 ${headerCls} transition-opacity active:opacity-80`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{icon}</span>
          <span className="font-bold text-sm uppercase tracking-wide">{title}</span>
          {badge != null && (
            <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="bg-white px-4 py-4">{children}</div>}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
      <div className={`text-sm font-bold ${color} leading-tight`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
}

export default function ConsultationPage() {
  const residenceId = localStorage.getItem("active_residence");
  const [lots,       setLots]       = useState([]);
  const [lotId,      setLotId]      = useState("");
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [messages,   setMessages]   = useState([]);
  const [evenements, setEvenements] = useState([]);

  useEffect(() => {
    if (!residenceId) return;
    fetch(`/api/lots/?residence=${residenceId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setLots(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  }, [residenceId]);

  useEffect(() => {
    if (!lotId) { setData(null); setMessages([]); setEvenements([]); return; }
    setLoading(true); setError("");
    Promise.all([
      fetch(`/api/resident-lot-preview/${lotId}/`, { credentials: "include" }).then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.detail || "Erreur");
        return json;
      }),
      fetch(`/api/messages-resident/?lot=${lotId}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : []),
      fetch("/api/travaux/", { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : []),
    ])
      .then(([portalData, msgs, evts]) => { setData(portalData); setMessages(msgs); setEvenements(evts); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lotId]);

  const { lot, rapport, bureau, derniere_ag, documents } = data || {};

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div>
          <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
          <h1 className="text-white font-bold text-lg leading-tight">Vue résident</h1>
        </div>
        <p className="text-white/50 text-[10px] mt-1">Prévisualisation du portail tel que le voit le résident</p>
      </div>

      <div className="px-4 -mt-5 space-y-3">

        {/* Lot selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Sélectionner un lot
          </label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            value={lotId}
            onChange={e => setLotId(e.target.value)}
          >
            <option value="">— Choisir un lot —</option>
            {lots.map(l => (
              <option key={l.id} value={l.id}>
                {l.numero_lot}{l.representant ? ` — ${l.representant.nom} ${l.representant.prenom ?? ""}` : ""}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm text-center py-10 text-slate-400 text-sm">Chargement…</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Preview notice + lot header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Aperçu résident</p>
                {lot && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {lot.numero_lot}
                    </span>
                    {lot.groupe && (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {lot.groupe}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">👁 Aperçu</span>
            </div>

            {/* ── Ma situation financière ── */}
            {lot && (
              <AccordionSection
                title="Ma situation financière"
                icon="💳"
                headerCls="bg-sky-600 text-white"
                defaultOpen={true}
              >
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <StatBox label="Total appelé"  value={fmt(lot.total_du)}     color="text-slate-700" />
                  <StatBox label="Total payé"    value={fmt(lot.total_paye)}   color="text-green-600" />
                  <StatBox label="Solde restant" value={fmt(lot.solde_global)}
                    color={Number(lot.solde_global) > 0 ? "text-red-600" : "text-green-600"} />
                </div>
                {lot.charges.length > 0 ? (
                  <div className="overflow-x-auto -mx-1 rounded-xl border border-slate-100">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs">Période</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500 text-xs">Type</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs">Appelé</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs">Payé</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 text-xs">Solde</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-500 text-xs">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lot.charges.map(c => (
                          <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700 font-medium text-xs">{c.exercice} / {c.periode}</td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{c.type_charge}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700 text-xs">{fmt(c.montant_appel)}</td>
                            <td className="px-3 py-2 text-right font-mono text-green-600 text-xs">{fmt(c.montant_paye)}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-xs">
                              <span className={Number(c.solde) > 0 ? "text-red-600" : "text-green-600"}>{fmt(c.solde)}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUT_COLORS[c.statut] || "bg-slate-100 text-slate-500"}`}>
                                {c.statut_label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-3">Aucun appel de charge enregistré.</p>
                )}
              </AccordionSection>
            )}

            {/* ── Messages & réclamations ── */}
            <AccordionSection
              title="Mes messages"
              icon="✉️"
              headerCls="bg-sky-600 text-white"
              defaultOpen={false}
              badge={messages.filter(m => m.statut === "NOUVEAU").length || null}
            >
              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Aucun message envoyé par ce résident.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map(m => (
                    <div key={m.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{m.objet}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          m.statut === "RESOLU"   ? "bg-emerald-100 text-emerald-700" :
                          m.statut === "EN_COURS" ? "bg-amber-100 text-amber-700" :
                                                    "bg-red-100 text-red-700"
                        }`}>
                          {m.statut_label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{m.created_at}</p>
                      <p className="text-xs text-slate-500 whitespace-pre-wrap mt-1">{m.message}</p>
                      {m.reponse && (
                        <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-0.5">Réponse du gestionnaire</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{m.reponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            {/* ── Rapport financier résidence ── */}
            {rapport && (
              <AccordionSection
                title="Situation financière de la résidence"
                icon="📊"
                headerCls="bg-sky-600 text-white"
                defaultOpen={false}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Comptabilité</p>
                    <div className="flex justify-between text-xs"><span className="text-slate-600">Recettes</span><span className="font-semibold text-green-600">{fmt(rapport.recettes_total)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-600">Dépenses</span><span className="font-semibold text-red-500">{fmt(rapport.depenses_total)}</span></div>
                    <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                      <span className="text-slate-700 font-semibold">Solde</span>
                      <span className={`font-bold ${Number(rapport.solde_recettes) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(rapport.solde_recettes)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Caisse</p>
                    <div className="flex justify-between text-xs"><span className="text-slate-600">Entrées</span><span className="font-semibold text-green-600">{fmt(rapport.caisse_entrees)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-600">Sorties</span><span className="font-semibold text-red-500">{fmt(rapport.caisse_sorties)}</span></div>
                    <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                      <span className="text-slate-700 font-semibold">Solde caisse</span>
                      <span className={`font-bold ${Number(rapport.solde_caisse) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(rapport.solde_caisse)}</span>
                    </div>
                  </div>
                </div>
              </AccordionSection>
            )}

            {/* ── Dernière AG ── */}
            {derniere_ag && (
              <AccordionSection
                title="Dernière assemblée générale"
                icon="📋"
                headerCls="bg-sky-600 text-white"
                defaultOpen={false}
              >
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center min-w-[100px]">
                    <div className="text-base font-bold text-amber-700">{derniere_ag.date_ag}</div>
                    <div className="text-xs text-amber-500">{derniere_ag.type_ag_label}</div>
                  </div>
                  {derniere_ag.lieu && <p className="text-sm text-slate-500">📍 {derniere_ag.lieu}</p>}
                </div>
                {derniere_ag.resolutions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      Résolutions adoptées ({derniere_ag.resolutions.length})
                    </p>
                    {derniere_ag.resolutions.map(r => (
                      <div key={r.id} className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
                        <span className="text-green-500 font-bold text-sm mt-0.5 shrink-0">✓</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.titre}</p>
                          {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Aucune résolution adoptée lors de cette AG.</p>
                )}
              </AccordionSection>
            )}

            {/* ── Documents ── */}
            {documents && documents.length > 0 && (
              <AccordionSection
                title="Documents disponibles"
                icon="📁"
                headerCls="bg-sky-600 text-white"
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{doc.titre}</p>
                        <p className="text-xs text-slate-400">{doc.type_document} · {doc.date}</p>
                      </div>
                      {doc.fichier && (
                        <a href={doc.fichier} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                          ⬇ Télécharger
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}

            {/* ── Événements ── */}
            {evenements.length > 0 && (
              <AccordionSection
                title="Événements & travaux"
                icon="🔧"
                headerCls="bg-sky-600 text-white"
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {evenements.map(e => (
                    <div key={e.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="text-xs text-slate-400 whitespace-nowrap pt-0.5 min-w-[80px]">{e.date_travaux}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{e.nature}</p>
                        {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
                      </div>
                      {e.statut && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">{e.statut}</span>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}

            {/* ── Bureau syndical ── */}
            {bureau && (
              <AccordionSection
                title="Bureau syndical actif"
                icon="🏛️"
                headerCls="bg-sky-600 text-white"
                defaultOpen={false}
              >
                {bureau.date_debut && (
                  <p className="text-xs text-slate-400 mb-3">
                    Mandat depuis le <span className="font-semibold">{bureau.date_debut}</span>
                    {bureau.date_fin && <> jusqu'au <span className="font-semibold">{bureau.date_fin}</span></>}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bureau.membres.map(m => (
                    <div key={m.id} className="bg-slate-50 rounded-xl p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${FONCTION_COLORS[m.fonction] || "bg-slate-100 text-slate-600"}`}>
                        {m.fonction_label}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 mt-2 leading-tight">{m.nom} {m.prenom}</p>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

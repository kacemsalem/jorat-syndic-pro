import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  return Number(val).toLocaleString("fr-MA", { minimumFractionDigits: 2 }) + " MAD";
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ConsultationPage() {
  const navigate = useNavigate();
  const residenceId = localStorage.getItem("active_residence");
  const [lots,      setLots]      = useState([]);
  const [lotId,     setLotId]     = useState("");
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [messages,  setMessages]  = useState([]);
  const [evenements, setEvenements] = useState([]);

  // Load lots list
  useEffect(() => {
    if (!residenceId) return;
    fetch(`/api/lots/?residence=${residenceId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setLots(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  }, [residenceId]);

  // Load portal data + messages for selected lot
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
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Tableau de bord</button>

      {/* Header + lot selector */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Consultation espace résident</h1>
        <p className="text-xs text-slate-400 mt-0.5">Prévisualisation du portail tel que le voit le résident</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Sélectionner un lot
        </label>
        <select
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
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
        <div className="py-8 text-center text-slate-400 text-sm">Chargement…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{error}</div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Preview notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700 font-semibold">
            👁 Prévisualisation — Vue résident du lot {lot?.numero_lot}
          </div>

          {/* Situation financière */}
          {lot && (
            <SectionCard title="Ma situation financière" icon="💳">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-slate-700">{fmt(lot.total_du)}</div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Total appelé</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-600">{fmt(lot.total_paye)}</div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Total payé</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-bold ${Number(lot.solde_global) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmt(lot.solde_global)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Solde restant</div>
                </div>
              </div>

              {lot.charges.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Période</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Type</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Appelé</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Payé</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Solde</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-600">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot.charges.map(c => (
                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700 font-medium">{c.exercice} / {c.periode}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{c.type_charge}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{fmt(c.montant_appel)}</td>
                          <td className="px-3 py-2 text-right font-mono text-green-600">{fmt(c.montant_paye)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            <span className={Number(c.solde) > 0 ? "text-red-600" : "text-green-600"}>{fmt(c.solde)}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[c.statut] || "bg-slate-100 text-slate-500"}`}>
                              {c.statut_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">Aucun appel de charge enregistré.</p>
              )}
            </SectionCard>
          )}

          {/* Rapport financier */}
          {rapport && (
            <SectionCard title="Situation financière de la résidence" icon="📊">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Comptabilité</p>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Recettes</span><span className="font-semibold text-green-600">{fmt(rapport.recettes_total)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Dépenses</span><span className="font-semibold text-red-500">{fmt(rapport.depenses_total)}</span></div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="text-slate-700 font-semibold">Solde</span><span className={`font-bold ${Number(rapport.solde_recettes) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(rapport.solde_recettes)}</span></div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Caisse</p>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Entrées</span><span className="font-semibold text-green-600">{fmt(rapport.caisse_entrees)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600">Sorties</span><span className="font-semibold text-red-500">{fmt(rapport.caisse_sorties)}</span></div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2"><span className="text-slate-700 font-semibold">Solde caisse</span><span className={`font-bold ${Number(rapport.solde_caisse) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(rapport.solde_caisse)}</span></div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Bureau syndical */}
          {bureau && (
            <SectionCard title="Bureau syndical actif" icon="🏛️">
              {bureau.date_debut && (
                <p className="text-xs text-slate-400 mb-4">
                  Mandat depuis le <span className="font-semibold">{bureau.date_debut}</span>
                  {bureau.date_fin && <> jusqu'au <span className="font-semibold">{bureau.date_fin}</span></>}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {bureau.membres.map(m => (
                  <div key={m.id} className="bg-slate-50 rounded-xl p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${FONCTION_COLORS[m.fonction] || "bg-slate-100 text-slate-600"}`}>
                      {m.fonction_label}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 mt-2">{m.nom} {m.prenom}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Dernière AG */}
          {derniere_ag && (
            <SectionCard title="Dernière assemblée générale" icon="📋">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center min-w-[100px]">
                  <div className="text-base font-bold text-amber-700">{derniere_ag.date_ag}</div>
                  <div className="text-xs text-amber-500">{derniere_ag.type_ag_label}</div>
                </div>
                {derniere_ag.lieu && <p className="text-sm text-slate-500">📍 {derniere_ag.lieu}</p>}
              </div>
              {derniere_ag.resolutions.length > 0 ? (
                <div className="space-y-2">
                  {derniere_ag.resolutions.map(r => (
                    <div key={r.id} className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
                      <span className="text-green-500 font-bold text-sm mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{r.titre}</p>
                        {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Aucune résolution adoptée.</p>
              )}
            </SectionCard>
          )}

          {/* Documents */}
          {documents && documents.length > 0 && (
            <SectionCard title="Documents disponibles" icon="📁">
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doc.titre}</p>
                      <p className="text-xs text-slate-400">{doc.type_document} · {doc.date}</p>
                    </div>
                    {doc.fichier && (
                      <a href={doc.fichier} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                        ⬇ Télécharger
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Événements */}
          {evenements.length > 0 && (
            <SectionCard title="Événements & travaux" icon="🔧">
              <div className="space-y-2">
                {evenements.map(e => (
                  <div key={e.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-400 whitespace-nowrap pt-0.5 min-w-[80px]">{e.date_travaux}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{e.nature}</p>
                      {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
                    </div>
                    {e.statut && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">{e.statut}</span>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Messages & réclamations du résident */}
          <SectionCard title="Messages & réclamations" icon="✉️">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Aucun message envoyé par ce résident.</p>
            ) : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800">{m.objet}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        m.statut === "RESOLU"   ? "bg-emerald-100 text-emerald-700" :
                        m.statut === "EN_COURS" ? "bg-amber-100 text-amber-700" :
                                                  "bg-red-100 text-red-700"
                      }`}>
                        {m.statut_label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap mt-1">{m.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{m.created_at}</p>
                    {m.reponse && (
                      <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">Réponse du gestionnaire</p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{m.reponse}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-3 italic text-center">
              Prévisualisation — le résident voit cette section et peut y rédiger ses messages
            </p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONCTION_COLORS = {
  PRESIDENT:      "bg-amber-100 text-amber-800",
  VICE_PRESIDENT: "bg-orange-100 text-orange-800",
  TRESORIER:      "bg-blue-100 text-blue-800",
  SECRETAIRE:     "bg-violet-100 text-violet-800",
  MEMBRE:         "bg-slate-100 text-slate-600",
};

const STATUT_COLORS = {
  PAYE:       "bg-green-100 text-green-700",
  PARTIEL:    "bg-yellow-100 text-yellow-700",
  NON_PAYE:   "bg-red-50 text-red-500",
  EN_ATTENTE: "bg-slate-100 text-slate-500",
  RETARD:     "bg-red-100 text-red-700",
};

const NOTIF_TYPE_BADGE = {
  SMS:     "bg-blue-100 text-blue-700",
  MESSAGE: "bg-indigo-100 text-indigo-700",
  SYSTEM:  "bg-slate-100 text-slate-600",
};

function fmt(val) {
  if (val === null || val === undefined) return "—";
  return Number(val).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}

// ── Collapsible accordion section ─────────────────────────────────────────────

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

// ── Small stat box ─────────────────────────────────────────────────────────────

function StatBox({ label, value, color }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
      <div className={`text-sm font-bold ${color} leading-tight`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResidentPortalPage() {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [notifications, setNotifications] = useState([]);
  const [nbNonLu, setNbNonLu]   = useState(0);
  const [evenements, setEvenements] = useState([]);

  // Messages / réclamations
  const [msgForm,     setMsgForm]     = useState({ objet: "", message: "" });
  const [msgSaving,   setMsgSaving]   = useState(false);
  const [msgError,    setMsgError]    = useState("");
  const [msgSuccess,  setMsgSuccess]  = useState("");
  const [mesMessages, setMesMessages] = useState([]);
  const [showMsgForm, setShowMsgForm] = useState(false);

  useEffect(() => {
    fetch("/api/resident/", { credentials: "include" })
      .then(async r => {
        const text = await r.text();
        let json;
        try { json = JSON.parse(text); } catch { throw new Error("Erreur serveur (réponse invalide)"); }
        if (!r.ok) throw new Error(json.detail || "Erreur");
        return json;
      })
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = () => {
    fetch("/api/messages-resident/mes/", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d)) setMesMessages(d); })
      .catch(() => {});
  };

  useEffect(() => { loadMessages(); }, []);

  const handleMsgSubmit = async () => {
    setMsgError(""); setMsgSuccess("");
    if (!msgForm.objet.trim() || !msgForm.message.trim()) {
      setMsgError("Objet et message obligatoires."); return;
    }
    setMsgSaving(true);
    try {
      const csrf = document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
      const res = await fetch("/api/messages-resident/submit/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify(msgForm),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsgError(d.detail || "Erreur d'envoi."); return;
      }
      setMsgSuccess("Message envoyé ✅");
      setMsgForm({ objet: "", message: "" });
      setShowMsgForm(false);
      loadMessages();
    } catch { setMsgError("Erreur réseau."); }
    finally { setMsgSaving(false); }
  };

  useEffect(() => {
    fetch("/api/travaux/", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setEvenements(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/notification-mes/", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setNotifications(d.notifications || []);
        setNbNonLu(d.nb_non_lu || 0);
      })
      .catch(() => {});
  }, []);

  const markRead = async (id) => {
    await fetch(`/api/notification-read/${id}/`, { method: "POST", credentials: "include" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, statut: "LU" } : n));
    setNbNonLu(prev => Math.max(0, prev - 1));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Chargement…</div>
  );

  if (error) return (
    <div className="max-w-sm mx-auto mt-12 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <p className="text-red-600 font-semibold text-sm">{error}</p>
      <button
        onClick={() => { localStorage.removeItem("syndic_user"); navigate("/login"); }}
        className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold"
      >
        Se déconnecter
      </button>
    </div>
  );

  const { residence, lot, rapport, bureau, derniere_ag, documents } = data;

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-0 py-4 space-y-3">

      {/* ── Résidence branding ── */}
      {residence && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          {residence.logo ? (
            <img src={residence.logo} alt="logo" className="h-12 w-12 rounded-xl object-contain shrink-0 border border-slate-100" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <span className="text-sky-600 font-bold text-lg">{residence.nom[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Résidence</p>
            <p className="text-base font-bold text-slate-800 leading-tight truncate">{residence.nom}</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-0.5">Mon espace résident</p>
          {lot ? (
            <>
              <h1 className="text-base font-bold text-slate-800 leading-tight truncate">
                {lot.representant || "—"}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {lot.numero_lot}
                </span>
                {lot.groupe && (
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {lot.groupe}
                  </span>
                )}
              </div>
            </>
          ) : (
            <h1 className="text-base font-bold text-slate-800">Mon espace résident</h1>
          )}
        </div>
        <button
          onClick={async () => {
            await fetch("/api/logout/", { method: "POST", credentials: "include" }).catch(() => {});
            localStorage.removeItem("syndic_user");
            navigate("/login");
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl border border-red-200 text-xs text-red-600 hover:bg-red-50 transition font-semibold"
        >
          Déconnexion
        </button>
      </div>

      {/* ── Votes ── */}
      <button
        onClick={() => navigate("/espace-resident/votes")}
        className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">🗳️</span>
          <div className="text-left">
            <p className="text-sm font-bold">Résolutions par vote</p>
            <p className="text-[11px] text-violet-200 mt-0.5">Consultez et votez les résolutions</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* ── No lot warning ── */}
      {!lot && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-amber-700 text-sm font-semibold">Aucun lot associé à votre compte.</p>
          <p className="text-amber-500 text-xs mt-1">Contactez votre gestionnaire de résidence.</p>
        </div>
      )}

      {/* ── Ma situation financière ── */}
      {lot && (
        <AccordionSection
          title="Ma situation financière"
          icon="💳"
          headerCls="bg-sky-600 text-white"
          defaultOpen={true}
        >
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatBox label="Total appelé"  value={fmt(lot.total_du)}     color="text-slate-700" />
            <StatBox label="Total payé"    value={fmt(lot.total_paye)}   color="text-green-600" />
            <StatBox label="Solde restant" value={fmt(lot.solde_global)}
              color={Number(lot.solde_global) > 0 ? "text-red-600" : "text-green-600"} />
          </div>

          {/* Charges — scrollable table on mobile */}
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

      {/* ── Mes notifications ── */}
      {notifications.length > 0 && (
        <AccordionSection
          title="Mes notifications"
          icon="🔔"
          headerCls="bg-sky-600 text-white"
          defaultOpen={nbNonLu > 0}
          badge={nbNonLu > 0 ? nbNonLu : null}
        >
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`rounded-xl border p-3 transition ${n.statut === "LU" ? "bg-slate-50 border-slate-100" : "bg-sky-50 border-sky-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${NOTIF_TYPE_BADGE[n.type_notification] ?? "bg-slate-100 text-slate-600"}`}>
                        {n.type_label}
                      </span>
                      {n.statut !== "LU" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Non lu</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.date_notification).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{n.titre}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    {n.montant_du && (
                      <p className="text-xs text-red-600 font-semibold mt-1">
                        Montant dû : {Number(n.montant_du).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  {n.statut !== "LU" && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                    >
                      Lu ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* ── Mes messages ── */}
      <AccordionSection
        title="Mes messages"
        icon="✉️"
        headerCls="bg-sky-600 text-white"
        defaultOpen={mesMessages.some(m => m.statut === "NOUVEAU")}
        badge={mesMessages.filter(m => m.statut === "NOUVEAU").length || null}
      >
        <div className="space-y-3">
          {!showMsgForm ? (
            <button
              onClick={() => { setShowMsgForm(true); setMsgSuccess(""); setMsgError(""); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              + Nouveau message
            </button>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nouveau message</p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Objet *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Ex : Fuite d'eau, bruit, demande…"
                  value={msgForm.objet}
                  onChange={e => setMsgForm(f => ({ ...f, objet: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Message *</label>
                <textarea
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  placeholder="Décrivez votre demande ou réclamation…"
                  value={msgForm.message}
                  onChange={e => setMsgForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>
              {msgError && <p className="text-xs text-red-500">{msgError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowMsgForm(false); setMsgError(""); }}
                  className="px-3 py-2 text-xs border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100">
                  Annuler
                </button>
                <button onClick={handleMsgSubmit} disabled={msgSaving}
                  className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60">
                  {msgSaving ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </div>
          )}
          {msgSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-semibold">
              {msgSuccess}
            </div>
          )}
          {mesMessages.length > 0 ? (
            <div className="space-y-2">
              {mesMessages.map(m => (
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
                  {m.reponse && (
                    <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5">Réponse du gestionnaire</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{m.reponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showMsgForm && <p className="text-xs text-slate-400 text-center py-1">Aucun message envoyé pour le moment.</p>
          )}
        </div>
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
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                    ⬇ <span className="hidden xs:inline">Télécharger</span>
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

    </div>
  );
}


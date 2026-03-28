import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const STATUT_COLORS = {
  NOUVEAU:  "bg-red-100 text-red-700",
  EN_COURS: "bg-amber-100 text-amber-700",
  RESOLU:   "bg-emerald-100 text-emerald-700",
};
const STATUT_LABELS = { NOUVEAU: "Nouveau", EN_COURS: "En cours", RESOLU: "Résolu" };

export default function MessagesResidentPage() {
  const navigate = useNavigate();
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatut, setFilterStatut] = useState("");
  // Per-message reply state: { [id]: { statut, reponse, saving, error } }
  const [replyState, setReplyState] = useState({});

  // Selection mode
  const [selMode,  setSelMode]  = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDel,  setBulkDel]  = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/messages-resident/", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setMessages(list);
        const init = {};
        list.forEach(m => {
          init[m.id] = { statut: m.statut, reponse: m.reponse || "", saving: false, error: "" };
        });
        setReplyState(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!filterStatut) return messages;
    return messages.filter(m => m.statut === filterStatut);
  }, [messages, filterStatut]);

  const counts = useMemo(() => {
    const c = { NOUVEAU: 0, EN_COURS: 0, RESOLU: 0 };
    messages.forEach(m => { if (c[m.statut] !== undefined) c[m.statut]++; });
    return c;
  }, [messages]);

  const setReply = (id, patch) =>
    setReplyState(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleSave = async (id) => {
    const r = replyState[id];
    if (!r) return;
    setReply(id, { saving: true, error: "" });
    try {
      const res = await fetch(`/api/messages-resident/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ statut: r.statut, reponse: r.reponse }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || Object.values(data).flat().join(" ") || `Erreur ${res.status}`;
        setReply(id, { saving: false, error: msg });
        return;
      }
      setReply(id, { saving: false, error: "", saved: true });
      load();
    } catch (e) { setReply(id, { saving: false, error: e.message || "Erreur réseau." }); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await fetch(`/api/messages-resident/${id}/`, {
        method: "DELETE", credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
      });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  // Selection helpers
  const toggleSel = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(m => selected.has(m.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(m => next.delete(m.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(m => next.add(m.id)); return next; });
    }
  };

  const exitSelMode = () => { setSelMode(false); setSelected(new Set()); };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Supprimer ${ids.length} message${ids.length > 1 ? "s" : ""} ?`)) return;
    setBulkDel(true);
    try {
      for (const id of ids) {
        await fetch(`/api/messages-resident/${id}/`, {
          method: "DELETE", credentials: "include",
          headers: { "X-CSRFToken": getCsrf() },
        });
      }
      setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      exitSelMode();
    } finally {
      setBulkDel(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-32">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Messages des résidents</h1>
          </div>
          {!selMode ? (
            <button onClick={() => setSelMode(true)}
              className="bg-white/20 border border-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-white/30 transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sélectionner
            </button>
          ) : (
            <button onClick={exitSelMode}
              className="bg-white/20 border border-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-white/30 transition">
              Annuler
            </button>
          )}
        </div>
        <p className="text-white/50 text-[10px] mt-1">Réclamations et demandes envoyées depuis l'espace résident</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">
      {/* KPIs / filtres */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "NOUVEAU",  label: "Nouveau",  bg: "bg-red-50",     txt: "text-red-600"     },
          { key: "EN_COURS", label: "En cours", bg: "bg-amber-50",   txt: "text-amber-600"   },
          { key: "RESOLU",   label: "Résolu",   bg: "bg-emerald-50", txt: "text-emerald-600" },
        ].map(({ key, label, bg, txt }) => (
          <button
            key={key}
            onClick={() => setFilterStatut(filterStatut === key ? "" : key)}
            className={`${bg} rounded-xl p-3 text-center border-2 transition ${filterStatut === key ? "border-current" : "border-transparent"} ${txt}`}
          >
            <div className={`text-2xl font-bold ${txt}`}>{counts[key]}</div>
            <div className="text-xs font-semibold mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">Aucun message{filterStatut ? " pour ce statut" : ""}.</div>
      ) : (
        <div className="space-y-3">
          {/* Selection toolbar */}
          {selMode && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2.5 flex items-center gap-3">
              <button onClick={toggleAll}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 ${
                  allFilteredSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                }`}>
                {allFilteredSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-slate-500 flex-1">
                {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}` : "Tout sélectionner"}
              </span>
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} disabled={bulkDel}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition">
                  {bulkDel ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                    </svg>
                  )}
                  Supprimer
                </button>
              )}
            </div>
          )}

          {filtered.map(m => {
            const r = replyState[m.id] || { statut: m.statut, reponse: m.reponse || "", saving: false, error: "" };
            const isSel = selected.has(m.id);

            return (
              <div key={m.id}
                className={`rounded-2xl border shadow-sm overflow-hidden transition ${
                  isSel ? "border-indigo-300 ring-2 ring-indigo-200" :
                  m.statut === "RESOLU"   ? "bg-emerald-50/60 border-emerald-100" :
                  m.statut === "EN_COURS" ? "bg-amber-50/60 border-amber-100" :
                                            "bg-red-50/40 border-red-100"
                } ${isSel ? "bg-indigo-50/40" : ""}`}>

                {/* Header */}
                <div
                  onClick={selMode ? () => toggleSel(m.id) : undefined}
                  className={`px-4 py-3 border-b border-slate-50 space-y-2 ${selMode ? "cursor-pointer" : ""}`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {selMode && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                        isSel ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                      }`}>
                        {isSel && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${STATUT_COLORS[m.statut]}`}>
                      {STATUT_LABELS[m.statut]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{m.objet}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{m.created_at}</p>
                    </div>
                    {/* Delete button (normal mode) */}
                    {!selMode && (
                      <button onClick={() => handleDelete(m.id)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Origine */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 uppercase tracking-wide">
                      {m.origine || "Portail Résident"}
                    </span>
                    {m.lot_numero && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                        Lot {m.lot_numero}
                      </span>
                    )}
                    {m.expediteur && (
                      <span className="text-[10px] text-slate-500">
                        {m.expediteur}
                        {m.expediteur_username && m.expediteur !== m.expediteur_username
                          ? ` (${m.expediteur_username})`
                          : ""}
                      </span>
                    )}
                    {m.expediteur_email && (
                      <a href={`mailto:${m.expediteur_email}`}
                        className="text-[10px] text-indigo-400 hover:text-indigo-600 truncate">
                        {m.expediteur_email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Body — hidden in selection mode */}
                {!selMode && (
                  <div className="px-4 py-4 space-y-4">
                    {/* Message du résident */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Message du résident</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl px-3 py-2">{m.message}</p>
                    </div>

                    {/* Réponse inline */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Réponse & statut</p>

                      {/* Statut buttons */}
                      <div className="flex gap-2 mb-2">
                        {["NOUVEAU", "EN_COURS", "RESOLU"].map(s => (
                          <button
                            key={s}
                            onClick={() => setReply(m.id, { statut: s })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                              r.statut === s
                                ? STATUT_COLORS[s] + " border-current"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            {STATUT_LABELS[s]}
                          </button>
                        ))}
                      </div>

                      {/* Textarea réponse */}
                      <textarea
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                        placeholder="Rédigez votre réponse au résident…"
                        value={r.reponse}
                        onChange={e => setReply(m.id, { reponse: e.target.value })}
                        disabled={r.saved || r.saving}
                        readOnly={r.saved}
                      />

                      {r.error && <p className="text-xs text-red-500 mt-1">{r.error}</p>}

                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSave(m.id)}
                          disabled={r.saving || r.saved}
                          className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold"
                        >
                          {r.saving ? "Enregistrement…" : r.saved ? "✓ Enregistré" : "Enregistrer"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Floating bulk action bar */}
      {selMode && selected.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">
              {selected.size}
            </div>
            <span className="text-sm font-semibold flex-1">
              {selected.size} message{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
            <button onClick={exitSelMode} className="text-slate-400 hover:text-white text-xs font-medium transition px-2">
              Annuler
            </button>
            <button onClick={handleBulkDelete} disabled={bulkDel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition">
              {bulkDel ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                </svg>
              )}
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

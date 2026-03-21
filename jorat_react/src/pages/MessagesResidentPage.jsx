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

  const load = () => {
    setLoading(true);
    fetch("/api/messages-resident/", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setMessages(list);
        // Initialize reply state for each message
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
      if (!res.ok) { setReply(id, { saving: false, error: "Erreur lors de l'enregistrement." }); return; }
      setReply(id, { saving: false });
      load();
    } catch { setReply(id, { saving: false, error: "Erreur réseau." }); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Tableau de bord</button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Messages des résidents</h1>
        <p className="text-xs text-slate-400 mt-0.5">Réclamations et demandes envoyées depuis l'espace résident</p>
      </div>

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
          {filtered.map(m => {
            const r = replyState[m.id] || { statut: m.statut, reponse: m.reponse || "", saving: false, error: "" };

            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-50">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${STATUT_COLORS[m.statut]}`}>
                    {STATUT_LABELS[m.statut]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.objet}</p>
                    <p className="text-xs text-slate-400">
                      {m.lot_numero || "—"}
                      {m.expediteur ? ` · ${m.expediteur}` : ""}
                      {" · "}{m.created_at}
                    </p>
                  </div>
                </div>

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
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                      placeholder="Rédigez votre réponse au résident…"
                      value={r.reponse}
                      onChange={e => setReply(m.id, { reponse: e.target.value })}
                    />

                    {r.error && <p className="text-xs text-red-500 mt-1">{r.error}</p>}

                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={r.saving}
                        className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-semibold"
                      >
                        {r.saving ? "Enregistrement…" : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

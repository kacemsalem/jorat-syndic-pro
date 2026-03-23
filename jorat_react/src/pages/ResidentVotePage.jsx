import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const STATUT_LABEL = {
  EN_PREPARATION: "En préparation",
  EN_COURS:       "En cours",
  CLOTURE:        "Clôturé",
};

const CHOIX_CFG = {
  OUI:    { label: "Oui",    bg: "bg-emerald-600 hover:bg-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  NON:    { label: "Non",    bg: "bg-red-600     hover:bg-red-700",     badge: "bg-red-100    text-red-700"     },
  NEUTRE: { label: "Neutre", bg: "bg-slate-500   hover:bg-slate-600",   badge: "bg-slate-100  text-slate-600"   },
};

export default function ResidentVotePage() {
  const navigate = useNavigate();
  const [resolutions, setResolutions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [voting,      setVoting]      = useState({});
  const [accusing,    setAccusing]    = useState({});

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/resolutions-vote/mes/", { credentials: "include" });
    if (r.ok) {
      setResolutions(await r.json());
    } else {
      const e = await r.json().catch(() => ({}));
      setError(e.detail || "Erreur de chargement.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAccuser = async (id) => {
    setAccusing(a => ({ ...a, [id]: true }));
    await fetch(`/api/resolutions-vote/${id}/accuser/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    setAccusing(a => ({ ...a, [id]: false }));
    setResolutions(prev => prev.map(r => r.id === id ? { ...r, accuse_reception: true } : r));
  };

  const handleVoter = async (id, choix) => {
    setVoting(v => ({ ...v, [id]: choix }));
    const r = await fetch(`/api/resolutions-vote/${id}/voter/`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ choix }),
    });
    setVoting(v => ({ ...v, [id]: null }));
    if (r.ok) {
      const d = await r.json();
      setResolutions(prev => prev.map(rv => rv.id === id ? { ...rv, mon_vote: d.choix } : rv));
    } else {
      const e = await r.json().catch(() => ({}));
      alert(e.detail || "Erreur lors du vote.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{error}</div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4">
    <div className="max-w-2xl mx-auto pb-10 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/resident")}
          className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Votes en cours</h1>
          <p className="text-xs text-slate-400 mt-0.5">Résolutions soumises au vote de votre lot</p>
        </div>
      </div>

      {resolutions.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Aucune résolution en attente de vote.
        </div>
      )}

      {resolutions.map(rv => (
        <div key={rv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          {/* Entête */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{rv.intitule}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{rv.date_resolution} · {rv.type_vote_label}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              rv.statut === "EN_COURS" ? "bg-amber-100 text-amber-700" :
              rv.statut === "CLOTURE"  ? "bg-emerald-100 text-emerald-700" :
              "bg-slate-100 text-slate-600"}`}>
              {STATUT_LABEL[rv.statut] || rv.statut}
            </span>
          </div>

          {rv.description && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 leading-relaxed">{rv.description}</p>
          )}

          {/* Dates */}
          {(rv.date_debut_vote || rv.date_cloture_vote) && (
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {rv.date_debut_vote   && <span>🗓 Début : {new Date(rv.date_debut_vote).toLocaleString("fr-FR")}</span>}
              {rv.date_cloture_vote && <span>🔒 Clôture : {new Date(rv.date_cloture_vote).toLocaleString("fr-FR")}</span>}
            </div>
          )}

          {/* Accusé réception */}
          {!rv.accuse_reception ? (
            <button onClick={() => handleAccuser(rv.id)} disabled={accusing[rv.id]}
              className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition">
              {accusing[rv.id] ? "…" : "✓ Accuser réception de la notification"}
            </button>
          ) : (
            <p className="text-[11px] text-emerald-600 font-semibold">✅ Réception accusée</p>
          )}

          {/* Vote */}
          {rv.peut_voter && (
            <div>
              {rv.mon_vote ? (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-600">Votre vote :</p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${CHOIX_CFG[rv.mon_vote]?.badge}`}>
                    {CHOIX_CFG[rv.mon_vote]?.label}
                  </span>
                  <button onClick={() => {}} className="text-xs text-slate-400 hover:text-indigo-500 transition">Modifier</button>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Votre vote :</p>
                  <div className="flex gap-2">
                    {["OUI", "NON", "NEUTRE"].map(choix => (
                      <button key={choix} onClick={() => handleVoter(rv.id, choix)}
                        disabled={voting[rv.id] === choix}
                        className={`flex-1 py-2 text-white text-sm font-bold rounded-xl ${CHOIX_CFG[choix].bg} disabled:opacity-60 transition`}>
                        {voting[rv.id] === choix ? "…" : CHOIX_CFG[choix].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {rv.mon_vote && rv.peut_voter && (
            <div className="flex gap-2 mt-1">
              <p className="text-xs text-slate-500">Changer mon vote :</p>
              {["OUI", "NON", "NEUTRE"].filter(c => c !== rv.mon_vote).map(choix => (
                <button key={choix} onClick={() => handleVoter(rv.id, choix)}
                  disabled={voting[rv.id] === choix}
                  className={`px-3 py-1 text-white text-xs font-semibold rounded-lg ${CHOIX_CFG[choix].bg} disabled:opacity-50 transition`}>
                  {CHOIX_CFG[choix].label}
                </button>
              ))}
            </div>
          )}

          {rv.statut === "CLOTURE" && rv.mon_vote && (
            <p className="text-xs text-slate-400 italic">Vote clôturé · vous avez voté : <strong>{CHOIX_CFG[rv.mon_vote]?.label}</strong></p>
          )}

          {rv.statut === "CLOTURE" && !rv.mon_vote && (
            <p className="text-xs text-slate-400 italic">Vote clôturé · vous n'avez pas voté.</p>
          )}

          {!rv.peut_voter && rv.statut === "EN_COURS" && (
            <p className="text-xs text-slate-400 italic">Le vote n'est pas encore ouvert.</p>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}

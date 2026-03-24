import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── AG résolutions ────────────────────────────────────────────────────────────
const AG_COLS = [
  { key: "PROPOSEE",  label: "Proposée",  color: "bg-slate-100 text-slate-700",    border: "border-slate-300",   dot: "bg-slate-400"   },
  { key: "ADOPTEE",   label: "Adoptée",   color: "bg-emerald-50 text-emerald-800", border: "border-emerald-400", dot: "bg-emerald-500" },
  { key: "REJETEE",   label: "Rejetée",   color: "bg-red-50 text-red-800",         border: "border-red-400",     dot: "bg-red-500"     },
  { key: "AJOURNEE",  label: "Ajournée",  color: "bg-amber-50 text-amber-800",     border: "border-amber-400",   dot: "bg-amber-500"   },
];

// ── Vote résolutions ──────────────────────────────────────────────────────────
const VOTE_COLS = [
  { key: "EN_PREPARATION", label: "En préparation", color: "bg-slate-100 text-slate-700",    border: "border-slate-300",   dot: "bg-slate-400"   },
  { key: "EN_COURS",       label: "En cours",        color: "bg-amber-50 text-amber-800",     border: "border-amber-400",   dot: "bg-amber-500"   },
  { key: "CLOTURE",        label: "Clôturé",          color: "bg-emerald-50 text-emerald-800", border: "border-emerald-400", dot: "bg-emerald-500" },
];

function ColHeader({ col }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${col.color} border ${col.border}`}>
      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
      <span className="text-xs font-bold">{col.label}</span>
      <span className="ml-auto text-xs font-bold opacity-60">{col.count}</span>
    </div>
  );
}

export default function KanbanResolutionsPage() {
  const navigate = useNavigate();
  const [agResolutions,   setAgResolutions]   = useState([]);
  const [voteResolutions, setVoteResolutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/resolutions/",      { credentials: "include" }).then(r => r.json()),
      fetch("/api/resolutions-vote/", { credentials: "include" }).then(r => r.json()),
    ]).then(([ag, vote]) => {
      setAgResolutions(Array.isArray(ag)   ? ag   : (ag.results   ?? []));
      setVoteResolutions(Array.isArray(vote) ? vote : (vote.results ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <button onClick={() => navigate("/gouvernance/dashboard")}
        className="text-sm text-slate-500 hover:text-slate-700 font-medium transition mb-4">
        ← Gouvernance
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kanban Résolutions</h1>
          <p className="text-xs text-slate-400 mt-0.5">Vue consolidée — résolutions AG et résolutions par vote</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/gouvernance/resolutions")}
            className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition">
            ✅ Résolutions AG →
          </button>
          <button onClick={() => navigate("/gouvernance/resolutions-vote")}
            className="px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 transition">
            🗳 Résolutions / Vote →
          </button>
        </div>
      </div>

      {/* ── Section résolutions AG ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">✅</span>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Résolutions — Assemblées Générales</h2>
          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{agResolutions.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AG_COLS.map(col => {
            const items = agResolutions.filter(r => (r.resultat || "PROPOSEE") === col.key);
            return (
              <div key={col.key}>
                <ColHeader col={{ ...col, count: items.length }} />
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-center py-5 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                      Aucune
                    </div>
                  )}
                  {items.map(rv => (
                    <button key={rv.id}
                      onClick={() => navigate(`/gouvernance/resolutions?ag_id=${rv.assemblee_generale}`)}
                      className="w-full text-left bg-white rounded-xl border border-slate-100 px-3 py-2.5 hover:shadow-sm transition">
                      <p className="text-xs font-bold text-slate-500 mb-0.5">Rés. n° {rv.numero}</p>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{rv.titre}</p>
                      {rv.voix_pour != null && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Pour : {rv.voix_pour} · Contre : {rv.voix_contre} · Abs. : {rv.abstention}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section résolutions par vote ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🗳</span>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Résolutions — Vote en ligne</h2>
          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{voteResolutions.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VOTE_COLS.map(col => {
            const items = voteResolutions.filter(r => r.statut === col.key);
            return (
              <div key={col.key}>
                <ColHeader col={{ ...col, count: items.length }} />
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-center py-5 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                      Aucune
                    </div>
                  )}
                  {items.map(rv => (
                    <button key={rv.id}
                      onClick={() => navigate("/gouvernance/resolutions-vote")}
                      className="w-full text-left bg-white rounded-xl border border-slate-100 px-3 py-2.5 hover:shadow-sm transition">
                      <p className="text-sm font-semibold text-slate-800 leading-snug mb-1">{rv.intitule}</p>
                      <p className="text-[10px] text-slate-400">{rv.date_resolution} · {rv.type_vote_label}</p>
                      {rv.assemblee_titre && (
                        <p className="text-[10px] text-indigo-500 mt-0.5">🏛 {rv.assemblee_titre}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                        <span>📨 {rv.nb_notifies}</span>
                        <span>🗳 {rv.nb_votes}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

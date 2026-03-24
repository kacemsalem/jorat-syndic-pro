import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AG_STATUT = {
  PROPOSEE: { label: "Proposée",  cls: "bg-slate-100 text-slate-700"    },
  ADOPTEE:  { label: "Adoptée",   cls: "bg-emerald-50 text-emerald-800" },
  REJETEE:  { label: "Rejetée",   cls: "bg-red-50 text-red-800"         },
  AJOURNEE: { label: "Ajournée",  cls: "bg-amber-50 text-amber-800"     },
};

const VOTE_STATUT = {
  EN_PREPARATION: { label: "En préparation", cls: "bg-slate-100 text-slate-700"    },
  EN_COURS:       { label: "En cours",       cls: "bg-amber-50 text-amber-800"     },
  CLOTURE:        { label: "Clôturé",        cls: "bg-emerald-50 text-emerald-800" },
};

function StatusBadge({ label, cls }) {
  return <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function SourceBadge({ type }) {
  if (type === "AG")
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🏛 AG</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">🗳 Vote en ligne</span>;
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

  const total = agResolutions.length + voteResolutions.length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* Navigation */}
      <div className="mb-4">
        <button onClick={() => navigate("/accueil")}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium transition">
          ← Tableau de bord
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Résolutions</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {total} résolution{total !== 1 ? "s" : ""} — AG et vote en ligne
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate("/gouvernance/resolutions?new=1")}
            className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition">
            + Résolution AG
          </button>
          <button onClick={() => navigate("/gouvernance/resolutions-vote?new=1")}
            className="px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 transition">
            + Vote en ligne
          </button>
        </div>
      </div>

      {/* Liste unifiée */}
      {total === 0 ? (
        <div className="text-center py-16 text-slate-300 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
          Aucune résolution
        </div>
      ) : (
        <div className="space-y-2">

          {/* ── Résolutions AG ── */}
          {agResolutions.map(rv => {
            const statut = rv.resultat || "PROPOSEE";
            const s = AG_STATUT[statut] || { label: statut, cls: "bg-slate-100 text-slate-600" };
            return (
              <button key={`ag-${rv.id}`}
                onClick={() => navigate(`/gouvernance/resolutions?ag_id=${rv.assemblee_generale}`)}
                className="w-full text-left bg-white rounded-xl border border-slate-100 px-4 py-3 hover:shadow-sm hover:border-amber-200 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SourceBadge type="AG" />
                      {rv.numero && <span className="text-[10px] text-slate-400">N° {rv.numero}</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{rv.titre}</p>
                    {rv.voix_pour != null && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Pour : {rv.voix_pour} · Contre : {rv.voix_contre} · Abs. : {rv.abstention}
                      </p>
                    )}
                  </div>
                  <StatusBadge label={s.label} cls={s.cls} />
                </div>
              </button>
            );
          })}

          {/* ── Résolutions vote en ligne ── */}
          {voteResolutions.map(rv => {
            const s = VOTE_STATUT[rv.statut] || { label: rv.statut, cls: "bg-slate-100 text-slate-600" };
            return (
              <button key={`vote-${rv.id}`}
                onClick={() => navigate("/gouvernance/resolutions-vote")}
                className="w-full text-left bg-white rounded-xl border border-slate-100 px-4 py-3 hover:shadow-sm hover:border-violet-200 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SourceBadge type="VOTE" />
                      {rv.date_resolution && <span className="text-[10px] text-slate-400">{rv.date_resolution}</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{rv.intitule}</p>
                    {rv.assemblee_titre && (
                      <p className="text-[10px] text-indigo-500 mt-0.5">🏛 {rv.assemblee_titre}</p>
                    )}
                    {rv.nb_votes > 0 ? (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✔ {rv.nb_oui} OUI</span>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">✘ {rv.nb_non} NON</span>
                        {rv.nb_neutre > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">— {rv.nb_neutre} Neutre</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                        <span>📨 {rv.nb_notifies}</span>
                        <span>🗳 {rv.nb_votes}</span>
                      </div>
                    )}
                  </div>
                  <StatusBadge label={s.label} cls={s.cls} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

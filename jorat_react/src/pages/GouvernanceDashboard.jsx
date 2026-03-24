import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GouvernanceDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ bureau: 0, assemblees: 0, resolutions: 0, documents: 0, votes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bureau-syndical/",       { credentials: "include" }).then(r => r.json()),
      fetch("/api/assemblees/",            { credentials: "include" }).then(r => r.json()),
      fetch("/api/resolutions/",           { credentials: "include" }).then(r => r.json()),
      fetch("/api/documents-gouvernance/", { credentials: "include" }).then(r => r.json()),
      fetch("/api/resolutions-vote/",      { credentials: "include" }).then(r => r.json()),
    ]).then(([bureau, assemblees, resolutions, documents, votes]) => {
      const len = d => Array.isArray(d) ? d.length : (d.results?.length ?? 0);
      setStats({ bureau: len(bureau), assemblees: len(assemblees), resolutions: len(resolutions), documents: len(documents), votes: len(votes) });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Assemblées générales",  value: stats.assemblees,  color: "#10b981", path: "/gouvernance/assemblees",        icon: "📋" },
    { label: "Membres du bureau",     value: stats.bureau,      color: "#0ea5e9", path: "/gouvernance/bureau",            icon: "👥" },
    { label: "Résolutions",           value: stats.resolutions, color: "#f59e0b", path: "/gouvernance/resolutions",       icon: "✅" },
    { label: "Documents",             value: stats.documents,   color: "#ec4899", path: "/gouvernance/documents",         icon: "📄" },
    { label: "Résolutions par vote",  value: stats.votes,       color: "#8b5cf6", path: "/gouvernance/resolutions-vote",  icon: "🗳" },
  ];

  const links = [
    { label: "Assemblées Générales",  path: "/gouvernance/assemblees",          color: "bg-slate-800" },
    { label: "Bureau Syndical",       path: "/gouvernance/bureau",              color: "bg-slate-800" },
    { label: "Résolutions",           path: "/gouvernance/resolutions",         color: "bg-slate-800" },
    { label: "Documents",             path: "/gouvernance/documents",           color: "bg-slate-800" },
    { label: "🗳 Résolutions / Vote", path: "/gouvernance/resolutions-vote",    color: "bg-violet-600 hover:bg-violet-700" },
    { label: "📋 Kanban Résolutions", path: "/gouvernance/kanban-resolutions",  color: "bg-indigo-600 hover:bg-indigo-700" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gouvernance</h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble du module de gouvernance</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {cards.map(c => (
            <button key={c.path} onClick={() => navigate(c.path)}
              className="text-left bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition"
              style={{ borderTop: `3px solid ${c.color}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">{c.icon}</div>
                <span className="text-sm font-semibold text-slate-500">{c.label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</div>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Accès rapide</h2>
        <div className="flex flex-wrap gap-3">
          {links.map(l => (
            <button key={l.path} onClick={() => navigate(l.path)}
              className={`px-4 py-2 text-white text-sm font-semibold rounded-xl transition ${l.color ?? "bg-slate-800 hover:bg-slate-700"}`}>
              {l.label} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

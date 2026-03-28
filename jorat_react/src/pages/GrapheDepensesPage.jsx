import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ChartDepenses from "../components/ChartDepenses";

const fmt = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

export default function GrapheDepensesPage() {
  const navigate = useNavigate();
  const [allDepenses, setAllDepenses] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [year,        setYear]        = useState(null);
  const [fetchError,  setFetchError]  = useState("");

  useEffect(() => {
    fetch("/api/depenses/", { credentials: "include" })
      .then(r => {
        if (!r.ok) { setFetchError(`Erreur API ${r.status}`); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        const all = Array.isArray(d) ? d : (d.results ?? []);
        setAllDepenses(all);
        const yrs = [...new Set(all.map(x => x.date_depense?.slice(0, 4)).filter(Boolean))]
          .map(Number).sort((a, b) => a - b);
        if (yrs.length > 0) setYear(yrs[yrs.length - 1]);
      })
      .catch(err => setFetchError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() =>
    [...new Set(allDepenses.map(x => x.date_depense?.slice(0, 4)).filter(Boolean))]
      .map(Number).sort((a, b) => a - b)
  , [allDepenses]);

  const depenses = useMemo(() =>
    year ? allDepenses.filter(d => d.date_depense?.startsWith(String(year))) : allDepenses
  , [allDepenses, year]);

  const total = useMemo(() =>
    depenses.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0)
  , [depenses]);

  const catCount = useMemo(() =>
    new Set(depenses.map(d => d.modele_categorie_nom || d.categorie_nom).filter(Boolean)).size
  , [depenses]);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <button onClick={() => navigate("/analyse")}
          className="flex items-center gap-1 text-white/70 text-[10px] font-semibold mb-3 hover:text-white transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour Analyse
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Analyse · Dépenses</p>
            <h1 className="text-white font-bold text-lg leading-tight">Évolution des dépenses</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Répartition mensuelle par catégorie</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* Year selector */}
        {years.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Exercice</span>
            <div className="flex gap-1 flex-wrap">
              {years.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                    y === year ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total {year ?? ""}
            </p>
            <p className="text-base font-bold text-blue-600 leading-none">{fmt(total)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catégories</p>
            <p className="text-base font-bold text-slate-800 leading-none">{catCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">utilisées</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Montants mensuels{year ? ` — ${year}` : ""}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <p className="text-center text-red-500 text-sm py-8">{fetchError}</p>
          ) : (
            <ChartDepenses depenses={depenses} />
          )}
        </div>

      </div>
    </div>
  );
}

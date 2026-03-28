import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ChartDepenses from "../components/ChartDepenses";

const fmt = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

export default function GrapheDepensesPage() {
  const navigate = useNavigate();
  const [depenses, setDepenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/depenses/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setDepenses(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalGeneral = useMemo(() =>
    depenses.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0)
  , [depenses]);

  const thisYear = new Date().getFullYear().toString();
  const totalAnnee = useMemo(() =>
    depenses.filter(d => d.date_depense?.startsWith(thisYear))
            .reduce((s, d) => s + (parseFloat(d.montant) || 0), 0)
  , [depenses]);

  const catCount = useMemo(() =>
    new Set(depenses.map(d => d.modele_categorie_nom || d.categorie_nom).filter(Boolean)).size
  , [depenses]);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <button onClick={() => navigate("/analyse")}
          className="flex items-center gap-1 text-white/70 text-[10px] font-semibold mb-3 hover:text-white transition">
          ← Retour Analyse
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

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total général</p>
            <p className="text-lg font-bold text-slate-800 leading-none">{fmt(totalGeneral)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{thisYear}</p>
            <p className="text-lg font-bold text-blue-600 leading-none">{fmt(totalAnnee)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catégories</p>
            <p className="text-lg font-bold text-slate-800 leading-none">{catCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">utilisées</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Montants mensuels</p>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ChartDepenses depenses={depenses} />
          )}
        </div>

      </div>
    </div>
  );
}

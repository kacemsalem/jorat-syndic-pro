import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChartCaisse from "../components/ChartCaisse";

const fmt = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

export default function GrapheCaissePage() {
  const navigate = useNavigate();
  const [mouvements, setMouvements] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch("/api/caisse-mouvements/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMouvements(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const balance = mouvements.reduce((acc, m) => {
    const v = parseFloat(m.montant) || 0;
    return m.sens === "DEBIT" ? acc + v : acc - v;
  }, 0);

  const totalEntrees = mouvements.filter(m => m.sens === "DEBIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0);
  const totalSorties = mouvements.filter(m => m.sens === "CREDIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0);

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
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Analyse · Caisse</p>
            <h1 className="text-white font-bold text-lg leading-tight">Évolution de la caisse</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Solde cumulé mois par mois</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-2xl border px-4 py-3 ${balance >= 0 ? "bg-white border-slate-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Solde actuel</p>
            <p className={`text-xl font-bold leading-none ${balance >= 0 ? "text-slate-800" : "text-red-600"}`}>
              {fmt(balance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entrées</p>
            <p className="text-xl font-bold text-emerald-600 leading-none">+{fmt(totalEntrees)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sorties</p>
            <p className="text-xl font-bold text-red-500 leading-none">−{fmt(totalSorties)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">MAD</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Solde par mois</p>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ChartCaisse mouvements={mouvements} />
          )}
        </div>

        {/* Nb mouvements */}
        <p className="text-center text-[11px] text-slate-400">
          {mouvements.length} mouvement{mouvements.length !== 1 ? "s" : ""} au total
        </p>

      </div>
    </div>
  );
}

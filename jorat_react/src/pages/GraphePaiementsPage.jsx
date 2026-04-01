import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChartPaiements from "../components/ChartPaiements";

export default function GraphePaiementsPage() {
  const navigate = useNavigate();
  const [years,       setYears]       = useState([]);
  const [year,        setYear]        = useState(new Date().getFullYear());
  const [loadingYears, setLoadingYears] = useState(true);

  // Fetch available years from both CHARGE and FOND (merged)
  useEffect(() => {
    Promise.all([
      fetch("/api/situation-paiements/?type_charge=CHARGE", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
      fetch("/api/situation-paiements/?type_charge=FOND",   { credentials: "include" }).then(r => r.json()).catch(() => ({})),
    ])
      .then(([dc, df]) => {
        const yrs = [...new Set([...(dc.years || []), ...(df.years || [])])].sort((a, b) => a - b);
        if (yrs.length > 0) {
          setYears(yrs);
          const cur = new Date().getFullYear();
          setYear(yrs.includes(cur) ? cur : yrs[yrs.length - 1]);
        }
      })
      .finally(() => setLoadingYears(false));
  }, []);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-10">
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
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 1 0 20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Analyse · Paiements</p>
            <h1 className="text-white font-bold text-lg leading-tight">État des paiements</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">Charge · Fond — soldés · partiels · impayés</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* Year selector */}
        {!loadingYears && years.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exercice</span>
            <div className="flex gap-1 flex-wrap">
              {years.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                    y === year ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Two donuts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Appel de charge</p>
            </div>
            <ChartPaiements typeCharge="CHARGE" year={year} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Appel de fond</p>
            </div>
            <ChartPaiements typeCharge="FOND" year={year} />
          </div>
        </div>

        {/* Link to synthese */}
        <button onClick={() => navigate("/synthese")}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center justify-between hover:shadow-md active:scale-[0.98] transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800">Voir la synthèse détaillée</p>
              <p className="text-[10px] text-slate-400">Tableau lot par lot avec montants</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}

export default function EtatMensuelPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const m = String(month + 1).padStart(2, "0");
    const deb = `${year}-${m}-01`;
    // last day of month
    const fin = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    fetch(`/api/rapport-financier/?date_debut=${deb}&date_fin=${fin}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  // Cross-table: paiements par lot × mois (année complète)
  const [crossData, setCrossData] = useState(null);
  useEffect(() => {
    fetch(`/api/situation-paiements/?year=${year}&type_charge=CHARGE`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCrossData(d))
      .catch(() => {});
  }, [year]);

  const entrees = data?.mouvements?.filter(m => parseFloat(m.credit) > 0) || [];
  const sorties = data?.mouvements?.filter(m => parseFloat(m.debit) > 0) || [];

  // Build cross table: lot → 12 booleans (payé ce mois?)
  const crossRows = useMemo(() => {
    if (!crossData?.lots) return [];
    return crossData.lots.map(lot => {
      const paid = Array(12).fill(false);
      lot.paiements.forEach(p => {
        const d = new Date(p.date);
        if (d.getFullYear() === year) {
          paid[d.getMonth()] = true;
        }
      });
      return { lot: lot.lot_numero, nom: lot.proprietaire_nom, paid };
    });
  }, [crossData, year]);

  const yearOptions = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) yearOptions.push(y);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Tableau de bord</button>

      {/* Header + filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">État mensuel</h1>
          <p className="text-xs text-slate-400 mt-0.5">Entrées / Sorties du mois · Suivi paiements annuel</p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none">
            {MOIS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Entrées",  value: fmt(data.entrees),         color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Sorties",  value: fmt(data.sorties),         color: "text-red-600",     bg: "bg-red-50 border-red-100"         },
              { label: "Balance",  value: fmt(data.balance),         color: parseFloat(data.balance) >= 0 ? "text-emerald-600" : "text-red-600", bg: "bg-slate-50 border-slate-100" },
              { label: "Paiements", value: fmt(data.total_paiements), color: "text-sky-600",    bg: "bg-sky-50 border-sky-100"          },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border p-3 ${k.bg}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
                <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-400">MAD</p>
              </div>
            ))}
          </div>

          {/* Entrées / Sorties colonnes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Entrées */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Entrées — {MOIS_FULL[month]}</span>
                <span className="text-xs font-bold text-emerald-600">{entrees.length}</span>
              </div>
              {entrees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucune entrée ce mois</p>
              ) : (
                <div className="p-2 space-y-1">
                  {entrees.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-50/50 px-2.5 py-2 hover:bg-emerald-50 transition">
                      <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">{m.date}</span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{m.libelle}</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 shrink-0">{fmt(m.credit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sorties */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Sorties — {MOIS_FULL[month]}</span>
                <span className="text-xs font-bold text-red-600">{sorties.length}</span>
              </div>
              {sorties.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucune sortie ce mois</p>
              ) : (
                <div className="p-2 space-y-1">
                  {sorties.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50/50 px-2.5 py-2 hover:bg-red-50 transition">
                      <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">{m.date}</span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{m.libelle}</span>
                      <span className="text-xs font-bold font-mono text-red-600 shrink-0">{fmt(m.debit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Tableau croisé paiements ── */}
      {crossRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">État global paiements {year}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold min-w-[80px] sticky left-0 bg-white">Lot</th>
                  <th className="text-left px-2 py-2 text-slate-400 font-medium min-w-[100px]">Propriétaire</th>
                  {MOIS.map((m, i) => (
                    <th key={i} className={`px-1 py-2 text-center font-semibold w-9 ${i === month ? "text-emerald-700 bg-emerald-50" : "text-slate-400"}`}>{m}</th>
                  ))}
                  <th className="px-2 py-2 text-right text-slate-400 font-medium">Payés</th>
                </tr>
              </thead>
              <tbody>
                {crossRows.map((row, ri) => {
                  const nbPaid = row.paid.filter(Boolean).length;
                  return (
                    <tr key={ri} className={`border-b border-slate-50 ${ri % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-3 py-1.5 font-bold text-slate-700 sticky left-0 bg-inherit">{row.lot}</td>
                      <td className="px-2 py-1.5 text-slate-500 truncate max-w-[120px]">{row.nom || "—"}</td>
                      {row.paid.map((p, mi) => (
                        <td key={mi} className={`px-1 py-1.5 text-center ${mi === month ? "bg-emerald-50/60" : ""}`}>
                          {p ? (
                            <span className="inline-block w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold leading-5">✓</span>
                          ) : (
                            <span className="inline-block w-5 h-5 rounded-full bg-slate-100 text-slate-300 text-[9px] flex items-center justify-center leading-5">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right">
                        <span className={`font-bold ${nbPaid === 12 ? "text-emerald-600" : nbPaid > 6 ? "text-amber-600" : "text-red-500"}`}>
                          {nbPaid}/12
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

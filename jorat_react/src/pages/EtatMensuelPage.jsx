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
  const [availableYears, setAvailableYears] = useState([]);

  // Fetch all years with financial activity (dépenses + recettes + paiements)
  useEffect(() => {
    fetch(`/api/annees-activite/`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) setAvailableYears(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/situation-paiements/?year=${year}&type_charge=CHARGE`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCrossData(d))
      .catch(() => {});
  }, [year]);

  const paiements = data?.mouvements?.filter(m => parseFloat(m.debit)  > 0) || [];
  const depenses  = data?.mouvements?.filter(m => parseFloat(m.credit) > 0) || [];

  // Build cross table: carry-over logic filtrée <= fin du mois sélectionné
  const crossRows = useMemo(() => {
    if (!crossData?.lots) return [];
    const cutoff = new Date(year, month + 1, 0); // dernier jour du mois sélectionné
    cutoff.setHours(23, 59, 59, 999);
    return crossData.lots.map(lot => {
      const totalDu = parseFloat(lot.total_du || 0);
      // Seulement les paiements dont la date <= cutoff
      const paiementsFiltres = (lot.paiements || []).filter(p => {
        if (!p.date) return true; // si pas de date, on inclut
        return new Date(p.date) <= cutoff;
      });
      const totalPaid = paiementsFiltres.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCovered = totalDu > 0 ? (totalPaid / totalDu) * 12 : 0;
      const paid = Array(12).fill(false).map((_, i) => i < monthsCovered);
      const pct = totalDu > 0 ? Math.min((totalPaid / totalDu) * 100, 100) : 0;
      return { lot: lot.lot, nom: lot.nom, paid, pct, monthsCovered, totalDu, totalPaid };
    });
  }, [crossData, year, month]);

  const yearOptions = availableYears.length ? availableYears : [now.getFullYear()];

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">État mensuel</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {yearOptions.map(y => <option key={y} value={y} className="text-slate-800">{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {MOIS_FULL.map((m, i) => <option key={i} value={i} className="text-slate-800">{m}</option>)}
            </select>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-1">Paiements reçus · Dépenses du mois</p>
      </div>
      <div className="px-4 -mt-5 pb-24 max-w-5xl mx-auto space-y-4">

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
              { label: "Paiements reçus", value: fmt(data.entrees),         color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Dépenses",       value: fmt(data.sorties),         color: "text-red-600",     bg: "bg-red-50 border-red-100"         },
              { label: "Balance",        value: fmt(data.balance),         color: parseFloat(data.balance) >= 0 ? "text-emerald-600" : "text-red-600", bg: "bg-slate-50 border-slate-100" },
              { label: "Total paiements",value: fmt(data.total_paiements), color: "text-sky-600",    bg: "bg-sky-50 border-sky-100"          },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border p-3 ${k.bg}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
                <p className={`text-base font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-400">MAD</p>
              </div>
            ))}
          </div>

          {/* Paiements / Dépenses colonnes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paiements reçus */}
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Paiements reçus — {MOIS_FULL[month]}</span>
                <span className="text-xs font-bold text-emerald-600">{paiements.length}</span>
              </div>
              {paiements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucun paiement ce mois</p>
              ) : (
                <div className="p-2 space-y-1">
                  {paiements.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-50/50 px-2.5 py-2 hover:bg-emerald-50 transition">
                      <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">{m.date}</span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{m.libelle}</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 shrink-0">{fmt(m.debit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dépenses */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Dépenses — {MOIS_FULL[month]}</span>
                <span className="text-xs font-bold text-red-600">{depenses.length}</span>
              </div>
              {depenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucune dépense ce mois</p>
              ) : (
                <div className="p-2 space-y-1">
                  {depenses.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50/50 px-2.5 py-2 hover:bg-red-50 transition">
                      <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">{m.date}</span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{m.libelle}</span>
                      <span className="text-xs font-bold font-mono text-red-600 shrink-0">{fmt(m.credit)}</span>
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
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Avancement paiements au {MOIS_FULL[month]} {year}</span>
            <span className="text-[10px] text-slate-400">Paiements reçus ≤ fin <span className="font-semibold text-emerald-600">{MOIS[month]}</span> · carry-over</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {/* Lot number — sticky left */}
                  <th className="text-left px-3 py-2 text-slate-600 font-bold w-16 sticky left-0 bg-slate-50/90 z-10">Lot</th>
                  <th className="text-left px-2 py-2 text-slate-400 font-medium min-w-[90px] max-w-[130px]">Propriétaire</th>
                  {MOIS.map((m, i) => (
                    <th key={i} className={`px-0.5 py-2 text-center font-bold w-8 ${i === month ? "text-emerald-700 bg-emerald-100/70" : "text-slate-400"}`}>{m}</th>
                  ))}
                  <th className="px-2 py-2 text-center text-slate-400 font-medium w-16">%</th>
                </tr>
              </thead>
              <tbody>
                {crossRows.map((row, ri) => {
                  const nbPaid = row.paid.filter(Boolean).length;
                  const pct = Math.round(row.pct);
                  const allPaid = nbPaid === 12;
                  return (
                    <tr key={ri} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors`}>
                      {/* Lot — sticky */}
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">
                        <span className="font-bold text-indigo-700 text-xs">{row.lot}</span>
                      </td>
                      <td className="px-2 py-2 text-slate-500 text-[11px] truncate max-w-[130px]">{row.nom || "—"}</td>
                      {row.paid.map((p, mi) => {
                        const isCurrent = mi === month;
                        return (
                          <td key={mi} className={`px-0.5 py-2 text-center ${isCurrent ? "bg-emerald-50" : ""}`}>
                            {p ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">✓</span>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                                isCurrent ? "bg-amber-100 text-amber-400" : "bg-slate-100 text-slate-300"
                              }`}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-[10px] font-bold ${allPaid ? "text-emerald-600" : pct > 50 ? "text-amber-600" : "text-red-500"}`}>
                            {pct}%
                          </span>
                          <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`,
                              background: allPaid ? "#10b981" : pct > 50 ? "#f59e0b" : "#ef4444"
                            }} />
                          </div>
                        </div>
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
    </div>
  );
}

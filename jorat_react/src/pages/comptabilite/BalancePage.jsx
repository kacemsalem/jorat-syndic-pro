import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

export default function BalancePage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set("date_debut", dateDebut);
    if (dateFin)   params.set("date_fin",   dateFin);
    fetch(`/api/comptabilite/balance/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin]);

  const qParams = new URLSearchParams();
  if (dateDebut) qParams.set("date_debut", dateDebut);
  if (dateFin)   qParams.set("date_fin",   dateFin);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 sm:px-8 pt-8 pb-14">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Balance comptable</h1>
            <p className="text-violet-200 text-sm mt-1">Soldes cumulés par compte</p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`/api/comptabilite/balance/excel/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              Excel
            </a>
            <a href={`/api/comptabilite/balance/pdf/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Du</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Au</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : !data ? null : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-24">Compte</th>
                    <th className="text-left px-4 py-3">Intitulé</th>
                    <th className="text-right px-4 py-3">Total débit</th>
                    <th className="text-right px-4 py-3">Total crédit</th>
                    <th className="text-right px-4 py-3">Solde débiteur</th>
                    <th className="text-right px-4 py-3">Solde créditeur</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((row, i) => {
                    const sd = parseFloat(row.solde_debiteur  || 0);
                    const sc = parseFloat(row.solde_crediteur || 0);
                    return (
                      <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700 text-xs">{row.compte_code}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.compte_libelle}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600">{fmt(row.total_debit)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-green-600">{fmt(row.total_credit)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                          {sd > 0 ? <span className="text-slate-800">{fmt(sd)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">
                          {sc > 0 ? <span className="text-slate-800">{fmt(sc)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white font-bold text-xs">
                    <td colSpan={2} className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.grand_debit)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.grand_credit)}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden">
              {(data.rows || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400">Aucune donnée</div>
              ) : (
                <>
                  <div className="divide-y divide-slate-50">
                    {(data.rows || []).map((row, i) => {
                      const sd = parseFloat(row.solde_debiteur  || 0);
                      const sc = parseFloat(row.solde_crediteur || 0);
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.compte_code}</span>
                                <span className="text-sm text-slate-700 truncate">{row.compte_libelle}</span>
                              </div>
                              <div className="flex gap-3 mt-1">
                                <span className="text-xs text-red-500 font-mono">D {fmt(row.total_debit)}</span>
                                <span className="text-xs text-green-600 font-mono">C {fmt(row.total_credit)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {sd > 0 && <div className="text-xs font-mono font-semibold text-slate-800">SD {fmt(sd)}</div>}
                              {sc > 0 && <div className="text-xs font-mono font-semibold text-slate-800">SC {fmt(sc)}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-slate-800 text-white px-4 py-3 flex justify-between text-xs font-bold">
                    <span>TOTAL</span>
                    <div className="flex gap-4">
                      <span className="text-red-300">D {fmt(data.grand_debit)}</span>
                      <span className="text-green-300">C {fmt(data.grand_credit)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Balance comptable</h1>
          <p className="text-sm text-slate-500 mt-1">Soldes cumulés par compte</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/comptabilite/balance/excel/?${qParams}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition">
            Excel
          </a>
          <a href={`/api/comptabilite/balance/pdf/?${qParams}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition">
            PDF
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Du</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Au</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : !data ? null : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
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
        </div>
      )}
    </div>
  );
}

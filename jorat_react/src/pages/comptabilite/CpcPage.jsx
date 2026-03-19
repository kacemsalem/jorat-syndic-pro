import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function Section({ title, rows, total, color, textColor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`px-5 py-3 ${color}`}>
        <h2 className={`font-bold text-sm uppercase tracking-wider ${textColor}`}>{title}</h2>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="px-5 py-4 text-slate-400 text-center">Aucune donnée</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
              <td className="px-5 py-2.5 font-mono text-xs text-slate-500 w-20">{row.compte_code}</td>
              <td className="px-4 py-2.5 text-slate-700">{row.compte_libelle}</td>
              <td className="px-5 py-2.5 text-right font-mono text-sm font-semibold text-slate-800">{fmt(row.montant)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`${color} font-bold`}>
            <td colSpan={2} className={`px-5 py-3 text-sm ${textColor}`}>Total {title.toLowerCase()}</td>
            <td className={`px-5 py-3 text-right font-mono ${textColor}`}>{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CpcPage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set("date_debut", dateDebut);
    if (dateFin)   params.set("date_fin",   dateFin);
    fetch(`/api/comptabilite/cpc/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin]);

  const qParams = new URLSearchParams();
  if (dateDebut) qParams.set("date_debut", dateDebut);
  if (dateFin)   qParams.set("date_fin",   dateFin);

  const resultat = data ? parseFloat(data.resultat || 0) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compte de Produits et Charges</h1>
          <p className="text-sm text-slate-500 mt-1">CPC — Résultat de l'exercice</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/comptabilite/cpc/excel/?${qParams}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition">
            Excel
          </a>
          <a href={`/api/comptabilite/cpc/pdf/?${qParams}`}
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
        <>
          <Section
            title="Charges"
            rows={data.charges || []}
            total={data.total_charges}
            color="bg-red-50"
            textColor="text-red-700"
          />
          <Section
            title="Produits"
            rows={data.produits || []}
            total={data.total_produits}
            color="bg-green-50"
            textColor="text-green-700"
          />

          {/* Résultat */}
          <div className={`rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm border ${
            resultat >= 0
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Résultat net de l'exercice</div>
              <div className="text-xs text-slate-400">Produits — Charges = {fmt(data.total_produits)} — {fmt(data.total_charges)}</div>
            </div>
            <div className={`text-3xl font-bold font-mono ${resultat >= 0 ? "text-green-700" : "text-red-700"}`}>
              {resultat >= 0 ? "+" : ""}{fmt(resultat)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

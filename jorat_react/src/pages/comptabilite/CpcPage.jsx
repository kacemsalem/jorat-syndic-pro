import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function Section({ title, rows, total, headerClass, totalClass, mobileAccentClass }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`px-5 py-3 ${headerClass}`}>
        <h2 className="font-bold text-sm uppercase tracking-wider">{title}</h2>
      </div>
      {/* Desktop */}
      <table className="w-full text-sm hidden sm:table">
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
          <tr className={`${totalClass} font-bold`}>
            <td colSpan={2} className="px-5 py-3 text-sm">Total {title.toLowerCase()}</td>
            <td className="px-5 py-3 text-right font-mono">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
      {/* Mobile */}
      <div className="sm:hidden">
        {rows.length === 0 ? (
          <div className="px-5 py-4 text-slate-400 text-center">Aucune donnée</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((row, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={`text-xs font-mono ${mobileAccentClass} bg-opacity-10 px-1.5 py-0.5 rounded mr-2`}>{row.compte_code}</span>
                  <span className="text-sm text-slate-700">{row.compte_libelle}</span>
                </div>
                <span className="font-mono font-semibold text-sm text-slate-800 shrink-0">{fmt(row.montant)}</span>
              </div>
            ))}
          </div>
        )}
        <div className={`${totalClass} px-4 py-3 flex justify-between font-bold text-sm`}>
          <span>Total {title.toLowerCase()}</span>
          <span className="font-mono">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CpcPage() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");
  const [years, setYears]         = useState([]);
  const [year, setYear]           = useState(null);

  useEffect(() => {
    fetch("/api/comptabilite/annees/", { credentials: "include" })
      .then(r => r.json()).then(d => setYears(d.annees || [])).catch(() => {});
  }, []);

  const selectYear = (y) => {
    setYear(y);
    if (y) { setDateDebut(`${y}-01-01`); setDateFin(`${y}-12-31`); }
    else   { setDateDebut(""); setDateFin(""); }
  };

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
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 sm:px-8 pt-8 pb-14">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Compte de Produits et Charges</h1>
            <p className="text-violet-200 text-sm mt-1">CPC — Résultat de l'exercice</p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`/api/comptabilite/cpc/excel/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              Excel
            </a>
            <a href={`/api/comptabilite/cpc/pdf/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Du</label>
            <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setYear(null); }}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Au</label>
            <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setYear(null); }}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          {years.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              {years.map(y => (
                <button key={y} onClick={() => selectYear(year === y ? null : y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    year === y ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : !data ? null : (
          <>
            <Section
              title="Charges"
              rows={data.charges || []}
              total={data.total_charges}
              headerClass="bg-red-50 text-red-700"
              totalClass="bg-red-50 text-red-700"
              mobileAccentClass="text-red-600"
            />
            <Section
              title="Produits"
              rows={data.produits || []}
              total={data.total_produits}
              headerClass="bg-green-50 text-green-700"
              totalClass="bg-green-50 text-green-700"
              mobileAccentClass="text-green-700"
            />

            {/* Résultat */}
            <div className={`rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm border ${
              resultat >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
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
    </div>
  );
}

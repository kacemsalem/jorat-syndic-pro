import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function BilanBlock({ title, rows, total, headerClass, borderClass, textClass }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 ${borderClass} overflow-hidden`}>
      <div className={`px-5 py-3 ${headerClass}`}>
        <h2 className={`font-bold text-sm uppercase tracking-wider ${textClass}`}>{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
            <div>
              <div className="text-sm text-slate-700">{row.label}</div>
              {row.sub && <div className="text-xs text-slate-400 mt-0.5">{row.sub}</div>}
            </div>
            <div className={`font-mono font-semibold text-sm ${row.negative ? "text-red-600" : "text-slate-800"}`}>
              {fmt(row.value)}
            </div>
          </div>
        ))}
      </div>
      <div className={`px-5 py-3 flex items-center justify-between ${headerClass} border-t-2 ${borderClass}`}>
        <span className={`font-bold text-sm ${textClass}`}>TOTAL {title}</span>
        <span className={`font-mono font-bold text-base ${textClass}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function BilanPage() {
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
    fetch(`/api/comptabilite/bilan/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin]);

  const qParams = new URLSearchParams();
  if (dateDebut) qParams.set("date_debut", dateDebut);
  if (dateFin)   qParams.set("date_fin",   dateFin);

  const actif  = data?.actif  || {};
  const passif = data?.passif || {};
  const resultat = parseFloat(passif.resultat_net || 0);

  const actifRows = [
    { label: "Trésorerie nette",         sub: "Compte 512 — Banque/Trésorerie",          value: actif.tresorerie_nette, negative: parseFloat(actif.tresorerie_nette) < 0 },
    { label: "Créances copropriétaires", sub: "Compte 342 — Appels non encore recouvrés", value: actif.creances_copro },
  ];
  const passifRows = [
    { label: "Résultat net de l'exercice", sub: "Produits — Charges",    value: passif.resultat_net, negative: resultat < 0 },
    { label: "Fonds travaux collectés",    sub: "Appels de fonds reçus", value: passif.fonds_travaux },
    { label: "Avances copropriétaires",    sub: "Total paiements reçus", value: passif.avances_copro },
  ];

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 sm:px-8 pt-8 pb-14">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Bilan simplifié</h1>
            <p className="text-violet-200 text-sm mt-1">Situation patrimoniale de la résidence</p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`/api/comptabilite/bilan/excel/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              Excel
            </a>
            <a href={`/api/comptabilite/bilan/pdf/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="max-w-2xl mx-auto px-4 sm:px-8 -mt-6">
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

      {/* Content — stacked: Actif then Passif */}
      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : !data ? null : (
          <>
            <BilanBlock
              title="Actif"
              rows={actifRows}
              total={actif.total}
              headerClass="bg-blue-50"
              borderClass="border-blue-200"
              textClass="text-blue-800"
            />
            <BilanBlock
              title="Passif"
              rows={passifRows}
              total={passif.total}
              headerClass="bg-green-50"
              borderClass="border-green-200"
              textClass="text-green-800"
            />
            <div className="text-xs text-slate-400 text-center pt-1">
              Note : Les totaux Actif / Passif peuvent différer en l'absence de centralisation complète des appels de charge.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

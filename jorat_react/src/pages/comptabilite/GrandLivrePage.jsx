import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

export default function GrandLivrePage() {
  const [comptes, setComptes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");
  const [search, setSearch]       = useState("");
  const [openComptes, setOpenComptes] = useState({});
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
    if (search)    params.set("compte",     search);
    fetch(`/api/comptabilite/grand-livre/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setComptes(d.comptes || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin, search]);

  const toggle = (code) => setOpenComptes(prev => ({ ...prev, [code]: !prev[code] }));

  const qParams = new URLSearchParams();
  if (dateDebut) qParams.set("date_debut", dateDebut);
  if (dateFin)   qParams.set("date_fin",   dateFin);
  if (search)    qParams.set("compte",     search);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 sm:px-8 pt-8 pb-14">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Grand Livre</h1>
            <p className="text-violet-200 text-sm mt-1">Mouvements groupés par compte</p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={`/api/comptabilite/grand-livre/excel/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              Excel
            </a>
            <a href={`/api/comptabilite/grand-livre/pdf/?${qParams}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Filters card */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 -mt-6">
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par compte…"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400 w-48 flex-1 min-w-[140px]" />
          {years.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Exercice</span>
              {[null, ...years].map(y => (
                <button key={y ?? "all"} onClick={() => selectYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    year === y ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {y ?? "Tous"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : comptes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">Aucune écriture</div>
        ) : (
          comptes.map(compte => {
            const isOpen = openComptes[compte.compte_code] ?? true;
            const solde  = parseFloat(compte.solde || 0);
            return (
              <div key={compte.compte_code} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Compte header */}
                <button
                  onClick={() => toggle(compte.compte_code)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {compte.compte_code}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{compte.compte_libelle}</span>
                    <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                      {compte.entries.length} écriture{compte.entries.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-sm ml-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">Débit</div>
                      <div className="font-mono font-semibold text-red-600 text-xs">{fmt(compte.total_debit)}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">Crédit</div>
                      <div className="font-mono font-semibold text-green-600 text-xs">{fmt(compte.total_credit)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Solde</div>
                      <div className={`font-mono font-bold text-sm ${solde >= 0 ? "text-slate-800" : "text-red-600"}`}>
                        {fmt(solde)}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"
                      style={{ transition: "transform 200ms", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* Entries */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500">
                            <th className="text-left px-5 py-2 font-semibold">Date</th>
                            <th className="text-left px-4 py-2 font-semibold">Type</th>
                            <th className="text-left px-4 py-2 font-semibold">Pièce</th>
                            <th className="text-left px-4 py-2 font-semibold">Libellé</th>
                            <th className="text-right px-4 py-2 font-semibold">Débit</th>
                            <th className="text-right px-4 py-2 font-semibold">Crédit</th>
                            <th className="text-right px-5 py-2 font-semibold">Solde cumulé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compte.entries.map((e, i) => {
                            const debit  = parseFloat(e.debit  || 0);
                            const credit = parseFloat(e.credit || 0);
                            const s      = parseFloat(e.solde  || 0);
                            return (
                              <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/80 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                                <td className="px-5 py-2 text-slate-500 font-mono text-xs whitespace-nowrap">{e.date}</td>
                                <td className="px-4 py-2 text-xs text-slate-500">{e.type}</td>
                                <td className="px-4 py-2 font-mono text-xs text-slate-400">{e.piece || "—"}</td>
                                <td className="px-4 py-2 text-slate-700 max-w-[260px] truncate">{e.libelle}</td>
                                <td className="px-4 py-2 text-right font-mono text-xs">
                                  {debit > 0 ? <span className="text-red-600 font-semibold">{fmt(debit)}</span> : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-xs">
                                  {credit > 0 ? <span className="text-green-600 font-semibold">{fmt(credit)}</span> : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-5 py-2 text-right font-mono text-xs font-semibold text-slate-700">{fmt(s)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-slate-50">
                      {compte.entries.map((e, i) => {
                        const debit  = parseFloat(e.debit  || 0);
                        const credit = parseFloat(e.credit || 0);
                        const s      = parseFloat(e.solde  || 0);
                        return (
                          <div key={i} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-mono text-slate-400">{e.date} · {e.type}</div>
                                <div className="text-sm text-slate-700 mt-0.5 truncate">{e.libelle}</div>
                                {e.piece && <div className="text-xs text-slate-400 mt-0.5">{e.piece}</div>}
                              </div>
                              <div className="text-right shrink-0">
                                {debit > 0 && <div className="text-xs font-mono font-semibold text-red-600">D {fmt(debit)}</div>}
                                {credit > 0 && <div className="text-xs font-mono font-semibold text-green-600">C {fmt(credit)}</div>}
                                <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">= {fmt(s)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

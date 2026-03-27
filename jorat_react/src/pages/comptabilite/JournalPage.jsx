import { useState, useEffect, useMemo } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

const TYPE_COLORS = {
  "Dépense": "bg-red-100 text-red-700",
  "Recette": "bg-green-100 text-green-700",
};

export default function JournalPage() {
  const [entries, setEntries]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dateDebut, setDateDebut]       = useState("");
  const [dateFin, setDateFin]           = useState("");
  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState("");
  const [filterAttente, setFilterAttente] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set("date_debut", dateDebut);
    if (dateFin)   params.set("date_fin",   dateFin);
    fetch(`/api/comptabilite/journal/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin]);

  const nbAttente = useMemo(() => entries.filter(e => e.compte_code === "000").length, [entries]);

  const filtered = useMemo(() => {
    let rows = entries;
    if (filterType)    rows = rows.filter(e => e.type === filterType);
    if (filterAttente) rows = rows.filter(e => e.compte_code === "000");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(e =>
        e.libelle?.toLowerCase().includes(q) ||
        e.compte_code?.toLowerCase().includes(q) ||
        e.compte_libelle?.toLowerCase().includes(q) ||
        e.piece?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [entries, filterType, filterAttente, search]);

  const totalDebit  = useMemo(() => filtered.reduce((s, e) => s + parseFloat(e.debit  || 0), 0), [filtered]);
  const totalCredit = useMemo(() => filtered.reduce((s, e) => s + parseFloat(e.credit || 0), 0), [filtered]);

  const qExcel = new URLSearchParams();
  if (dateDebut) qExcel.set("date_debut", dateDebut);
  if (dateFin)   qExcel.set("date_fin",   dateFin);
  const excelUrl = `/api/comptabilite/journal/excel/?${qExcel}`;
  const pdfUrl   = `/api/comptabilite/journal/pdf/?${qExcel}`;

  const types = [...new Set(entries.map(e => e.type))];

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 sm:px-8 pt-8 pb-14">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Journal comptable</h1>
            <p className="text-violet-200 text-sm mt-1">Écritures en partie double</p>
          </div>
          <div className="flex gap-2 pt-1">
            <a href={excelUrl}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition border border-white/30">
              Excel
            </a>
            <a href={pdfUrl}
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
            placeholder="Rechercher…"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400 w-40 flex-1 min-w-[120px]" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
            <option value="">Tous les types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {nbAttente > 0 && (
            <button
              onClick={() => setFilterAttente(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filterAttente
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
              }`}
            >
              ⚠ À affecter ({nbAttente})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Chargement…</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Pièce</th>
                    <th className="text-left px-4 py-3">Libellé</th>
                    <th className="text-left px-4 py-3">Compte</th>
                    <th className="text-left px-4 py-3">Intitulé</th>
                    <th className="text-right px-4 py-3">Débit</th>
                    <th className="text-right px-4 py-3">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-400">Aucune écriture</td></tr>
                  ) : filtered.map((e, i) => {
                    const debit  = parseFloat(e.debit  || 0);
                    const credit = parseFloat(e.credit || 0);
                    return (
                      <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap font-mono text-xs">{e.date}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[e.type] || "bg-blue-100 text-blue-700"}`}>{e.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{e.piece || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{e.libelle}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{e.compte_code}</td>
                        <td className="px-4 py-2.5 text-slate-600">{e.compte_libelle}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {debit > 0 ? <span className="text-red-600 font-semibold">{fmt(debit)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {credit > 0 ? <span className="text-green-600 font-semibold">{fmt(credit)}</span> : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white text-xs font-bold">
                    <td colSpan={6} className="px-4 py-3">TOTAL ({filtered.length} ligne{filtered.length !== 1 ? "s" : ""})</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="sm:hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Aucune écriture</div>
              ) : (
                <>
                  <div className="divide-y divide-slate-50">
                    {filtered.map((e, i) => {
                      const debit  = parseFloat(e.debit  || 0);
                      const credit = parseFloat(e.credit || 0);
                      return (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-mono text-slate-400">{e.date}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TYPE_COLORS[e.type] || "bg-blue-100 text-blue-700"}`}>{e.type}</span>
                              </div>
                              <div className="text-sm text-slate-700 truncate">{e.libelle}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{e.compte_code} — {e.compte_libelle}</div>
                            </div>
                            <div className="text-right shrink-0">
                              {debit > 0 && <div className="text-xs font-mono font-semibold text-red-600">D {fmt(debit)}</div>}
                              {credit > 0 && <div className="text-xs font-mono font-semibold text-green-600">C {fmt(credit)}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-slate-800 text-white px-4 py-3 flex justify-between text-xs font-bold">
                    <span>TOTAL ({filtered.length})</span>
                    <div className="flex gap-4">
                      <span className="text-red-300">D {fmt(totalDebit)}</span>
                      <span className="text-green-300">C {fmt(totalCredit)}</span>
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

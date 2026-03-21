import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function ExportBtn({ href, label, color }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ${color}`}
    >
      {label}
    </a>
  );
}

function FilterBar({ dateDebut, setDateDebut, dateFin, setDateFin, search, setSearch, extraSlot }) {
  return (
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
      {search !== undefined && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-48" />
      )}
      {extraSlot}
    </div>
  );
}

export default function JournalPage() {
  const navigate = useNavigate();
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
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium mb-2 transition">← Tableau de bord</button>
          <h1 className="text-2xl font-bold text-slate-800">Journal comptable</h1>
          <p className="text-sm text-slate-500 mt-1">Écritures en partie double</p>
        </div>
        <div className="flex gap-2">
          <ExportBtn href={excelUrl} label="Excel" color="bg-emerald-600 hover:bg-emerald-700" />
          <ExportBtn href={pdfUrl}   label="PDF"   color="bg-red-600 hover:bg-red-700" />
        </div>
      </div>

      <FilterBar dateDebut={dateDebut} setDateDebut={setDateDebut}
                 dateFin={dateFin} setDateFin={setDateFin}
                 search={search} setSearch={setSearch}
                 extraSlot={
                   <div className="flex items-center gap-2">
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
                         ⚠ Comptes à affecter ({nbAttente})
                       </button>
                     )}
                   </div>
                 }
      />

      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.type === "Dépense"  ? "bg-red-100 text-red-700" :
                          e.type === "Recette"  ? "bg-green-100 text-green-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{e.type}</span>
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
        </div>
      )}
    </div>
  );
}

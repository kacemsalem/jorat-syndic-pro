import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function ExportBtn({ href, label, color }) {
  return (
    <a href={href} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ${color}`}>
      {label}
    </a>
  );
}

export default function GrandLivrePage() {
  const [comptes, setComptes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");
  const [search, setSearch]       = useState("");
  const [openComptes, setOpenComptes] = useState({});

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

  const qExcel = new URLSearchParams();
  if (dateDebut) qExcel.set("date_debut", dateDebut);
  if (dateFin)   qExcel.set("date_fin",   dateFin);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grand Livre</h1>
          <p className="text-sm text-slate-500 mt-1">Mouvements groupés par compte</p>
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
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filtrer par compte…"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-52" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : comptes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">Aucune écriture</div>
      ) : (
        <div className="space-y-3">
          {comptes.map(compte => {
            const isOpen = openComptes[compte.compte_code] ?? true;
            const solde  = parseFloat(compte.solde || 0);
            return (
              <div key={compte.compte_code} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Compte header */}
                <button
                  onClick={() => toggle(compte.compte_code)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded">
                      {compte.compte_code}
                    </span>
                    <span className="font-semibold text-slate-800">{compte.compte_libelle}</span>
                    <span className="text-xs text-slate-400">{compte.entries.length} écriture{compte.entries.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Débit</div>
                      <div className="font-mono font-semibold text-red-600">{fmt(compte.total_debit)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Crédit</div>
                      <div className="font-mono font-semibold text-green-600">{fmt(compte.total_credit)}</div>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <div className="text-xs text-slate-400">Solde</div>
                      <div className={`font-mono font-bold ${solde >= 0 ? "text-slate-800" : "text-red-600"}`}>
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

                {/* Lines */}
                {isOpen && (
                  <div className="border-t border-slate-100 overflow-x-auto">
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

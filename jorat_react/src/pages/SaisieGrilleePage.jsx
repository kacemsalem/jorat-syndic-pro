import { useState, useEffect, useMemo, useCallback } from "react";

const API = "/api";
const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}
function getCsrf() {
  return document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("csrftoken="))?.split("=")[1] || "";
}

export default function SaisieGrilleePage() {
  const now = new Date();
  const [year,       setYear]       = useState(now.getFullYear());
  const [typeCharge, setTypeCharge] = useState("CHARGE");
  const [crossData,  setCrossData]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [availableYears, setAvailableYears] = useState([]);

  // { lotId: Set<monthIndex> }
  const [selected, setSelected] = useState({});
  // { lotId: string }
  const [amounts,  setAmounts]  = useState({});
  // { lotId: bool }
  const [saving,   setSaving]   = useState({});
  const [saved,    setSaved]    = useState({});

  useEffect(() => {
    fetch(`${API}/annees-activite/`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!Array.isArray(d)) return;
        const withCurrent = d.includes(now.getFullYear()) ? d : [...d, now.getFullYear()];
        setAvailableYears(withCurrent.sort((a, b) => b - a));
      }).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API}/situation-paiements/?year=${year}&type_charge=${typeCharge}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCrossData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, typeCharge]);

  useEffect(() => {
    setSelected({});
    setAmounts({});
    setSaved({});
    setCrossData(null);
    fetchData();
  }, [fetchData]);

  const rows = useMemo(() => {
    if (!crossData?.lots) return [];
    return crossData.lots.map(lot => {
      const totalDu   = parseFloat(lot.total_du || 0);
      const totalPaid = (lot.paiements || []).reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCovered = totalDu > 0 ? (totalPaid / totalDu) * 12 : 0;
      const paid = Array(12).fill(false).map((_, i) => i < monthsCovered);
      return { ...lot, paid, monthlyAmt: totalDu / 12, totalDu };
    });
  }, [crossData]);

  const toggleMonth = (lotId, mi) => {
    setSaved(p => ({ ...p, [lotId]: false }));
    setSelected(prev => {
      const s = new Set(prev[lotId] || []);
      if (s.has(mi)) s.delete(mi); else s.add(mi);
      const next = { ...prev, [lotId]: s };
      // update suggested amount
      const row = rows.find(r => r.lot_id === lotId);
      if (row) {
        setAmounts(a => ({ ...a, [lotId]: s.size > 0 ? String(Math.round(row.monthlyAmt * s.size)) : "" }));
      }
      return next;
    });
  };

  const saveLot = async (lotId) => {
    const amount = parseFloat(amounts[lotId] || 0);
    if (!amount || amount <= 0) return;
    setSaving(p => ({ ...p, [lotId]: true }));
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API}/paiements/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ lot: lotId, montant: String(amount), date_paiement: today, reference: "" }),
      });
      if (!res.ok) { const d = await res.json(); alert(Object.values(d).flat().join(" ")); return; }
      const created = await res.json();
      await fetch(`${API}/paiements/${created.id}/ventiler/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({}),
      });
      setSaved(p => ({ ...p, [lotId]: true }));
      setSelected(p => ({ ...p, [lotId]: new Set() }));
      setAmounts(p => ({ ...p, [lotId]: "" }));
    } finally {
      setSaving(p => ({ ...p, [lotId]: false }));
    }
  };

  const saveAll = async () => {
    const toSave = rows.filter(r => {
      const s = selected[r.lot_id];
      return s && s.size > 0 && parseFloat(amounts[r.lot_id] || 0) > 0;
    });
    for (const row of toSave) {
      await saveLot(row.lot_id);
    }
    fetchData();
  };

  const selectedLots  = rows.filter(r => (selected[r.lot_id]?.size || 0) > 0);
  const totalSelected = selectedLots.reduce((s, r) => s + parseFloat(amounts[r.lot_id] || 0), 0);
  const yearOptions   = availableYears.length ? availableYears : [now.getFullYear()];

  const isCharge = typeCharge === "CHARGE";

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-32">

      {/* Header */}
      <div className={`bg-gradient-to-br ${isCharge ? "from-indigo-600 to-indigo-700" : "from-amber-500 to-amber-600"} px-4 pt-5 pb-8`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Saisie en grille</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {yearOptions.map(y => <option key={y} value={y} className="text-slate-800">{y}</option>)}
            </select>
            <div className="flex rounded-xl overflow-hidden border border-white/30 text-xs font-semibold">
              <button onClick={() => setTypeCharge("CHARGE")}
                className={`px-3 py-1.5 transition ${isCharge ? "bg-white text-indigo-700" : "text-white hover:bg-white/10"}`}>
                Charge
              </button>
              <button onClick={() => setTypeCharge("FOND")}
                className={`px-3 py-1.5 transition ${!isCharge ? "bg-white text-amber-700" : "text-white hover:bg-white/10"}`}>
                Fond
              </button>
            </div>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-1">
          Cliquer sur les mois impayés (gris) · Amber = sélectionné · Vert = déjà payé
        </p>
      </div>

      {/* Table */}
      <div className="px-2 sm:px-4 -mt-5 max-w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${isCharge ? "border-indigo-500" : "border-amber-500"}`} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-3 py-2.5 text-slate-600 font-bold w-12 sticky left-0 bg-slate-50/90 z-10">Lot</th>
                    <th className="text-left px-2 py-2.5 text-slate-400 font-medium min-w-[100px] max-w-[130px]">Propriétaire</th>
                    {MOIS.map((m, i) => (
                      <th key={i} className="py-2.5 text-center text-slate-400 font-medium w-8">{m}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-slate-400 font-medium w-28 min-w-[100px]">Montant</th>
                    <th className="px-2 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => {
                    const sel      = selected[row.lot_id] || new Set();
                    const hasSel   = sel.size > 0;
                    const isSaving = saving[row.lot_id];
                    const isSaved  = saved[row.lot_id];
                    const amount   = amounts[row.lot_id] || "";

                    return (
                      <tr key={ri} className={`border-b border-slate-50 transition-colors ${
                        hasSel ? "bg-amber-50/40" : isSaved ? "bg-emerald-50/30" : "hover:bg-slate-50/50"
                      }`}>
                        {/* Lot sticky */}
                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                          <span className="font-black text-indigo-700">{row.lot}</span>
                        </td>
                        <td className="px-2 py-2 text-slate-500 text-[11px] truncate max-w-[130px]">{row.nom}</td>

                        {/* Month cells */}
                        {row.paid.map((isPaid, mi) => {
                          const isSel = sel.has(mi);
                          return (
                            <td key={mi} className="py-2 text-center px-0.5">
                              {isPaid ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[9px] font-bold select-none">✓</span>
                              ) : isSel ? (
                                <button onClick={() => toggleMonth(row.lot_id, mi)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-[9px] font-bold hover:bg-amber-500 active:scale-90 transition">
                                  ✓
                                </button>
                              ) : (
                                <button onClick={() => toggleMonth(row.lot_id, mi)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 hover:bg-amber-100 hover:text-amber-400 active:scale-90 transition">
                                  —
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Amount */}
                        <td className="px-2 py-1.5 text-right">
                          {hasSel ? (
                            <input type="number" min={0} step="1" value={amount}
                              onChange={e => setAmounts(a => ({ ...a, [row.lot_id]: e.target.value }))}
                              className="w-24 border border-amber-200 rounded-lg px-2 py-1 text-xs text-right font-mono bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          ) : isSaved ? (
                            <span className="text-[10px] font-semibold text-emerald-600">✓ Enregistré</span>
                          ) : row.monthlyAmt > 0 ? (
                            <span className="text-[10px] text-slate-300 font-mono">{fmt(row.monthlyAmt)}/mois</span>
                          ) : null}
                        </td>

                        {/* Save button per row */}
                        <td className="px-1 py-1.5 text-center">
                          {hasSel && (
                            <button onClick={() => saveLot(row.lot_id)}
                              disabled={isSaving || !amount || parseFloat(amount) <= 0}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 active:scale-90 transition">
                              {isSaving
                                ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                              }
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && !loading && (
                    <tr><td colSpan={16} className="text-center text-slate-400 py-10 text-xs">Aucun lot trouvé pour {year}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {selectedLots.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">
                {selectedLots.length} lot{selectedLots.length > 1 ? "s" : ""} sélectionné{selectedLots.length > 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-slate-400">
                Total : <span className="font-bold text-amber-600">{fmt(totalSelected)} MAD</span>
              </p>
            </div>
            <button onClick={saveAll}
              className="shrink-0 px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition">
              Tout enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

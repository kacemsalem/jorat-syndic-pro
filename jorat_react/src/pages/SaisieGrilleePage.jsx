import { useState, useEffect, useMemo, useCallback } from "react";

const API = "/api";
const MOIS     = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MODE_OPTIONS = [
  { value: "ESPECES",  label: "Espèces"  },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE",   label: "Chèque"   },
];

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}
function getCsrf() {
  return document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("csrftoken="))?.split("=")[1] || "";
}
function lastDay(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Dépense inline form ──────────────────────────────────────────
const INP = "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";
const SEL = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";

function DepenseForm({ categories, fournisseurs, defaultDate, onAdded }) {
  const [form, setForm] = useState({ libelle: "", montant: "", date_depense: defaultDate, categorie: "", fournisseur: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { set("date_depense", defaultDate); }, [defaultDate]);

  const submit = async () => {
    if (!form.libelle.trim()) { setErr("Libellé requis."); return; }
    if (!form.montant || parseFloat(form.montant) <= 0) { setErr("Montant invalide."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/depenses/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          libelle: form.libelle.trim(), montant: form.montant,
          date_depense: form.date_depense,
          categorie: form.categorie || null, fournisseur: form.fournisseur || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(Object.values(d).flat().join(" ")); }
      else { setForm(f => ({ ...f, libelle: "", montant: "", categorie: "", fournisseur: "" })); onAdded(); }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 p-3 bg-red-50/60 rounded-xl border border-red-100">
      <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Nouvelle dépense</p>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <input placeholder="Libellé *" value={form.libelle} onChange={e => set("libelle", e.target.value)} className={INP} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min={0} step="0.01" placeholder="Montant MAD"
          value={form.montant} onChange={e => set("montant", e.target.value)} className={INP} />
        <input type="date" value={form.date_depense} onChange={e => set("date_depense", e.target.value)} className={INP} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.categorie} onChange={e => set("categorie", e.target.value)} className={SEL}>
          <option value="">— Catégorie —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={form.fournisseur} onChange={e => set("fournisseur", e.target.value)} className={SEL}>
          <option value="">— Fournisseur —</option>
          {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_societe || f.nom_complet || f.nom}</option>)}
        </select>
      </div>
      <button onClick={submit} disabled={saving}
        className="w-full py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition">
        {saving ? "Enregistrement…" : "Ajouter la dépense"}
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function SaisieGrilleePage() {
  const now = new Date();
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth());   // 0-based
  const [typeCharge, setTypeCharge] = useState("CHARGE");
  const [crossData,  setCrossData]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [availableYears, setAvailableYears] = useState([]);

  // grille state
  const [selected, setSelected] = useState({});   // { lotId: Set<monthIndex> }
  const [amounts,  setAmounts]  = useState({});   // { lotId: string }
  const [saving,   setSaving]   = useState({});
  const [saved,    setSaved]    = useState({});

  // dépenses + paiements du mois
  const [categories,   setCategories]   = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [depenses,     setDepenses]     = useState([]);
  const [paiementsMois, setPaiementsMois] = useState([]);
  const [loadingDep,   setLoadingDep]   = useState(false);

  // ── Load reference data once ──────────────────────────────────
  useEffect(() => {
    fetch(`${API}/annees-activite/`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!Array.isArray(d)) return;
        const withCurrent = d.includes(now.getFullYear()) ? d : [...d, now.getFullYear()];
        setAvailableYears(withCurrent.sort((a, b) => b - a));
      }).catch(() => {});

    fetch(`${API}/categories-depense/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCategories(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/fournisseurs/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setFournisseurs(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});
  }, []);

  // ── Grille data ───────────────────────────────────────────────
  const fetchGrille = useCallback(() => {
    setLoading(true);
    fetch(`${API}/situation-paiements/?year=${year}&type_charge=${typeCharge}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCrossData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, typeCharge]);

  useEffect(() => {
    setSelected({}); setAmounts({}); setSaved({});
    setCrossData(null);
    fetchGrille();
  }, [fetchGrille]);

  // ── Dépenses + Paiements du mois ─────────────────────────────
  const fetchDepenses = useCallback(() => {
    const m   = String(month + 1).padStart(2, "0");
    const fin = `${year}-${m}-${String(lastDay(year, month)).padStart(2, "0")}`;
    const deb = `${year}-${m}-01`;
    setLoadingDep(true);
    Promise.all([
      fetch(`${API}/depenses/?date_debut=${deb}&date_fin=${fin}&page_size=9999`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
      fetch(`${API}/paiements/?date_debut=${deb}&date_fin=${fin}&page_size=9999`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
    ]).then(([dd, pd]) => {
      const dlist = Array.isArray(dd) ? dd : (dd?.results ?? []);
      const plist = Array.isArray(pd) ? pd : (pd?.results ?? []);
      setDepenses(dlist.sort((a, b) => (a.date_depense||"").localeCompare(b.date_depense||"")));
      setPaiementsMois(plist);
      setLoadingDep(false);
    }).catch(() => setLoadingDep(false));
  }, [year, month]);

  useEffect(() => { fetchDepenses(); }, [fetchDepenses]);

  // ── Rows ─────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (!crossData?.lots) return [];
    // Cutoff = dernier jour du mois sélectionné : seuls les paiements ≤ cette date sont comptés
    const cutoff = new Date(year, month + 1, 0);
    cutoff.setHours(23, 59, 59, 999);
    return crossData.lots.map(lot => {
      const totalDu = parseFloat(lot.total_du || 0);
      const filteredPaiements = (lot.paiements || []).filter(p =>
        !p.date || new Date(p.date) <= cutoff
      );
      const totalPaid = filteredPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCovered = totalDu > 0 ? (totalPaid / totalDu) * 12 : 0;
      const paid = Array(12).fill(false).map((_, i) => i < monthsCovered);
      return { ...lot, paid, monthlyAmt: totalDu / 12, totalDu };
    });
  }, [crossData, year, month]);

  const toggleMonth = (lotId, mi) => {
    setSaved(p => ({ ...p, [lotId]: false }));
    setSelected(prev => {
      const s = new Set(prev[lotId] || []);
      if (s.has(mi)) s.delete(mi); else s.add(mi);
      const next = { ...prev, [lotId]: s };
      const row = rows.find(r => r.lot_id === lotId);
      if (row) setAmounts(a => ({ ...a, [lotId]: s.size > 0 ? String(Math.round(row.monthlyAmt * s.size)) : "" }));
      return next;
    });
  };

  // date du paiement = 1er du mois sélectionné
  const payDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const saveLot = async (lotId) => {
    const amount = parseFloat(amounts[lotId] || 0);
    if (!amount || amount <= 0) return;
    setSaving(p => ({ ...p, [lotId]: true }));
    try {
      const res = await fetch(`${API}/paiements/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ lot: lotId, montant: String(amount), date_paiement: payDate, reference: "" }),
      });
      if (!res.ok) { const d = await res.json(); alert(Object.values(d).flat().join(" ")); return; }
      const created = await res.json();
      await fetch(`${API}/paiements/${created.id}/ventiler/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ exercice: year, type_charge: typeCharge }),
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
    for (const row of toSave) await saveLot(row.lot_id);
    fetchGrille();
  };

  const deleteDepense = async (id) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`${API}/depenses/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchDepenses();
  };

  const selectedLots  = rows.filter(r => (selected[r.lot_id]?.size || 0) > 0);
  const totalSelected = selectedLots.reduce((s, r) => s + parseFloat(amounts[r.lot_id] || 0), 0);
  const totalDepenses  = depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const totalPaiements = paiementsMois.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
  const balance        = totalPaiements - totalDepenses;
  const yearOptions   = availableYears.length ? availableYears : [now.getFullYear()];
  const isCharge      = typeCharge === "CHARGE";
  const defaultDate   = payDate;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-32">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${isCharge ? "from-indigo-600 to-indigo-700" : "from-amber-500 to-amber-600"} px-4 pt-5 pb-8`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Saisie en grille</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Année */}
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {yearOptions.map(y => <option key={y} value={y} className="text-slate-800">{y}</option>)}
            </select>
            {/* Mois */}
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {MOIS_FULL.map((m, i) => <option key={i} value={i} className="text-slate-800">{m}</option>)}
            </select>
            {/* Charge / Fond */}
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
          Paiements datés au 1er {MOIS_FULL[month]} {year} · Cliquer les mois impayés
        </p>
      </div>

      {/* ── KPI bar ───────────────────────────────────────────── */}
      <div className="px-4 -mt-4 max-w-5xl mx-auto mb-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Paiements reçus", value: fmt(totalPaiements), color: "text-emerald-600", border: "border-emerald-100" },
            { label: "Dépenses",        value: fmt(totalDepenses),  color: "text-red-500",     border: "border-red-100"     },
            { label: "Balance",         value: fmt(balance),        color: balance >= 0 ? "text-emerald-600" : "text-red-500", border: "border-slate-100" },
          ].map(k => (
            <div key={k.label} className={`bg-white rounded-xl border ${k.border} shadow-sm p-2.5`}>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{k.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${k.color}`}>{k.value}</p>
              <p className="text-[9px] text-slate-300">{MOIS_FULL[month]} {year}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grille paiements ──────────────────────────────────── */}
      <div className="px-2 sm:px-4 max-w-full">
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
                      <th key={i} className={`py-2.5 text-center font-medium w-8 ${i === month ? "text-indigo-600 bg-indigo-50/60" : "text-slate-400"}`}>{m}</th>
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
                        hasSel ? "bg-amber-50/40" : isSaved ? "bg-emerald-50/30" : "hover:bg-slate-50/50"}`}>
                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                          <span className="font-black text-indigo-700">{row.lot}</span>
                        </td>
                        <td className="px-2 py-2 text-slate-500 text-[11px] truncate max-w-[130px]">{row.nom}</td>
                        {row.paid.map((isPaid, mi) => {
                          const isSel = sel.has(mi);
                          return (
                            <td key={mi} className={`py-2 text-center px-0.5 ${mi === month ? "bg-indigo-50/30" : ""}`}>
                              {isPaid ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[9px] font-bold select-none">✓</span>
                              ) : isSel ? (
                                <button onClick={() => toggleMonth(row.lot_id, mi)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-[9px] font-bold hover:bg-amber-500 active:scale-90 transition">✓</button>
                              ) : (
                                <button onClick={() => toggleMonth(row.lot_id, mi)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 hover:bg-amber-100 hover:text-amber-400 active:scale-90 transition">—</button>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-right">
                          {hasSel ? (
                            <input type="number" min={0} step="1" value={amount}
                              onChange={e => setAmounts(a => ({ ...a, [row.lot_id]: e.target.value }))}
                              className="w-24 border border-amber-200 rounded-lg px-2 py-1 text-xs text-right font-mono bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                          ) : isSaved ? (
                            <span className="text-[10px] font-semibold text-emerald-600">✓ Enregistré</span>
                          ) : row.monthlyAmt > 0 ? (
                            <span className="text-[10px] text-slate-300 font-mono">{fmt(row.monthlyAmt)}/mois</span>
                          ) : null}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {hasSel && (
                            <button onClick={() => saveLot(row.lot_id)}
                              disabled={isSaving || !amount || parseFloat(amount) <= 0}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 active:scale-90 transition">
                              {isSaving
                                ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && !loading && (
                    <tr><td colSpan={16} className="text-center text-slate-400 py-10 text-xs">Aucun lot pour {year}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Dépenses du mois ──────────────────────────────────── */}
      <div className="px-2 sm:px-4 mt-4 max-w-full grid grid-cols-1 sm:grid-cols-2 gap-4">

        <DepenseForm categories={categories} fournisseurs={fournisseurs}
          defaultDate={defaultDate} onAdded={fetchDepenses} />

        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Dépenses — {MOIS_FULL[month]} {year}
            </span>
            <div className="flex items-center gap-2">
              {loadingDep && <span className="w-3 h-3 border border-red-300 border-t-red-600 rounded-full animate-spin" />}
              <span className="text-xs font-bold text-red-600">{depenses.length}</span>
            </div>
          </div>
          {depenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Aucune dépense ce mois</p>
          ) : (
            <>
              <div className="p-2 space-y-1">
                {depenses.map(d => (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg bg-red-50/40 px-2.5 py-1.5 hover:bg-red-50 group transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{d.libelle}</p>
                      <p className="text-[10px] text-slate-400">{d.date_depense}
                        {d.categorie_nom ? <span className="ml-1">· {d.categorie_nom}</span> : ""}
                        {d.fournisseur_nom ? <span className="ml-1">· {d.fournisseur_nom}</span> : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-red-500 shrink-0">{fmt(d.montant)}</span>
                    <button onClick={() => deleteDepense(d.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition shrink-0 ml-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-red-50 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">Total dépenses</span>
                <span className="text-xs font-bold font-mono text-red-600">{fmt(totalDepenses)} MAD</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom bar lot sélection ──────────────────────────── */}
      {selectedLots.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">
                {selectedLots.length} lot{selectedLots.length > 1 ? "s" : ""} · paiements {MOIS[month]} {year}
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

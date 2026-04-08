import { useState, useEffect, useCallback } from "react";

const API = "/api";
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MODE_OPTIONS = [
  { value: "ESPECES",  label: "Espèces"  },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE",   label: "Chèque"   },
];

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}

function getLastDay(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function dateRange(year, month) {
  const m = String(month + 1).padStart(2, "0");
  const last = String(getLastDay(year, month)).padStart(2, "0");
  return { deb: `${year}-${m}-01`, fin: `${year}-${m}-${last}` };
}

const INP = "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";
const SEL = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";

// ── Paiement form ────────────────────────────────────────────────
function PaiementForm({ lots, defaultDate, onAdded }) {
  const [form, setForm] = useState({
    lot: "", montant: "", date_paiement: defaultDate,
    mode_paiement: "", reference: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { set("date_paiement", defaultDate); }, [defaultDate]);

  const submit = async () => {
    if (!form.lot)    { setErr("Sélectionner un lot."); return; }
    if (!form.montant || parseFloat(form.montant) <= 0) { setErr("Montant invalide."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/paiements/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          lot: parseInt(form.lot), montant: form.montant,
          date_paiement: form.date_paiement,
          mode_paiement: form.mode_paiement || null,
          reference: form.reference || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(Object.values(d).flat().join(" ")); }
      else { setForm(f => ({ ...f, lot: "", montant: "", mode_paiement: "", reference: "" })); onAdded(); }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nouveau paiement</p>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <select value={form.lot} onChange={e => set("lot", e.target.value)} className={SEL}>
        <option value="">— Choisir un lot —</option>
        {lots.map(l => (
          <option key={l.id} value={l.id}>
            {l.numero_lot}{l.representant_nom ? ` — ${l.representant_nom}` : ""}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min={0} step="0.01" placeholder="Montant MAD"
          value={form.montant} onChange={e => set("montant", e.target.value)} className={INP} />
        <input type="date" value={form.date_paiement} onChange={e => set("date_paiement", e.target.value)} className={INP} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.mode_paiement} onChange={e => set("mode_paiement", e.target.value)} className={SEL}>
          <option value="">— Mode —</option>
          {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <input placeholder="Référence (optionnel)" value={form.reference}
          onChange={e => set("reference", e.target.value)} className={INP} />
      </div>
      <button onClick={submit} disabled={saving}
        className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
        {saving ? "Enregistrement…" : "Ajouter le paiement"}
      </button>
    </div>
  );
}

// ── Dépense form ─────────────────────────────────────────────────
function DepenseForm({ categories, fournisseurs, defaultDate, onAdded }) {
  const [form, setForm] = useState({
    libelle: "", montant: "", date_depense: defaultDate,
    categorie: "", fournisseur: "",
  });
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
          libelle:    form.libelle.trim(),
          montant:    form.montant,
          date_depense: form.date_depense,
          categorie:  form.categorie  || null,
          fournisseur: form.fournisseur || null,
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
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Libellé *" value={form.libelle}
          onChange={e => set("libelle", e.target.value)} className={`${INP} col-span-2`} />
      </div>
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

function getCsrf() {
  return document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("csrftoken="))?.split("=")[1] || "";
}

// ── Main page ────────────────────────────────────────────────────
export default function SaisieParMoisPage() {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [lots,        setLots]        = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [fournisseurs,setFournisseurs] = useState([]);
  const [paiements,   setPaiements]   = useState([]);
  const [depenses,    setDepenses]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [availableYears, setAvailableYears] = useState([]);

  // Load reference data once
  useEffect(() => {
    fetch(`${API}/lots/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.results ?? []);
        list.sort((a, b) => {
          const ga = a.groupe_nom || ""; const gb = b.groupe_nom || "";
          if (ga !== gb) return ga.localeCompare(gb);
          return parseInt(a.numero_lot) - parseInt(b.numero_lot);
        });
        setLots(list.map(l => ({
          id: l.id, numero_lot: l.numero_lot,
          representant_nom: l.representant ? `${l.representant.prenom || ""} ${l.representant.nom || ""}`.trim() : "",
        })));
      }).catch(() => {});

    fetch(`${API}/categories-depense/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCategories(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/fournisseurs/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setFournisseurs(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/annees-activite/`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!Array.isArray(d)) return;
        const withCurrent = d.includes(now.getFullYear()) ? d : [...d, now.getFullYear()];
        setAvailableYears(withCurrent.sort((a, b) => b - a));
      }).catch(() => {});
  }, []);

  // Load month data
  const fetchMonth = useCallback(() => {
    const { deb, fin } = dateRange(year, month);
    setLoading(true);
    Promise.all([
      fetch(`${API}/paiements/?date_debut=${deb}&date_fin=${fin}&page_size=9999`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
      fetch(`${API}/depenses/?date_debut=${deb}&date_fin=${fin}&page_size=9999`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null),
    ]).then(([pd, dd]) => {
      const plist = Array.isArray(pd) ? pd : (pd?.results ?? []);
      const dlist = Array.isArray(dd) ? dd : (dd?.results ?? []);
      setPaiements(plist.sort((a, b) => (a.date_paiement||"").localeCompare(b.date_paiement||"")));
      setDepenses(dlist.sort((a, b) => (a.date_depense||"").localeCompare(b.date_depense||"")));
    }).finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  const deletePaiement = async (id) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    await fetch(`${API}/paiements/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchMonth();
  };

  const deleteDepense = async (id) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`${API}/depenses/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchMonth();
  };

  const defaultDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const yearOptions = availableYears.length ? availableYears : [now.getFullYear()];

  const totalPaiements = paiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
  const totalDepenses  = depenses.reduce((s, d)  => s + parseFloat(d.montant  || 0), 0);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Saisie par mois</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {yearOptions.map(y => <option key={y} value={y} className="text-slate-800">{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none">
              {MOIS_FULL.map((m, i) => <option key={i} value={i} className="text-slate-800">{m}</option>)}
            </select>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-1 flex items-center gap-2">
          Saisie rapide · {MOIS_FULL[month]} {year}
          {loading && <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin inline-block" />}
        </p>
      </div>

      {/* KPI bar */}
      <div className="px-4 -mt-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Paiements reçus", value: fmt(totalPaiements), color: "text-emerald-600", bg: "bg-white border-emerald-100" },
            { label: "Dépenses",        value: fmt(totalDepenses),  color: "text-red-500",     bg: "bg-white border-red-100"     },
            { label: "Balance",         value: fmt(totalPaiements - totalDepenses),
              color: (totalPaiements - totalDepenses) >= 0 ? "text-emerald-600" : "text-red-500",
              bg: "bg-white border-slate-100" },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border p-2.5 shadow-sm ${k.bg}`}>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{k.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="px-4 mt-4 pb-6 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Paiements ── */}
        <div className="space-y-3">
          <PaiementForm lots={lots} defaultDate={defaultDate} onAdded={fetchMonth} />

          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Paiements — {MOIS_FULL[month]}
              </span>
              <span className="text-xs font-bold text-emerald-600">{paiements.length}</span>
            </div>
            {paiements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aucun paiement ce mois</p>
            ) : (
              <div className="p-2 space-y-1">
                {paiements.map(p => {
                  const lotInfo = lots.find(l => l.id === p.lot);
                  return (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-emerald-50/40 px-2.5 py-1.5 hover:bg-emerald-50 group transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        Lot {lotInfo?.numero_lot ?? p.lot}
                        {lotInfo?.representant_nom ? <span className="font-normal text-slate-500"> — {lotInfo.representant_nom}</span> : ""}
                      </p>
                      <p className="text-[10px] text-slate-400">{p.date_paiement}
                        {p.mode_paiement ? <span className="ml-1 text-slate-400">· {p.mode_paiement}</span> : ""}
                        {p.reference ? <span className="ml-1 text-slate-400">· {p.reference}</span> : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-emerald-600 shrink-0">{fmt(p.montant)}</span>
                    <button onClick={() => deletePaiement(p.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition shrink-0 ml-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Dépenses ── */}
        <div className="space-y-3">
          <DepenseForm categories={categories} fournisseurs={fournisseurs}
            defaultDate={defaultDate} onAdded={fetchMonth} />

          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                Dépenses — {MOIS_FULL[month]}
              </span>
              <span className="text-xs font-bold text-red-600">{depenses.length}</span>
            </div>
            {depenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aucune dépense ce mois</p>
            ) : (
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
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

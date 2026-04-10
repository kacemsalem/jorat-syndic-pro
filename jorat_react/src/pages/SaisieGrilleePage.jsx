import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const API = "/api";
const MOIS     = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}
function getCsrf() {
  return document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("csrftoken="))?.split("=")[1] || "";
}
function lastDay(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Styles ───────────────────────────────────────────────────────
const INP = "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";
const SEL = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";

// ── Custom select (même rendu PC & mobile) ────────────────────────
// options: [{value, label}]  OU  [{group, items:[{value,label}]}]
function CustomSelect({ value, onChange, placeholder, options, className = "" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const isGrouped = options.length > 0 && options[0].group !== undefined;
  const allFlat   = isGrouped ? options.flatMap(g => g.items) : options;
  const filtered  = q ? allFlat.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : null;
  const selected  = allFlat.find(o => String(o.value) === String(value));
  const label     = selected ? selected.label : placeholder;

  const pick = (v) => { onChange(v); setOpen(false); setQ(""); };

  const rowCls = (v) =>
    `px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 ${String(v) === String(value) ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-700"}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => { setOpen(o => !o); setQ(""); }}
        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-left flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
        <span className={`truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
        <svg className={`w-3 h-3 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          {allFlat.length > 6 && (
            <div className="p-1.5 border-b border-slate-100">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            <div onClick={() => pick("")}
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${!value ? "text-blue-600 font-medium" : "text-slate-400"}`}>
              {placeholder}
            </div>
            {(filtered ?? (isGrouped ? null : options))?.map(o => (
              <div key={o.value} onClick={() => pick(String(o.value))} className={rowCls(o.value)}>{o.label}</div>
            ))}
            {!filtered && isGrouped && options.map((g, gi) => (
              <div key={gi}>
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-t border-slate-100">{g.group}</div>
                {g.items.map(o => (
                  <div key={o.value} onClick={() => pick(String(o.value))} className={rowCls(o.value)}>{o.label}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enhanced Dépense form ─────────────────────────────────────────
const ExtLink = ({ href }) => (
  <a href={href}
    title="Ouvrir la page de gestion"
    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:text-blue-500 transition shrink-0">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  </a>
);

function DepenseForm({ categories, fournisseurs, modeles, contrats, comptes, defaultDate, onAdded, onNewCategorie, onNewFournisseur, onNewCompte }) {
  const EMPTY = { source: "", libelle: "", montant: "", date_depense: defaultDate, categorie: "", fournisseur: "", compte: "", facture_reference: "", modele_depense: "" };
  const [form,    setForm]    = useState(EMPTY);
  const [autoFld, setAutoFld] = useState({ libelle: false, categorie: false, fournisseur: false, compte: false, montant: false });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  // Grouped modèles for optgroups
  const modelesByGroup = useMemo(() => {
    const groups = {};
    modeles.forEach(m => {
      const g = m.categorie_nom || "Sans catégorie";
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [modeles]);

  const handleSource = (val) => {
    setForm(f => ({ ...f, source: val }));
    if (!val) return;
    const [type, id] = val.split(":");
    if (type === "modele") {
      const m = modeles.find(x => String(x.id) === id);
      if (!m) return;
      setForm(f => ({
        ...f, source: val,
        libelle:     m.nom              || f.libelle,
        categorie:   m.categorie        ? String(m.categorie)        : f.categorie,
        fournisseur: m.fournisseur      ? String(m.fournisseur)      : f.fournisseur,
        compte:      m.compte_comptable ? String(m.compte_comptable) : f.compte,
        modele_depense: id,
      }));
      setAutoFld({
        libelle:     !!m.nom,
        categorie:   !!m.categorie,
        fournisseur: !!m.fournisseur,
        compte:      !!m.compte_comptable,
        montant:     false,
      });
    } else if (type === "contrat") {
      const c = contrats.find(x => String(x.id) === id);
      if (!c) return;
      setForm(f => ({
        ...f, source: val,
        libelle:     c.libelle    || f.libelle,
        categorie:   c.categorie  ? String(c.categorie) : f.categorie,
        fournisseur: c.fournisseur ? String(c.fournisseur) : f.fournisseur,
        compte:      c.compte     ? String(c.compte) : f.compte,
        montant:     c.montant    ? String(c.montant) : f.montant,
        modele_depense: "",
      }));
      setAutoFld({
        libelle:     !!c.libelle,
        categorie:   !!c.categorie,
        fournisseur: !!c.fournisseur,
        compte:      !!c.compte,
        montant:     !!c.montant,
      });
    }
  };

  // Quick-add inline
  const [quickAdd,    setQuickAdd]    = useState(null); // "categorie" | "fournisseur" | "compte"
  const [quickVal,    setQuickVal]    = useState("");   // nom / nom_societe / libelle compte
  const [quickVal2,   setQuickVal2]   = useState("");   // code pour compte
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickErr,    setQuickErr]    = useState("");

  const openQuick = (field) => { setQuickAdd(field); setQuickVal(""); setQuickVal2(""); setQuickErr(""); };
  const closeQuick = () => { setQuickAdd(null); setQuickVal(""); setQuickVal2(""); setQuickErr(""); };

  const submitQuick = async () => {
    if (!quickVal.trim()) { setQuickErr("Champ requis."); return; }
    if (quickAdd === "compte" && !quickVal2.trim()) { setQuickErr("Libellé requis."); return; }
    setQuickSaving(true); setQuickErr("");
    try {
      let url, body;
      if (quickAdd === "categorie") {
        url = `${API}/categories-depense/`;
        body = { nom: quickVal.trim() };
      } else if (quickAdd === "fournisseur") {
        url = `${API}/fournisseurs/`;
        body = { nom: quickVal.trim(), nom_societe: quickVal.trim() };
      } else {
        url = `${API}/comptes-comptables/`;
        body = { code: quickVal.trim(), libelle: quickVal2.trim() };
      }
      const res = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setQuickErr(Object.values(d).flat().join(" ")); return; }
      const item = await res.json();
      if (quickAdd === "categorie")   { onNewCategorie(item);   setForm(f => ({ ...f, categorie:   String(item.id) })); }
      if (quickAdd === "fournisseur") { onNewFournisseur(item); setForm(f => ({ ...f, fournisseur: String(item.id) })); }
      if (quickAdd === "compte")      { onNewCompte(item);      setForm(f => ({ ...f, compte:       String(item.id) })); }
      closeQuick();
    } finally { setQuickSaving(false); }
  };

  useEffect(() => { setForm(f => ({ ...f, date_depense: defaultDate })); }, [defaultDate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.libelle.trim()) { setErr("Libellé requis."); return; }
    if (!form.montant || parseFloat(form.montant) <= 0) { setErr("Montant invalide."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${API}/depenses/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          libelle:           form.libelle.trim(),
          montant:           form.montant,
          date_depense:      form.date_depense,
          categorie:         form.categorie      || null,
          fournisseur:       form.fournisseur     || null,
          compte:            form.compte          || null,
          facture_reference: form.facture_reference || "",
          modele_depense:    form.modele_depense  || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(Object.values(d).flat().join(" ")); return; }
      setForm({ ...EMPTY, date_depense: defaultDate });
      setAutoFld({ libelle: false, categorie: false, fournisseur: false, compte: false, montant: false });
      onAdded();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 p-3 bg-red-50/60 rounded-xl border border-red-100">
      <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Nouvelle dépense</p>
      {err && <p className="text-[11px] text-red-500">{err}</p>}

      {/* Source : Modèle ou Contrat */}
      <div className="flex gap-1">
        <CustomSelect
          value={form.source}
          onChange={handleSource}
          placeholder="— Modèle / Contrat (optionnel) —"
          className={`flex-1 min-w-0 ${form.source ? "ring-1 ring-blue-200 rounded-lg" : ""}`}
          options={[
            ...(modeles.length > 0 ? [{
              group: "Modèles de dépense",
              items: modelesByGroup.flatMap(([, items]) =>
                items.map(m => ({ value: `modele:${m.id}`, label: m.nom }))
              ),
            }] : []),
            ...(contrats.length > 0 ? [{
              group: "Contrats",
              items: contrats.map(c => ({
                value: `contrat:${c.id}`,
                label: c.libelle || c.reference || `Contrat #${c.id}`,
              })),
            }] : []),
          ]}
        />
        <a href="/modeles-depense"
          className="shrink-0 px-2 py-1.5 text-[10px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-500 hover:border-blue-300 hover:text-blue-500 transition whitespace-nowrap">
          Modèles
        </a>
        <a href="/contrats"
          className="shrink-0 px-2 py-1.5 text-[10px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-500 hover:border-blue-300 hover:text-blue-500 transition whitespace-nowrap">
          Contrats
        </a>
      </div>

      {/* Libellé */}
      <input placeholder="Libellé *" value={form.libelle}
        onChange={e => { set("libelle", e.target.value); setAutoFld(a => ({ ...a, libelle: false })); }}
        className={`${INP} ${autoFld.libelle ? "border-blue-300 ring-1 ring-blue-200" : ""}`} />

      {/* Montant + Date */}
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min={0} step="0.01" placeholder="Montant MAD"
          value={form.montant} onChange={e => { set("montant", e.target.value); setAutoFld(a => ({ ...a, montant: false })); }}
          className={`${INP} ${autoFld.montant ? "border-blue-300 ring-1 ring-blue-200" : ""}`} />
        <input type="date" value={form.date_depense} onChange={e => set("date_depense", e.target.value)} className={INP} />
      </div>

      {/* Catégorie */}
      <div className="space-y-1">
        <div className="flex gap-1">
          <CustomSelect
            value={form.categorie}
            onChange={v => { set("categorie", v); setAutoFld(a => ({ ...a, categorie: false })); }}
            placeholder="— Catégorie —"
            className={`flex-1 min-w-0 ${autoFld.categorie ? "ring-1 ring-blue-200 rounded-lg" : ""}`}
            options={categories.map(c => ({ value: String(c.id), label: c.nom }))}
          />
          <button type="button" onClick={() => quickAdd === "categorie" ? closeQuick() : openQuick("categorie")}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition shrink-0 ${quickAdd === "categorie" ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"}`}>
            {quickAdd === "categorie" ? "×" : "+"}
          </button>
          <ExtLink href="/categories-depense" />
        </div>
        {quickAdd === "categorie" && (
          <div className="flex gap-1 items-center pl-0.5">
            <input autoFocus value={quickVal} onChange={e => setQuickVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitQuick()}
              placeholder="Nom catégorie…" className={INP + " flex-1"} />
            <button type="button" onClick={submitQuick} disabled={quickSaving}
              className="shrink-0 px-2 py-1 text-[10px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition">
              {quickSaving ? "…" : "OK"}
            </button>
          </div>
        )}
        {quickAdd === "categorie" && quickErr && <p className="text-[10px] text-red-500 pl-0.5">{quickErr}</p>}
      </div>

      {/* Fournisseur */}
      <div className="space-y-1">
        <div className="flex gap-1">
          <CustomSelect
            value={form.fournisseur}
            onChange={v => { set("fournisseur", v); setAutoFld(a => ({ ...a, fournisseur: false })); }}
            placeholder="— Fournisseur —"
            className={`flex-1 min-w-0 ${autoFld.fournisseur ? "ring-1 ring-blue-200 rounded-lg" : ""}`}
            options={fournisseurs.map(f => ({ value: String(f.id), label: f.nom_societe || f.nom_complet || f.nom }))}
          />
          <button type="button" onClick={() => quickAdd === "fournisseur" ? closeQuick() : openQuick("fournisseur")}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition shrink-0 ${quickAdd === "fournisseur" ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"}`}>
            {quickAdd === "fournisseur" ? "×" : "+"}
          </button>
          <ExtLink href="/fournisseurs" />
        </div>
        {quickAdd === "fournisseur" && (
          <div className="flex gap-1 items-center pl-0.5">
            <input autoFocus value={quickVal} onChange={e => setQuickVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitQuick()}
              placeholder="Nom / Société…" className={INP + " flex-1"} />
            <button type="button" onClick={submitQuick} disabled={quickSaving}
              className="shrink-0 px-2 py-1 text-[10px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition">
              {quickSaving ? "…" : "OK"}
            </button>
          </div>
        )}
        {quickAdd === "fournisseur" && quickErr && <p className="text-[10px] text-red-500 pl-0.5">{quickErr}</p>}
      </div>

      {/* Compte comptable */}
      <div className="space-y-1">
        <div className="flex gap-1">
          <CustomSelect
            value={form.compte}
            onChange={v => { set("compte", v); setAutoFld(a => ({ ...a, compte: false })); }}
            placeholder="— Compte comptable —"
            className={`flex-1 min-w-0 ${autoFld.compte ? "ring-1 ring-blue-200 rounded-lg" : ""}`}
            options={comptes.map(c => ({ value: String(c.id), label: `${c.code} — ${c.libelle}` }))}
          />
          <button type="button" onClick={() => quickAdd === "compte" ? closeQuick() : openQuick("compte")}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition shrink-0 ${quickAdd === "compte" ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"}`}>
            {quickAdd === "compte" ? "×" : "+"}
          </button>
          <ExtLink href="/comptes-comptables" />
        </div>
        {quickAdd === "compte" && (
          <div className="flex gap-1 items-center pl-0.5">
            <input autoFocus value={quickVal} onChange={e => setQuickVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && document.getElementById("quick-compte-lib")?.focus()}
              maxLength={8} placeholder="XXXXXX"
              className="w-20 shrink-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white font-mono" />
            <input id="quick-compte-lib" value={quickVal2} onChange={e => setQuickVal2(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitQuick()}
              placeholder="Libellé du compte…"
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
            <button type="button" onClick={submitQuick} disabled={quickSaving}
              className="shrink-0 px-2 py-1 text-[10px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition">
              {quickSaving ? "…" : "OK"}
            </button>
          </div>
        )}
        {quickAdd === "compte" && quickErr && <p className="text-[10px] text-red-500 pl-0.5">{quickErr}</p>}
      </div>

      {/* Référence facture (optionnel) */}
      <input placeholder="Réf. facture (optionnel)" value={form.facture_reference}
        onChange={e => set("facture_reference", e.target.value)} className={INP} />

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

  // Appels de fond (FOND mode only)
  const [appelsFond,      setAppelsFond]      = useState([]);
  const [selectedAppel,   setSelectedAppel]   = useState("");   // appel id (string)

  // grille state
  const [selected, setSelected] = useState({});   // { lotId: Set<monthIndex> }
  const [amounts,  setAmounts]  = useState({});   // { lotId: string }
  const [saving,   setSaving]   = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState(new Set()); // collapsed group names

  // dépenses + paiements du mois
  const [categories,   setCategories]   = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [modeles,      setModeles]      = useState([]);
  const [contrats,     setContrats]     = useState([]);
  const [comptes,      setComptes]      = useState([]);
  const [depenses,     setDepenses]     = useState([]);
  const [paiementsMois, setPaiementsMois] = useState([]);
  const [loadingDep,   setLoadingDep]   = useState(false);
  const [editingDep,   setEditingDep]   = useState(null);  // id en cours d'édition
  const [editForm,     setEditForm]     = useState({});
  const [savingEdit,   setSavingEdit]   = useState(false);

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

    fetch(`${API}/comptes-comptables/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setComptes(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/modeles-depense/?actif=true&page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setModeles(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/contrats/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setContrats(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});
  }, []);

  // ── Appels de fond ───────────────────────────────────────────
  useEffect(() => {
    if (typeCharge !== "FOND") { setAppelsFond([]); setSelectedAppel(""); return; }
    fetch(`${API}/appels-charge/?type_charge=FOND&exercice=${year}&page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.results ?? []);
        setAppelsFond(list);
        // auto-select first
        setSelectedAppel(list.length ? String(list[0].id) : "");
      }).catch(() => {});
  }, [typeCharge, year]);


  // ── Grille data ───────────────────────────────────────────────
  const fetchGrille = useCallback(() => {
    setLoading(true);
    const appelParam = typeCharge === "FOND" && selectedAppel ? `&appel_id=${selectedAppel}` : "";
    fetch(`${API}/situation-paiements/?year=${year}&type_charge=${typeCharge}${appelParam}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { setLoading(false); return; }
        setCrossData(d);
        // Mettre à jour les années disponibles depuis les exercices réels des appels
        if (Array.isArray(d.years) && d.years.length > 0) {
          setAvailableYears(prev => {
            const merged = Array.from(new Set([...d.years, ...prev])).sort((a, b) => b - a);
            return merged;
          });
          // Si l'année courante n'est pas dans les exercices, basculer vers le plus récent
          if (!d.years.includes(year)) {
            setYear(d.years[d.years.length - 1]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, typeCharge, selectedAppel]);

  useEffect(() => {
    setSelected({}); setAmounts({});
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
  const MOIS_CODES = ["JAN","FEV","MAR","AVR","MAI","JUN","JUL","AOU","SEP","OCT","NOV","DEC"];
  const rows = useMemo(() => {
    if (!crossData?.lots) return [];

    if (typeCharge === "FOND" && selectedAppel) {
      // ── FOND : logique mois-direct ──────────────────────────────
      const currentYearF = new Date().getFullYear();
      const effMonthF = year < currentYearF ? 11 : month;
      const monthStart = new Date(year, effMonthF, 1);
      monthStart.setHours(0, 0, 0, 0);
      const cutoff = new Date(year, effMonthF + 1, 0);
      cutoff.setHours(23, 59, 59, 999);

      return crossData.lots.map(lot => {
        const totalDu   = parseFloat(lot.total_du  || 0);
        const totalPaye = parseFloat(lot.total_paye || 0);
        const pmts      = lot.fond_paiements || [];

        const paid         = MOIS_CODES.map(code => pmts.some(p => p.mois === code));
        const paidBefore   = MOIS_CODES.map(code =>
          pmts.some(p => p.mois === code && new Date(p.date) < monthStart)
        );
        const paidThisMonth = MOIS_CODES.map(code =>
          pmts.some(p => p.mois === code && new Date(p.date) >= monthStart && new Date(p.date) <= cutoff)
        );
        const paidAny = paid;

        return { ...lot, paid, paidBefore, paidThisMonth, paidAny, monthlyAmt: 0, totalDu, totalPaye };
      });
    }

    // ── CHARGE : carry-over (mensualités) ───────────────────────
    // Pour les années passées, utiliser décembre comme mois de référence
    // (le mois courant ne doit pas tronquer les paiements historiques).
    const currentYear = new Date().getFullYear();
    const effectiveMonth = year < currentYear ? 11 : month;
    const cutoff = new Date(year, effectiveMonth + 1, 0);
    cutoff.setHours(23, 59, 59, 999);
    const monthStart = new Date(year, effectiveMonth, 1);
    monthStart.setHours(0, 0, 0, 0);
    // Arrondi à 10 décimales pour éviter les erreurs virgule flottante
    // (ex : 11.9999999999 → 12, mais 11.0 reste 11.0)
    const r10 = x => Math.round(x * 1e10) / 1e10;
    return crossData.lots.map(lot => {
      const totalDu = parseFloat(lot.total_du || 0);

      const paidBeforePmnts = (lot.paiements || []).filter(p =>
        p.date && new Date(p.date) < monthStart
      );
      const totalPaidBefore = paidBeforePmnts.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCoveredBefore = totalDu > 0 ? r10((totalPaidBefore / totalDu) * 12) : 0;

      const filteredPaiements = (lot.paiements || []).filter(p =>
        !p.date || new Date(p.date) <= cutoff
      );
      const totalPaidFiltered = filteredPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCoveredFiltered = totalDu > 0 ? r10((totalPaidFiltered / totalDu) * 12) : 0;

      const totalPaidAll = (lot.paiements || []).reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCoveredAll = totalDu > 0 ? r10((totalPaidAll / totalDu) * 12) : 0;

      const paid          = Array(12).fill(false).map((_, i) => i < monthsCoveredFiltered);
      const paidBefore    = Array(12).fill(false).map((_, i) => i < monthsCoveredBefore);
      const paidThisMonth = Array(12).fill(false).map((_, i) => i >= monthsCoveredBefore && i < monthsCoveredFiltered);
      const paidAny       = Array(12).fill(false).map((_, i) => i < monthsCoveredAll);

      return { ...lot, paid, paidBefore, paidThisMonth, paidAny, monthlyAmt: totalDu / 12, totalDu, totalPaye: totalPaidAll };
    });
  }, [crossData, year, month, typeCharge, selectedAppel]);

  const toggleMonth = (lotId, mi) => {
    const row = rows.find(r => r.lot_id === lotId);
    if (row?.paidAny[mi]) return;

    if (typeCharge === "FOND" && selectedAppel) {
      // FOND : sélection unique, montant = solde restant
      setSelected(prev => {
        const already = (prev[lotId] || new Set()).has(mi);
        const s = already ? new Set() : new Set([mi]);
        const next = { ...prev, [lotId]: s };
        if (!already) {
          const reste = (row?.totalDu || 0) - (row?.totalPaye || 0);
          setAmounts(a => ({ ...a, [lotId]: String(Math.round(reste * 100) / 100) }));
        } else {
          setAmounts(a => ({ ...a, [lotId]: "" }));
        }
        return next;
      });
    } else {
      // CHARGE : multi-sélection, montant = mensualité × nb mois
      setSelected(prev => {
        const s = new Set(prev[lotId] || []);
        if (s.has(mi)) s.delete(mi); else s.add(mi);
        const next = { ...prev, [lotId]: s };
        if (row) setAmounts(a => ({ ...a, [lotId]: s.size > 0 ? String(Math.round(row.monthlyAmt * s.size)) : "" }));
        return next;
      });
    }
  };

  // date du paiement = 1er du mois actif
  const payDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const periodeComptable = MOIS_CODES[month];

  const saveLot = async (lotId, { skipRefresh = false } = {}) => {
    const amount = parseFloat(amounts[lotId] || 0);
    if (!amount || amount <= 0) return;
    // Contrôle : ne pas dépasser le solde restant
    const row = rows.find(r => r.lot_id === lotId);
    if (row && row.totalDu > 0) {
      const reste = Math.max(0, (row.totalDu || 0) - (row.totalPaye || 0));
      if (amount > reste + 0.005) { alert(`Montant maximum autorisé : ${fmt(reste)} MAD`); return; }
    }
    setSaving(p => ({ ...p, [lotId]: true }));
    try {
      const res = await fetch(`${API}/paiements/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ lot: lotId, montant: String(amount), date_paiement: payDate, reference: "", mois: periodeComptable }),
      });
      if (!res.ok) { const d = await res.json(); alert(Object.values(d).flat().join(" ")); return; }
      const created = await res.json();
      const ventilerBody = typeCharge === "FOND" && selectedAppel
        ? { appel_id: Number(selectedAppel) }
        : { exercice: year, type_charge: typeCharge };
      await fetch(`${API}/paiements/${created.id}/ventiler/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(ventilerBody),
      });
      setSelected(p => ({ ...p, [lotId]: new Set() }));
      setAmounts(p => ({ ...p, [lotId]: "" }));
      if (!skipRefresh) {
        fetchGrille();
        fetchDepenses();
      }
    } finally {
      setSaving(p => ({ ...p, [lotId]: false }));
    }
  };

  const saveAll = async () => {
    const toSave = typeCharge === "FOND" && selectedAppel
      ? rows.filter(r => parseFloat(amounts[r.lot_id] || 0) > 0)
      : rows.filter(r => {
          const s = selected[r.lot_id];
          return s && s.size > 0 && parseFloat(amounts[r.lot_id] || 0) > 0;
        });
    for (const row of toSave) await saveLot(row.lot_id, { skipRefresh: true });
    fetchGrille();
    fetchDepenses();
  };

  const undoMonthPaiement = async (lotId, mi) => {
    const row = rows.find(r => r.lot_id === lotId);
    if (!row) return;
    if (!confirm(`Annuler le paiement de ${MOIS[mi]} ${year} pour ce lot ?`)) return;

    if (typeCharge === "FOND" && selectedAppel) {
      // ── FOND : supprimer le(s) paiement(s) portant ce mois ──────
      const targets = (row.fond_paiements || []).filter(p => p.mois === MOIS_CODES[mi]);
      for (const p of targets) {
        await fetch(`${API}/paiements/${p.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
      }
      fetchGrille();
      fetchDepenses();
      return;
    }

    // ── CHARGE : logique carry-over ───────────────────────────────
    if (!row.monthlyAmt) return;
    const m   = String(month + 1).padStart(2, "0");
    const deb = `${year}-${m}-01`;
    const fin = `${year}-${m}-${String(lastDay(year, month)).padStart(2, "0")}`;

    const res  = await fetch(`${API}/paiements/?lot=${lotId}&date_debut=${deb}&date_fin=${fin}&page_size=9999`, { credentials: "include" });
    const data = res.ok ? await res.json() : null;
    const list = Array.isArray(data) ? data : (data?.results ?? []);
    if (list.length === 0) return;

    const totalAmt = list.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    const newAmt   = Math.round((totalAmt - row.monthlyAmt) * 100) / 100;

    for (const p of list) {
      await fetch(`${API}/paiements/${p.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    }

    if (newAmt > 0.001) {
      const createRes = await fetch(`${API}/paiements/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ lot: lotId, montant: String(newAmt), date_paiement: payDate, reference: "", mois: periodeComptable }),
      });
      if (createRes.ok) {
        const newPmt = await createRes.json();
        const ventilerBody = typeCharge === "FOND" && selectedAppel
          ? { appel_id: Number(selectedAppel) }
          : { exercice: year, type_charge: typeCharge };
        await fetch(`${API}/paiements/${newPmt.id}/ventiler/`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(ventilerBody),
        });
      }
    }

    fetchGrille();
    fetchDepenses();
  };

  const undoFondPaiement = async (paiementId) => {
    if (!confirm("Annuler ce paiement ?")) return;
    await fetch(`${API}/paiements/${paiementId}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchGrille();
    fetchDepenses();
  };

  const deleteDepense = async (id) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await fetch(`${API}/depenses/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchDepenses();
  };

  const startEdit = async (d) => {
    const res  = await fetch(`${API}/depenses/${d.id}/`, { credentials: "include" });
    const full = res.ok ? await res.json() : d;
    setEditForm({
      libelle:      full.libelle      || "",
      montant:      String(full.montant || ""),
      date_depense: full.date_depense  || "",
      categorie:    String(full.categorie    || ""),
      fournisseur:  String(full.fournisseur  || ""),
      compte:       String(full.compte       || ""),
    });
    setEditingDep(d.id);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/depenses/${editingDep}/`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          libelle:      editForm.libelle,
          montant:      editForm.montant,
          date_depense: editForm.date_depense,
          categorie:    editForm.categorie    || null,
          fournisseur:  editForm.fournisseur  || null,
          compte:       editForm.compte       || null,
        }),
      });
      if (res.ok) { setEditingDep(null); fetchDepenses(); }
    } finally { setSavingEdit(false); }
  };

  const isFondMode    = typeCharge === "FOND" && !!selectedAppel;
  const selectedLots  = isFondMode
    ? rows.filter(r => parseFloat(amounts[r.lot_id] || 0) > 0)
    : rows.filter(r => (selected[r.lot_id]?.size || 0) > 0);
  const totalSelected = selectedLots.reduce((s, r) => s + parseFloat(amounts[r.lot_id] || 0), 0);
  const totalDepenses  = depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const totalPaiements = paiementsMois.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
  const balance        = totalPaiements - totalDepenses;
  const yearOptions   = availableYears.length ? availableYears : [now.getFullYear()];
  const isCharge      = typeCharge === "CHARGE";
  const defaultDate   = payDate;

  // ── Groupes ──────────────────────────────────────────────────
  const groups = useMemo(() => {
    const map = {};
    rows.forEach(r => { const g = r.groupe || "—"; (map[g] = map[g] || []).push(r); });
    return Object.entries(map); // [[groupName, [rows...]], ...]
  }, [rows]);
  const allGroupNames = groups.map(([g]) => g);
  const allCollapsed  = allGroupNames.length > 0 && allGroupNames.every(g => collapsedGroups.has(g));
  const toggleGroup   = g => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(g) ? next.delete(g) : next.add(g);
    return next;
  });
  const toggleAll = () => setCollapsedGroups(allCollapsed ? new Set() : new Set(allGroupNames));

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-32">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${isCharge ? "from-indigo-600 to-indigo-700" : "from-amber-500 to-amber-600"} px-4 pt-5 pb-8`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Saisie</h1>
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
            {/* Export PDF / Excel */}
            {(() => {
              const appelSuffix = typeCharge === "FOND" && selectedAppel ? `&appel_id=${selectedAppel}` : "";
              const params = `year=${year}&month=${month + 1}&type_charge=${typeCharge}${appelSuffix}`;
              return (
                <div className="flex gap-1.5">
                  <a href={`/api/saisie-grille/export/pdf/?${params}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-[11px] font-semibold text-white transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    PDF
                  </a>
                  <a href={`/api/saisie-grille/export/excel/?${params}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-[11px] font-semibold text-white transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    Excel
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
        {/* Appel de fond selector */}
        {typeCharge === "FOND" && (
          <div className="mt-3">
            {appelsFond.length === 0 ? (
              <p className="text-white/50 text-[10px]">Aucun appel de fond pour {year}</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider shrink-0">Appel&nbsp;:</span>
                <select value={selectedAppel} onChange={e => setSelectedAppel(e.target.value)}
                  className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none max-w-xs">
                  {appelsFond.map(a => (
                    <option key={a.id} value={String(a.id)} className="text-slate-800">
                      {a.nom_fond || a.libelle || a.code_fond} — {fmt(a.montant_total)} MAD
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <p className="text-white/50 text-[10px] mt-1">
          {isFondMode
            ? `Paiements pour ${MOIS_FULL[month]} ${year} · Saisir les montants par lot`
            : `Paiements datés au 1er ${MOIS_FULL[month]} ${year} · Cliquer les mois impayés`}
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
            {/* Bouton tout réduire / développer */}
            {rows.length > 0 && (
              <div className="px-3 py-2 border-b border-slate-100 flex justify-end">
                <button onClick={toggleAll}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    {allCollapsed
                      ? <><polyline points="6 9 12 15 18 9"/></>
                      : <><polyline points="18 15 12 9 6 15"/></>}
                  </svg>
                  {allCollapsed ? "Tout développer" : "Tout réduire"}
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              {isFondMode ? (
                /* ══ TABLE FOND : chips de paiements + saisie ══════════════ */
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left px-3 py-2.5 text-slate-600 font-bold w-12 sticky left-0 bg-slate-50/90 z-10">Lot</th>
                      <th className="text-left px-2 py-2.5 text-slate-400 font-medium w-28">Propriétaire</th>
                      <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Paiements effectués</th>
                      <th className="px-2 py-2.5 text-right text-slate-400 font-medium w-24">Appelé</th>
                      <th className="px-2 py-2.5 text-right text-emerald-500 font-medium w-24">Payé</th>
                      <th className="px-2 py-2.5 text-right text-red-400 font-medium w-24">Reste</th>
                      <th className="px-2 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([groupName, groupRows]) => {
                      const isCollapsed = collapsedGroups.has(groupName);
                      return (
                        <>
                          <tr key={`g_${groupName}`}
                            className="bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition"
                            onClick={() => toggleGroup(groupName)}>
                            <td colSpan={7} className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                  strokeLinecap="round" strokeLinejoin="round"
                                  className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{groupName}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{groupRows.length} lot{groupRows.length > 1 ? "s" : ""}</span>
                              </div>
                            </td>
                          </tr>
                          {!isCollapsed && groupRows.map((row, ri) => {
                            const isSaving = saving[row.lot_id];
                            const amount   = amounts[row.lot_id] || "";
                            const appele   = row.totalDu  ?? 0;
                            const paye     = row.totalPaye ?? 0;
                            const reste    = appele - paye;
                            const hasAmt   = !!amount && parseFloat(amount) > 0;
                            return (
                              <tr key={ri} className={`border-b border-slate-50 transition-colors ${hasAmt ? "bg-amber-50/40" : "hover:bg-slate-50/50"}`}>
                                <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                                  <span className="font-black text-amber-600">{row.lot}</span>
                                </td>
                                <td className="px-2 py-2 text-slate-500 text-[11px] truncate max-w-[110px]">{row.nom}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1 items-center">
                                    {(row.fond_paiements || []).map(p => (
                                      <span key={p.id} className="group/chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
                                        <span className="font-mono">{fmt(p.montant)}</span>
                                        <span className="text-emerald-400 text-[9px]">{p.mois}</span>
                                        <button onClick={() => undoFondPaiement(p.id)}
                                          className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full text-emerald-400 hover:bg-red-100 hover:text-red-500 transition font-bold text-[10px]">×</button>
                                      </span>
                                    ))}
                                    {reste > 0.005 && (() => {
                                      const v = parseFloat(amount) || 0;
                                      const over = v > reste + 0.005;
                                      return (
                                        <div className="flex flex-col items-end gap-0.5">
                                          <input type="number" min={0} max={reste} step="0.01" value={amount}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setAmounts(a => ({ ...a, [row.lot_id]: val > reste ? String(Math.round(reste * 100) / 100) : e.target.value }));
                                            }}
                                            onFocus={e => { if (!e.target.value) setAmounts(a => ({ ...a, [row.lot_id]: String(Math.round(reste * 100) / 100) })); }}
                                            placeholder="Montant"
                                            className={`w-28 border rounded-lg px-2 py-0.5 text-xs text-right font-mono focus:outline-none focus:ring-1 placeholder:text-slate-300 ${over ? "border-red-300 bg-red-50 focus:ring-red-400 text-red-600" : "border-amber-200 bg-amber-50 focus:ring-amber-400"}`} />
                                          {over && <span className="text-[9px] text-red-500 font-medium">Max {fmt(reste)}</span>}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 text-right text-xs font-mono text-slate-500">{appele > 0 ? fmt(appele) : "—"}</td>
                                <td className="px-2 py-1.5 text-right text-xs font-mono text-emerald-600">{paye > 0 ? fmt(paye) : "—"}</td>
                                <td className={`px-2 py-1.5 text-right text-xs font-mono font-bold ${reste > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                  {appele > 0 ? fmt(reste) : "—"}
                                </td>
                                <td className="px-1 py-1.5 text-center">
                                  <button onClick={() => hasAmt && saveLot(row.lot_id)}
                                    disabled={isSaving || !hasAmt}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition active:scale-90 ${
                                      hasAmt ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm" : "bg-slate-100 text-slate-300 cursor-default"
                                    }`}>
                                    {isSaving
                                      ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                    {rows.length === 0 && !loading && (
                      <tr><td colSpan={7} className="text-center text-slate-400 py-10 text-xs">Aucun lot pour {year}</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* ══ TABLE CHARGE : 12 colonnes mois ═══════════════════════ */
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
                    {groups.map(([groupName, groupRows]) => {
                      const isCollapsed = collapsedGroups.has(groupName);
                      return (
                        <>
                          <tr key={`g_${groupName}`}
                            className="bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition"
                            onClick={() => toggleGroup(groupName)}>
                            <td colSpan={16} className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                  strokeLinecap="round" strokeLinejoin="round"
                                  className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{groupName}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{groupRows.length} lot{groupRows.length > 1 ? "s" : ""}</span>
                              </div>
                            </td>
                          </tr>
                          {!isCollapsed && groupRows.map((row, ri) => {
                            const sel      = selected[row.lot_id] || new Set();
                            const hasSel   = sel.size > 0;
                            const isSaving = saving[row.lot_id];
                            const amount   = amounts[row.lot_id] || "";
                            return (
                              <tr key={ri} className={`border-b border-slate-50 transition-colors ${hasSel ? "bg-amber-50/40" : "hover:bg-slate-50/50"}`}>
                                <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                                  <span className="font-black text-indigo-700">{row.lot}</span>
                                </td>
                                <td className="px-2 py-2 text-slate-500 text-[11px] truncate max-w-[130px]">{row.nom}</td>
                                {row.paid.map((_, mi) => {
                                  const isSel       = sel.has(mi);
                                  const isThisMonth = row.paidThisMonth[mi];
                                  const isBefore    = row.paidBefore[mi];
                                  const isLocked    = !row.paid[mi] && row.paidAny[mi];
                                  return (
                                    <td key={mi} className={`py-2 text-center px-0.5 ${mi === month ? "bg-indigo-50/30" : ""}`}>
                                      {isThisMonth ? (
                                        <button onClick={() => undoMonthPaiement(row.lot_id, mi)}
                                          title="Payé ce mois — cliquer pour annuler ce mois"
                                          className="relative group/cell inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[9px] font-bold hover:bg-red-400 transition select-none">
                                          <span className="[@media(hover:hover)]:group-hover/cell:hidden">✓</span>
                                          <span className="hidden [@media(hover:hover)]:group-hover/cell:inline font-bold">×</span>
                                        </button>
                                      ) : isBefore ? (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-semibold select-none" title="Payé avant ce mois">✓</span>
                                      ) : isLocked ? (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-400 text-[9px] font-bold select-none cursor-not-allowed" title="Déjà payé">✓</span>
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
                                  {hasSel ? (() => {
                                    const maxAmt = Math.max(0, (row.totalDu || 0) - (row.totalPaye || 0));
                                    const over = parseFloat(amount) > maxAmt + 0.005;
                                    return (
                                      <div className="flex flex-col items-end gap-0.5">
                                        <input type="number" min={0} step="1" value={amount}
                                          onChange={e => setAmounts(a => ({ ...a, [row.lot_id]: e.target.value }))}
                                          className={`w-24 border rounded-lg px-2 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 ${
                                            over ? "border-red-300 bg-red-50 focus:ring-red-400 text-red-600" : "border-amber-200 bg-amber-50 focus:ring-amber-400"
                                          }`} />
                                        {over && <span className="text-[9px] text-red-500 font-medium">Max {fmt(maxAmt)}</span>}
                                      </div>
                                    );
                                  })() : row.monthlyAmt > 0 ? (
                                    <span className="text-[10px] text-slate-300 font-mono">{fmt(row.monthlyAmt)}/mois</span>
                                  ) : null}
                                </td>
                                <td className="px-1 py-1.5 text-center">
                                  <button
                                    onClick={() => hasSel && saveLot(row.lot_id)}
                                    disabled={isSaving || !hasSel || !amount || parseFloat(amount) <= 0}
                                    title={hasSel ? "Enregistrer le paiement" : "Sélectionnez des mois"}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition active:scale-90 ${
                                      hasSel && amount && parseFloat(amount) > 0
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                                        : "bg-slate-100 text-slate-300 cursor-default"
                                    }`}>
                                    {isSaving
                                      ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                    {rows.length === 0 && !loading && (
                      <tr><td colSpan={16} className="text-center text-slate-400 py-10 text-xs">Aucun lot pour {year}</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dépenses du mois ──────────────────────────────────── */}
      <div className="px-2 sm:px-4 mt-4 max-w-full grid grid-cols-1 sm:grid-cols-2 gap-4">

        <DepenseForm categories={categories} fournisseurs={fournisseurs}
          modeles={modeles} contrats={contrats}
          comptes={comptes}
          defaultDate={defaultDate} onAdded={fetchDepenses}
          onNewCategorie={item => setCategories(prev => [...prev, item])}
          onNewFournisseur={item => setFournisseurs(prev => [...prev, item])}
          onNewCompte={item => setComptes(prev => [...prev, item])} />

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
                  <div key={d.id} className="rounded-lg overflow-hidden">
                    {editingDep === d.id ? (
                      /* ── Inline edit form ── */
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input value={editForm.libelle} onChange={e => setEditForm(f => ({ ...f, libelle: e.target.value }))}
                            placeholder="Libellé" className={INP + " col-span-2"} />
                          <input type="number" value={editForm.montant} onChange={e => setEditForm(f => ({ ...f, montant: e.target.value }))}
                            placeholder="Montant" className={INP} />
                          <input type="date" value={editForm.date_depense} onChange={e => setEditForm(f => ({ ...f, date_depense: e.target.value }))}
                            className={INP} />
                          <select value={editForm.categorie} onChange={e => setEditForm(f => ({ ...f, categorie: e.target.value }))} className={SEL}>
                            <option value="">Catégorie…</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                          </select>
                          <select value={editForm.fournisseur} onChange={e => setEditForm(f => ({ ...f, fournisseur: e.target.value }))} className={SEL}>
                            <option value="">Fournisseur…</option>
                            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_societe || `${f.nom} ${f.prenom || ""}`.trim()}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => setEditingDep(null)}
                            className="px-3 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition">
                            Annuler
                          </button>
                          <button onClick={saveEdit} disabled={savingEdit}
                            className="px-3 py-1 text-[10px] font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition">
                            {savingEdit ? "…" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal row ── */
                      <div className="flex items-center gap-2 bg-red-50/40 px-2.5 py-1.5 hover:bg-red-50 group transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{d.libelle}</p>
                          <p className="text-[10px] text-slate-400">{d.date_depense}
                            {d.categorie_nom ? <span className="ml-1">· {d.categorie_nom}</span> : ""}
                            {d.fournisseur_nom ? <span className="ml-1">· {d.fournisseur_nom}</span> : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold font-mono text-red-500 shrink-0">{fmt(d.montant)}</span>
                        <button onClick={() => startEdit(d)}
                          className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 text-slate-400 hover:text-amber-500 transition shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => deleteDepense(d.id)}
                          className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 text-red-400 hover:text-red-600 transition shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    )}
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

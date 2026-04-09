import { useState, useEffect, useMemo, useCallback } from "react";

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
const INP_AUTO = "w-full border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50";
const SEL = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white";

// ── Enhanced Dépense form ─────────────────────────────────────────
function DepenseForm({ categories, fournisseurs, modeles, contrats, comptes, defaultDate, onAdded }) {
  const EMPTY = { source: "", libelle: "", montant: "", date_depense: defaultDate, categorie: "", fournisseur: "", compte: "", facture_reference: "", modele_depense: "" };
  const [form,    setForm]    = useState(EMPTY);
  const [autoFld, setAutoFld] = useState({ libelle: false, categorie: false, fournisseur: false, compte: false, montant: false });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => { setForm(f => ({ ...f, date_depense: defaultDate })); }, [defaultDate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill from source (modèle or contrat)
  const handleSource = (val) => {
    set("source", val);
    if (!val) { setAutoFld({ libelle: false, categorie: false, fournisseur: false, compte: false, montant: false }); return; }
    if (val.startsWith("m_")) {
      const m = modeles.find(x => String(x.id) === val.slice(2));
      if (m) {
        setForm(f => ({
          ...f, source: val,
          modele_depense: String(m.id),
          libelle:     m.nom,
          categorie:   m.categorie         ? String(m.categorie)         : f.categorie,
          fournisseur: m.fournisseur        ? String(m.fournisseur)       : f.fournisseur,
          compte:      m.compte_comptable   ? String(m.compte_comptable)  : f.compte,
        }));
        setAutoFld({ libelle: !!m.nom, categorie: !!m.categorie, fournisseur: !!m.fournisseur, compte: !!m.compte_comptable, montant: false });
      }
    } else if (val.startsWith("c_")) {
      const c = contrats.find(x => String(x.id) === val.slice(2));
      if (c) {
        setForm(f => ({
          ...f, source: val,
          modele_depense: "",
          libelle:     c.libelle    || f.libelle,
          fournisseur: c.fournisseur ? String(c.fournisseur) : f.fournisseur,
          montant:     c.montant     ? String(c.montant)     : f.montant,
        }));
        setAutoFld({ libelle: !!c.libelle, categorie: false, fournisseur: !!c.fournisseur, compte: false, montant: !!c.montant });
      }
    }
  };

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
          modele_depense:    form.modele_depense  || null,
          facture_reference: form.facture_reference || "",
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(Object.values(d).flat().join(" ")); return; }
      setForm({ ...EMPTY, date_depense: defaultDate });
      setAutoFld({ libelle: false, categorie: false, fournisseur: false, compte: false, montant: false });
      onAdded();
    } finally { setSaving(false); }
  };

  // grouped modèles by catégorie
  const modelesByGroup = useMemo(() => {
    const map = {};
    modeles.forEach(m => { const k = m.categorie_nom || "Autres"; (map[k] = map[k] || []).push(m); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [modeles]);

  return (
    <div className="space-y-2 p-3 bg-red-50/60 rounded-xl border border-red-100">
      {/* Header avec boutons raccourcis */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Nouvelle dépense</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => window.open("/modeles-depense", "_blank")}
            className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Modèles
          </button>
          <button type="button" onClick={() => window.open("/contrats", "_blank")}
            className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Contrats
          </button>
        </div>
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}

      {/* Source : modèle ou contrat */}
      <select value={form.source} onChange={e => handleSource(e.target.value)} className={SEL}>
        <option value="">— Choisir un modèle / contrat —</option>
        {modelesByGroup.map(([grp, items]) => (
          <optgroup key={grp} label={`Modèles — ${grp}`}>
            {items.map(m => <option key={m.id} value={`m_${m.id}`}>{m.nom}</option>)}
          </optgroup>
        ))}
        {contrats.length > 0 && (
          <optgroup label="Contrats">
            {contrats.map(c => <option key={c.id} value={`c_${c.id}`}>{c.libelle}</option>)}
          </optgroup>
        )}
      </select>

      {/* Libellé */}
      <input placeholder="Libellé *" value={form.libelle}
        onChange={e => { set("libelle", e.target.value); setAutoFld(a => ({ ...a, libelle: false })); }}
        className={autoFld.libelle ? INP_AUTO : INP} />

      {/* Montant + Date */}
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min={0} step="0.01" placeholder="Montant MAD"
          value={form.montant} onChange={e => { set("montant", e.target.value); setAutoFld(a => ({ ...a, montant: false })); }}
          className={autoFld.montant ? INP_AUTO : INP} />
        <input type="date" value={form.date_depense} onChange={e => set("date_depense", e.target.value)} className={INP} />
      </div>

      {/* Catégorie */}
      <select value={form.categorie} onChange={e => { set("categorie", e.target.value); setAutoFld(a => ({ ...a, categorie: false })); }}
        className={autoFld.categorie ? INP_AUTO : SEL}>
        <option value="">— Catégorie —</option>
        {categories.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
      </select>

      {/* Fournisseur */}
      <select value={form.fournisseur} onChange={e => { set("fournisseur", e.target.value); setAutoFld(a => ({ ...a, fournisseur: false })); }}
        className={autoFld.fournisseur ? INP_AUTO : SEL}>
        <option value="">— Fournisseur —</option>
        {fournisseurs.map(f => <option key={f.id} value={String(f.id)}>{f.nom_societe || f.nom_complet || f.nom}</option>)}
      </select>

      {/* Compte comptable */}
      <select value={form.compte} onChange={e => { set("compte", e.target.value); setAutoFld(a => ({ ...a, compte: false })); }}
        className={autoFld.compte ? INP_AUTO : SEL}>
        <option value="">— Compte comptable —</option>
        {comptes.map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>)}
      </select>

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
  const [detailsByLot,    setDetailsByLot]    = useState({});   // { lot_id: { montant, montant_recu } }

  // grille state
  const [selected, setSelected] = useState({});   // { lotId: Set<monthIndex> }
  const [amounts,  setAmounts]  = useState({});   // { lotId: string }
  const [saving,   setSaving]   = useState({});
  const [saved,    setSaved]    = useState({});
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

    fetch(`${API}/modeles-depense/?actif=true&page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setModeles(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/contrats/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setContrats(Array.isArray(d) ? d : (d?.results ?? [])))
      .catch(() => {});

    fetch(`${API}/comptes-comptables/?page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setComptes(Array.isArray(d) ? d : (d?.results ?? [])))
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

  // ── Details per lot for selected appel ───────────────────────
  useEffect(() => {
    if (!selectedAppel) { setDetailsByLot({}); return; }
    fetch(`${API}/details-appel/?appel=${selectedAppel}&page_size=9999`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.results ?? []);
        const map = {};
        list.forEach(dt => { map[String(dt.lot)] = { montant: parseFloat(dt.montant || 0), montant_recu: parseFloat(dt.montant_recu || 0) }; });
        setDetailsByLot(map);
      }).catch(() => {});
  }, [selectedAppel]);

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

      // Filtered payments (up to cutoff) → green display
      const filteredPaiements = (lot.paiements || []).filter(p =>
        !p.date || new Date(p.date) <= cutoff
      );
      const totalPaidFiltered = filteredPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCoveredFiltered = totalDu > 0 ? (totalPaidFiltered / totalDu) * 12 : 0;

      // ALL payments (regardless of date) → lock determination
      const totalPaidAll = (lot.paiements || []).reduce((s, p) => s + parseFloat(p.montant || 0), 0);
      const monthsCoveredAll = totalDu > 0 ? (totalPaidAll / totalDu) * 12 : 0;

      const paid    = Array(12).fill(false).map((_, i) => i < monthsCoveredFiltered);
      const paidAny = Array(12).fill(false).map((_, i) => i < monthsCoveredAll);

      return { ...lot, paid, paidAny, monthlyAmt: totalDu / 12, totalDu };
    });
  }, [crossData, year, month]);

  const toggleMonth = (lotId, mi) => {
    const row = rows.find(r => r.lot_id === lotId);
    // Refuse toggle if month is already paid globally
    if (row?.paidAny[mi]) return;
    setSaved(p => ({ ...p, [lotId]: false }));
    setSelected(prev => {
      const s = new Set(prev[lotId] || []);
      if (s.has(mi)) s.delete(mi); else s.add(mi);
      const next = { ...prev, [lotId]: s };
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
      const ventilerBody = typeCharge === "FOND" && selectedAppel
        ? { appel_id: Number(selectedAppel) }
        : { exercice: year, type_charge: typeCharge };
      await fetch(`${API}/paiements/${created.id}/ventiler/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(ventilerBody),
      });
      // Refresh details per lot after payment
      if (typeCharge === "FOND" && selectedAppel) {
        fetch(`${API}/details-appel/?appel=${selectedAppel}&page_size=9999`, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            const list = Array.isArray(d) ? d : (d?.results ?? []);
            const map = {};
            list.forEach(dt => { map[String(dt.lot)] = { montant: parseFloat(dt.montant || 0), montant_recu: parseFloat(dt.montant_recu || 0) }; });
            setDetailsByLot(map);
          }).catch(() => {});
      }
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
            {/* Export PDF / Excel */}
            {(() => {
              const params = `year=${year}&month=${month + 1}&type_charge=${typeCharge}`;
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-3 py-2.5 text-slate-600 font-bold w-12 sticky left-0 bg-slate-50/90 z-10">Lot</th>
                    <th className="text-left px-2 py-2.5 text-slate-400 font-medium min-w-[100px] max-w-[130px]">Propriétaire</th>
                    {MOIS.map((m, i) => (
                      <th key={i} className={`py-2.5 text-center font-medium w-8 ${i === month ? "text-indigo-600 bg-indigo-50/60" : "text-slate-400"}`}>{m}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-slate-400 font-medium w-28 min-w-[100px]">Montant</th>
                    {typeCharge === "FOND" && selectedAppel && (<>
                      <th className="px-2 py-2.5 text-right text-slate-400 font-medium w-20 min-w-[70px]">Appelé</th>
                      <th className="px-2 py-2.5 text-right text-emerald-500 font-medium w-20 min-w-[70px]">Payé</th>
                      <th className="px-2 py-2.5 text-right text-red-400 font-medium w-20 min-w-[70px]">Reste</th>
                    </>)}
                    <th className="px-2 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([groupName, groupRows]) => {
                    const isCollapsed = collapsedGroups.has(groupName);
                    const colSpan = typeCharge === "FOND" && selectedAppel ? 19 : 16;
                    return (
                      <>
                        {/* ── Groupe header ── */}
                        <tr key={`g_${groupName}`}
                          className="bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition"
                          onClick={() => toggleGroup(groupName)}>
                          <td colSpan={colSpan} className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round"
                                className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {groupName}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {groupRows.length} lot{groupRows.length > 1 ? "s" : ""}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* ── Lignes lots ── */}
                        {!isCollapsed && groupRows.map((row, ri) => {
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
                                const isSel    = sel.has(mi);
                                const isLocked = row.paidAny[mi];
                                return (
                                  <td key={mi} className={`py-2 text-center px-0.5 ${mi === month ? "bg-indigo-50/30" : ""}`}>
                                    {isPaid ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[9px] font-bold select-none">✓</span>
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
                              {typeCharge === "FOND" && selectedAppel && (() => {
                                const d = detailsByLot[String(row.lot_id)];
                                const appele = d?.montant ?? 0;
                                const paye   = d?.montant_recu ?? 0;
                                const reste  = appele - paye;
                                return (<>
                                  <td className="px-2 py-1.5 text-right text-xs font-mono text-slate-500">{appele > 0 ? fmt(appele) : "—"}</td>
                                  <td className="px-2 py-1.5 text-right text-xs font-mono text-emerald-600">{paye > 0 ? fmt(paye) : "—"}</td>
                                  <td className={`px-2 py-1.5 text-right text-xs font-mono font-bold ${reste > 0 ? "text-red-500" : "text-emerald-600"}`}>
                                    {appele > 0 ? fmt(reste) : "—"}
                                  </td>
                                </>);
                              })()}
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
                      </>
                    );
                  })}
                  {rows.length === 0 && !loading && (
                    <tr><td colSpan={typeCharge === "FOND" && selectedAppel ? 19 : 16} className="text-center text-slate-400 py-10 text-xs">Aucun lot pour {year}</td></tr>
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
          modeles={modeles} contrats={contrats} comptes={comptes}
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

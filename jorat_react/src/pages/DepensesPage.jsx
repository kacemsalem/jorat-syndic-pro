import { useState, useEffect, useMemo, useRef } from "react";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const MOIS_OPTIONS = [
  { value: "JAN", label: "Janvier" }, { value: "FEV", label: "Février" },
  { value: "MAR", label: "Mars" },    { value: "AVR", label: "Avril" },
  { value: "MAI", label: "Mai" },     { value: "JUN", label: "Juin" },
  { value: "JUL", label: "Juillet" }, { value: "AOU", label: "Août" },
  { value: "SEP", label: "Septembre"},{ value: "OCT", label: "Octobre" },
  { value: "NOV", label: "Novembre" },{ value: "DEC", label: "Décembre" },
];

const INPUT_BASE = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition";
const INPUT_NORMAL = `${INPUT_BASE} border-slate-200 focus:border-amber-400`;
const INPUT_AUTO   = `${INPUT_BASE} border-blue-300 bg-blue-50 focus:border-blue-400`;

const EMPTY_FORM = {
  modele_depense:    "",
  libelle:           "",
  compte:            "",
  fournisseur:       "",
  date_depense:      new Date().toISOString().slice(0, 10),
  montant:           "",
  detail:            "",
  facture_reference: "",
  commentaire:       "",
  mois:              "",
};

const EMPTY_AUTO = { libelle: false, compte: false, fournisseur: false };

// ── Mini sub-form quick-add ──────────────────────────────────────────────────
function SubFormFamille({ onBack, onCreated }) {
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/familles-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom_famille: nom.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      const created = await res.json();
      onCreated(created);
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Retour à la dépense
      </button>
      <h3 className="text-base font-bold text-slate-800">Nouvelle famille de dépense</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT_NORMAL} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Entretien, Charges communes…" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

function SubFormModele({ familles, comptes, fournisseurs, onBack, onCreated }) {
  const [form, setForm] = useState({ nom: "", famille: "", compte_comptable: "", fournisseur: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        nom: form.nom.trim(),
        famille: form.famille || null,
        compte_comptable: form.compte_comptable || null,
        fournisseur: form.fournisseur || null,
        actif: true,
      };
      const res = await fetch("/api/modeles-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      const created = await res.json();
      onCreated(created);
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Retour à la dépense
      </button>
      <h3 className="text-base font-bold text-slate-800">Nouveau modèle de dépense</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT_NORMAL} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Nettoyage mensuel" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Famille</label>
          <select className={INPUT_NORMAL} value={form.famille} onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}>
            <option value="">— Aucune —</option>
            {familles.map(f => <option key={f.id} value={f.id}>{f.nom_famille}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
          <select className={INPUT_NORMAL} value={form.compte_comptable} onChange={e => setForm(f => ({ ...f, compte_comptable: e.target.value }))}>
            <option value="">— Aucun —</option>
            {comptes.filter(c => c.code !== "000").map(c => <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur</label>
          <select className={INPUT_NORMAL} value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
            <option value="">— Aucun —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

function SubFormCompte({ onBack, onCreated }) {
  const [form, setForm] = useState({ code: "", libelle: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.code.trim() || !form.libelle.trim()) { setError("Code et libellé sont obligatoires."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/comptes-comptables/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ code: form.code.trim(), libelle: form.libelle.trim(), actif: true }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      const created = await res.json();
      onCreated(created);
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Retour à la dépense
      </button>
      <h3 className="text-base font-bold text-slate-800">Nouveau compte comptable</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
          <input className={INPUT_NORMAL} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex : 6140" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
          <input className={INPUT_NORMAL} value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Ex : Charges d'entretien" />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

function SubFormFournisseur({ onBack, onCreated }) {
  const [form, setForm] = useState({ nom: "", telephone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/fournisseurs/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: form.nom.trim(), telephone: form.telephone, email: form.email, actif: true }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      const created = await res.json();
      onCreated(created);
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Retour à la dépense
      </button>
      <h3 className="text-base font-bold text-slate-800">Nouveau fournisseur</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT_NORMAL} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom du fournisseur" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone</label>
          <input className={INPUT_NORMAL} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="06XXXXXXXX" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
          <input type="email" className={INPUT_NORMAL} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@…" />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DepensesPage() {
  const [depenses,     setDepenses]     = useState([]);
  const [modeles,      setModeles]      = useState([]);
  const [familles,     setFamilles]     = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [comptes,      setComptes]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [autoFilled,   setAutoFilled]   = useState(EMPTY_AUTO);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [subForm,      setSubForm]      = useState(null); // "famille"|"modele"|"compte"|"fournisseur"
  const [openMenu,     setOpenMenu]     = useState(null);
  const menuRef = useRef(null);

  // Filters
  const [filterAnnee,       setFilterAnnee]       = useState("");
  const [filterMois,        setFilterMois]        = useState("");
  const [filterFamille,     setFilterFamille]     = useState("");
  const [filterFournisseur, setFilterFournisseur] = useState("");
  const [filterAttente,     setFilterAttente]     = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/depenses/",                     { credentials: "include" }).then(r => r.json()),
      fetch("/api/modeles-depense/?actif=true",   { credentials: "include" }).then(r => r.json()),
      fetch("/api/familles-depense/",             { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true",      { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true",{ credentials: "include" }).then(r => r.json()),
    ]).then(([dep, mod, fam, fou, cpt]) => {
      setDepenses(Array.isArray(dep) ? dep : (dep.results ?? []));
      setModeles(Array.isArray(mod) ? mod : (mod.results ?? []));
      setFamilles(Array.isArray(fam) ? fam : (fam.results ?? []));
      setFournisseurs(Array.isArray(fou) ? fou : (fou.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Auto-fill from modele ─────────────────────────────────────────────────
  const handleModeleChange = (modeleId) => {
    const m = modeles.find(m => String(m.id) === String(modeleId));
    setForm(f => {
      const updates = { ...f, modele_depense: modeleId };
      const newAuto = { ...autoFilled };
      if (m) {
        if (autoFilled.libelle || !f.libelle) { updates.libelle = m.nom; newAuto.libelle = !!m.nom; }
        if (autoFilled.compte || !f.compte)   { updates.compte = m.compte_comptable ? String(m.compte_comptable) : ""; newAuto.compte = !!m.compte_comptable; }
        if (autoFilled.fournisseur || !f.fournisseur) { updates.fournisseur = m.fournisseur ? String(m.fournisseur) : ""; newAuto.fournisseur = !!m.fournisseur; }
        setAutoFilled(newAuto);
      } else { setAutoFilled(EMPTY_AUTO); }
      return updates;
    });
  };

  const clearAuto = (field) => setAutoFilled(a => ({ ...a, [field]: false }));

  const openCreate = () => { setForm(EMPTY_FORM); setAutoFilled(EMPTY_AUTO); setEditItem(null); setError(""); setSubForm(null); setShowForm(true); };
  const openEdit   = (d)  => {
    setForm({
      modele_depense:    String(d.modele_depense   || ""),
      libelle:           d.libelle                  || "",
      compte:            String(d.compte            || ""),
      fournisseur:       String(d.fournisseur       || ""),
      date_depense:      d.date_depense,
      montant:           d.montant,
      detail:            d.detail                   || "",
      facture_reference: d.facture_reference        || "",
      commentaire:       d.commentaire              || "",
      mois:              d.mois                     || "",
    });
    setAutoFilled(EMPTY_AUTO); setEditItem(d); setError(""); setSubForm(null); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setSubForm(null); };

  const handleSave = async () => {
    if (!form.libelle.trim()) { setError("Le libellé est obligatoire."); return; }
    if (!form.montant || parseFloat(form.montant) <= 0) { setError("Le montant doit être > 0."); return; }
    if (!form.date_depense) { setError("La date est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      modele_depense:    form.modele_depense    || null,
      libelle:           form.libelle,
      compte:            form.compte            || null,
      fournisseur:       form.fournisseur       || null,
      date_depense:      form.date_depense,
      montant:           form.montant,
      detail:            form.detail,
      facture_reference: form.facture_reference,
      commentaire:       form.commentaire,
      mois:              form.mois              || null,
    };
    const url = editItem ? `/api/depenses/${editItem.id}/` : "/api/depenses/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      closeForm(); fetchAll();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dep) => {
    if (!confirm(`Supprimer "${dep.libelle}" ?`)) return;
    await fetch(`/api/depenses/${dep.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchAll();
  };

  const nbAttente = useMemo(() => depenses.filter(d => d.compte_code === "000").length, [depenses]);

  const filtered = useMemo(() => {
    let list = depenses;
    if (filterAnnee)       list = list.filter(d => d.date_depense?.startsWith(filterAnnee));
    if (filterMois)        list = list.filter(d => d.mois === filterMois);
    if (filterFamille)     list = list.filter(d => d.modele_famille_nom === filterFamille || d.categorie_famille === filterFamille);
    if (filterFournisseur) list = list.filter(d => String(d.fournisseur) === filterFournisseur);
    if (filterAttente)     list = list.filter(d => d.compte_code === "000");
    return list;
  }, [depenses, filterAnnee, filterMois, filterFamille, filterFournisseur, filterAttente]);

  const totalFiltered = filtered.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const annees = useMemo(() => [...new Set(depenses.map(d => d.date_depense?.slice(0, 4)).filter(Boolean))].sort().reverse(), [depenses]);
  const famillesList = useMemo(() => [...new Set(depenses.map(d => d.modele_famille_nom || d.categorie_famille).filter(Boolean))].sort(), [depenses]);
  const fournisseursUsed = useMemo(() => {
    const ids = [...new Set(depenses.map(d => d.fournisseur).filter(Boolean))];
    return fournisseurs.filter(f => ids.includes(f.id));
  }, [depenses, fournisseurs]);

  const modelesByFamille = useMemo(() => {
    const map = {};
    modeles.forEach(m => { const k = m.famille_nom || "—"; if (!map[k]) map[k] = []; map[k].push(m); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [modeles]);

  // ── Sub-form callbacks ────────────────────────────────────────────────────
  const onFamilleCreated = (created) => {
    setFamilles(prev => [...prev, created]);
    setSubForm(null);
  };
  const onModeleCreated = (created) => {
    setModeles(prev => [...prev, created]);
    handleModeleChange(String(created.id));
    setSubForm(null);
  };
  const onCompteCreated = (created) => {
    setComptes(prev => [...prev, created]);
    clearAuto("compte");
    setForm(f => ({ ...f, compte: String(created.id) }));
    setSubForm(null);
  };
  const onFournisseurCreated = (created) => {
    setFournisseurs(prev => [...prev, created]);
    clearAuto("fournisseur");
    setForm(f => ({ ...f, fournisseur: String(created.id) }));
    setSubForm(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} dépense{filtered.length !== 1 ? "s" : ""} — Total :{" "}
            <span className="font-semibold text-amber-600">
              {totalFiltered.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </span>
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow self-start sm:self-auto">
          + Nouvelle dépense
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterMois} onChange={e => setFilterMois(e.target.value)}>
          <option value="">Toutes périodes</option>
          {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterFamille} onChange={e => setFilterFamille(e.target.value)}>
          <option value="">Toutes familles</option>
          {famillesList.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterFournisseur} onChange={e => setFilterFournisseur(e.target.value)}>
          <option value="">Tous fournisseurs</option>
          {fournisseursUsed.map(f => <option key={f.id} value={String(f.id)}>{f.nom_complet || f.nom}</option>)}
        </select>
        {nbAttente > 0 && (
          <button onClick={() => setFilterAttente(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              filterAttente ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
            }`}>
            ⚠ À affecter ({nbAttente})
          </button>
        )}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune dépense</div>
      ) : (
        <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(dep => (
            <div key={dep.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 relative">
              {/* Top row: date + famille + menu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-mono">{dep.date_depense}</span>
                  {dep.mois && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{dep.mois}</span>
                  )}
                  {dep.modele_famille_nom && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                      {dep.modele_famille_nom}
                    </span>
                  )}
                </div>
                {/* 3-dot menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === dep.id ? null : dep.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === dep.id && (
                    <div className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-36">
                      <button onClick={() => { openEdit(dep); setOpenMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Modifier</button>
                      <button onClick={() => { handleDelete(dep); setOpenMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Supprimer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Libellé */}
              <div className="font-semibold text-slate-800 text-sm leading-snug">
                {dep.libelle}
              </div>

              {/* Compte + warning */}
              <div className="flex items-center gap-1.5">
                <span className={`font-mono text-xs px-2 py-0.5 rounded ${dep.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                  {dep.compte_code}
                </span>
                <span className="text-xs text-slate-400 truncate">{dep.compte_libelle}</span>
                {dep.compte_code === "000" && (
                  <span className="text-[10px] font-bold text-orange-500">⚠</span>
                )}
              </div>

              {/* Fournisseur + modèle */}
              {(dep.fournisseur_nom || dep.modele_nom) && (
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  {dep.fournisseur_nom && <span>{dep.fournisseur_nom}</span>}
                  {dep.modele_nom     && <span className="text-slate-400">{dep.modele_nom}</span>}
                </div>
              )}

              {/* Réf */}
              {dep.facture_reference && (
                <div className="text-xs text-slate-400">Réf: {dep.facture_reference}</div>
              )}

              {/* Montant */}
              <div className="mt-auto pt-2 border-t border-slate-50 text-right font-bold text-amber-700 text-base">
                {parseFloat(dep.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-amber-800">
            Total : {totalFiltered.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">

            {/* Sub-forms */}
            {subForm === "famille" && (
              <SubFormFamille onBack={() => setSubForm(null)} onCreated={onFamilleCreated} />
            )}
            {subForm === "modele" && (
              <SubFormModele familles={familles} comptes={comptes} fournisseurs={fournisseurs}
                onBack={() => setSubForm(null)} onCreated={onModeleCreated} />
            )}
            {subForm === "compte" && (
              <SubFormCompte onBack={() => setSubForm(null)} onCreated={onCompteCreated} />
            )}
            {subForm === "fournisseur" && (
              <SubFormFournisseur onBack={() => setSubForm(null)} onCreated={onFournisseurCreated} />
            )}

            {/* Main form */}
            {!subForm && (
              <>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                  {editItem ? "Modifier la dépense" : "Nouvelle dépense"}
                </h2>

                {Object.values(autoFilled).some(Boolean) && (
                  <p className="text-[11px] text-blue-500 mb-3 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded border border-blue-300 bg-blue-50" />
                    Champ pré-rempli par le modèle — modifiable librement
                  </p>
                )}

                <div className="space-y-3">

                  {/* Modèle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Modèle de dépense <span className="font-normal text-slate-400">(optionnel)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                        value={form.modele_depense}
                        onChange={e => handleModeleChange(e.target.value)}
                      >
                        <option value="">— Choisir un modèle —</option>
                        {modelesByFamille.map(([familleNom, items]) => (
                          <optgroup key={familleNom} label={familleNom}>
                            {items.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <button type="button" onClick={() => setSubForm("modele")}
                        title="Nouveau modèle"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 text-lg font-bold transition border border-slate-200">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Libellé */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Libellé <span className="text-red-500">*</span>
                      {autoFilled.libelle && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                    </label>
                    <input
                      className={autoFilled.libelle ? INPUT_AUTO : INPUT_NORMAL}
                      value={form.libelle}
                      onChange={e => { clearAuto("libelle"); setForm(f => ({ ...f, libelle: e.target.value })); }}
                      placeholder="Description courte de la dépense"
                    />
                  </div>

                  {/* Date | Période | Réf */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                      <input type="date" className={INPUT_NORMAL}
                        value={form.date_depense}
                        onChange={e => setForm(f => ({ ...f, date_depense: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
                      <select className={INPUT_NORMAL}
                        value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}>
                        <option value="">— Mois —</option>
                        {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Réf. facture</label>
                      <input className={INPUT_NORMAL}
                        value={form.facture_reference}
                        onChange={e => setForm(f => ({ ...f, facture_reference: e.target.value }))}
                        placeholder="FAC-2026-001"
                      />
                    </div>
                  </div>

                  {/* Montant (highlighted) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Montant (DH) <span className="text-red-500">*</span>
                    </label>
                    <input type="number" min="0.01" step="0.01"
                      className="w-full border-2 border-amber-300 bg-amber-50 rounded-xl px-3 py-2 text-sm font-semibold text-amber-900 focus:outline-none focus:border-amber-500 placeholder:text-amber-300 placeholder:font-normal transition"
                      value={form.montant}
                      onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Compte + Fournisseur */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Compte comptable
                        {autoFilled.compte && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                      </label>
                      <div className="flex gap-2">
                        <select
                          className={`flex-1 ${autoFilled.compte ? INPUT_AUTO : INPUT_NORMAL}`}
                          value={form.compte}
                          onChange={e => { clearAuto("compte"); setForm(f => ({ ...f, compte: e.target.value })); }}
                        >
                          <option value="">— Attente (000) —</option>
                          {comptes.filter(c => c.code !== "000").map(c => (
                            <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setSubForm("compte")}
                          title="Nouveau compte"
                          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 text-lg font-bold transition border border-slate-200">
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Fournisseur
                        {autoFilled.fournisseur && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                      </label>
                      <div className="flex gap-2">
                        <select
                          className={`flex-1 ${autoFilled.fournisseur ? INPUT_AUTO : INPUT_NORMAL}`}
                          value={form.fournisseur}
                          onChange={e => { clearAuto("fournisseur"); setForm(f => ({ ...f, fournisseur: e.target.value })); }}
                        >
                          <option value="">— Aucun —</option>
                          {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                        </select>
                        <button type="button" onClick={() => setSubForm("fournisseur")}
                          title="Nouveau fournisseur"
                          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 text-lg font-bold transition border border-slate-200">
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Détail | Commentaire */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Détail</label>
                      <textarea rows={2} className={INPUT_NORMAL}
                        value={form.detail}
                        onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                        placeholder="Description détaillée (optionnel)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire interne</label>
                      <textarea rows={2} className={INPUT_NORMAL}
                        value={form.commentaire}
                        onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                        placeholder="Note interne…"
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

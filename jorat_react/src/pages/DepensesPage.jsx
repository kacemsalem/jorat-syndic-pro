import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ChartDepenses from "../components/ChartDepenses";

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
const INPUT_NORMAL = `${INPUT_BASE} border-slate-200 focus:border-blue-400`;
const INPUT_AUTO   = `${INPUT_BASE} border-blue-300 bg-blue-50 focus:border-blue-400`;

const EMPTY_FORM = {
  modele_depense:    "",
  libelle:           "",
  categorie:         "",
  compte:            "",
  fournisseur:       "",
  date_depense:      new Date().toISOString().slice(0, 10),
  montant:           "",
  detail:            "",
  facture_reference: "",
  commentaire:       "",
  mois:              "",
};

const EMPTY_AUTO = { libelle: false, categorie: false, compte: false, fournisseur: false };

// ── Mini sub-form quick-add ──────────────────────────────────────────────────
function SubFormFamille({ onBack, onCreated }) {
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/categories-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: nom.trim(), famille: "DIVERS" }),
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
      <h3 className="text-base font-bold text-slate-800">Nouvelle catégorie</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT_NORMAL} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Entretien, Charges communes…" />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

function SubFormModele({ familles: initialFamilles, comptes: initialComptes, fournisseurs: initialFournisseurs, onBack, onCreated, onFamilleAdded, onCompteAdded, onFournisseurAdded }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", famille: "", compte_comptable: "", fournisseur: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [localFamilles,     setLocalFamilles]     = useState(initialFamilles);
  const [localComptes,      setLocalComptes]      = useState(initialComptes);
  const [localFournisseurs, setLocalFournisseurs] = useState(initialFournisseurs);

  const [showNewCat,  setShowNewCat]  = useState(false);
  const [newCatNom,   setNewCatNom]   = useState("");
  const [savingCat,   setSavingCat]   = useState(false);

  const [showNewCpt,  setShowNewCpt]  = useState(false);
  const [newCptCode,  setNewCptCode]  = useState("");
  const [newCptLib,   setNewCptLib]   = useState("");
  const [savingCpt,   setSavingCpt]   = useState(false);

  const [showNewFou,  setShowNewFou]  = useState(false);
  const [newFouNom,   setNewFouNom]   = useState("");
  const [savingFou,   setSavingFou]   = useState(false);

  const handleCreateCat = async () => {
    if (!newCatNom.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/categories-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: newCatNom.trim(), famille: "DIVERS" }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setLocalFamilles(prev => [...prev, created]);
      setForm(f => ({ ...f, famille: String(created.id) }));
      onFamilleAdded?.(created);
      setNewCatNom(""); setShowNewCat(false);
    } finally { setSavingCat(false); }
  };

  const handleCreateCpt = async () => {
    if (!newCptCode.trim() || !newCptLib.trim()) return;
    setSavingCpt(true);
    try {
      const res = await fetch("/api/comptes-comptables/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ code: newCptCode.trim(), libelle: newCptLib.trim(), actif: true }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setLocalComptes(prev => [...prev, created]);
      setForm(f => ({ ...f, compte_comptable: String(created.id) }));
      onCompteAdded?.(created);
      setNewCptCode(""); setNewCptLib(""); setShowNewCpt(false);
    } finally { setSavingCpt(false); }
  };

  const handleCreateFou = async () => {
    if (!newFouNom.trim()) return;
    setSavingFou(true);
    try {
      const res = await fetch("/api/fournisseurs/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: newFouNom.trim(), actif: true }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setLocalFournisseurs(prev => [...prev, created]);
      setForm(f => ({ ...f, fournisseur: String(created.id) }));
      onFournisseurAdded?.(created);
      setNewFouNom(""); setShowNewFou(false);
    } finally { setSavingFou(false); }
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        nom: form.nom.trim(),
        categorie:        form.famille          || null,
        compte_comptable: form.compte_comptable || null,
        fournisseur:      form.fournisseur      || null,
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

  const BtnPlus = ({ onClick }) => (
    <button type="button" onClick={onClick}
      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 text-lg font-bold transition border border-slate-200">
      +
    </button>
  );
  const BtnLink = ({ url, title }) => (
    <button type="button" onClick={() => navigate(url)} title={title}
      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">
      ↗
    </button>
  );
  const InlineActions = ({ onSave, saving, onCancel }) => (
    <>
      <button onClick={onSave} disabled={saving}
        className="shrink-0 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
        {saving ? "…" : "Créer"}
      </button>
      <button onClick={onCancel}
        className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">✕</button>
    </>
  );

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Retour à la dépense
      </button>
      <h3 className="text-base font-bold text-slate-800">Nouveau modèle de dépense</h3>

      {/* Nom */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT_NORMAL} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Nettoyage mensuel" />
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie</label>
        <div className="flex gap-2">
          <select className={`flex-1 ${INPUT_NORMAL}`} value={form.famille} onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}>
            <option value="">— Aucune —</option>
            {localFamilles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <BtnPlus onClick={() => { setShowNewCat(v => !v); setShowNewCpt(false); setShowNewFou(false); }} />
        </div>
        {showNewCat && (
          <div className="mt-2 flex gap-2 items-center">
            <input className={`flex-1 ${INPUT_NORMAL}`} value={newCatNom} onChange={e => setNewCatNom(e.target.value)} placeholder="Nom de la catégorie…" />
            <InlineActions onSave={handleCreateCat} saving={savingCat} onCancel={() => { setShowNewCat(false); setNewCatNom(""); }} />
          </div>
        )}
      </div>

      {/* Compte comptable */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
        <div className="flex gap-2">
          <select className={`flex-1 ${INPUT_NORMAL}`} value={form.compte_comptable} onChange={e => setForm(f => ({ ...f, compte_comptable: e.target.value }))}>
            <option value="">— Aucun —</option>
            {localComptes.filter(c => c.code !== "000").map(c => <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>)}
          </select>
          <BtnPlus onClick={() => { setShowNewCpt(v => !v); setShowNewCat(false); setShowNewFou(false); }} />
          <BtnLink url="/comptes-comptables" title="Gérer le plan comptable" />
        </div>
        {showNewCpt && (
          <div className="mt-2 flex gap-2 items-center">
            <input className={`w-16 ${INPUT_NORMAL}`} value={newCptCode} onChange={e => setNewCptCode(e.target.value)} placeholder="Code…" />
            <input className={`flex-1 ${INPUT_NORMAL}`} value={newCptLib}  onChange={e => setNewCptLib(e.target.value)}  placeholder="Libellé…" />
            <InlineActions onSave={handleCreateCpt} saving={savingCpt} onCancel={() => { setShowNewCpt(false); setNewCptCode(""); setNewCptLib(""); }} />
          </div>
        )}
      </div>

      {/* Fournisseur */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur</label>
        <div className="flex gap-2">
          <select className={`flex-1 ${INPUT_NORMAL}`} value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
            <option value="">— Aucun —</option>
            {localFournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
          </select>
          <BtnPlus onClick={() => { setShowNewFou(v => !v); setShowNewCat(false); setShowNewCpt(false); }} />
          <BtnLink url="/fournisseurs" title="Gérer les fournisseurs" />
        </div>
        {showNewFou && (
          <div className="mt-2 flex gap-2 items-center">
            <input className={`flex-1 ${INPUT_NORMAL}`} value={newFouNom} onChange={e => setNewFouNom(e.target.value)} placeholder="Nom du fournisseur…" />
            <InlineActions onSave={handleCreateFou} saving={savingFou} onCancel={() => { setShowNewFou(false); setNewFouNom(""); }} />
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
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
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
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
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {saving ? "…" : "Créer"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DepensesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [depenses,     setDepenses]     = useState([]);
  const [modeles,      setModeles]      = useState([]);
  const [categories,   setCategories]   = useState([]);
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

  // Filters
  const [filterAnnee,       setFilterAnnee]       = useState("");
  const [filterMois,        setFilterMois]        = useState("");
  const [filterFamille,     setFilterFamille]     = useState("");
  const [filterFournisseur, setFilterFournisseur] = useState("");
  const [filterAttente,     setFilterAttente]     = useState(false);
  const [showChart,         setShowChart]         = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/depenses/",                     { credentials: "include" }).then(r => r.json()),
      fetch("/api/modeles-depense/?actif=true",   { credentials: "include" }).then(r => r.json()),
      fetch("/api/categories-depense/?actif=true", { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true",       { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([dep, mod, cat, fou, cpt]) => {
      setDepenses(Array.isArray(dep) ? dep : (dep.results ?? []));
      setModeles(Array.isArray(mod) ? mod : (mod.results ?? []));
      setCategories(Array.isArray(cat) ? cat : (cat.results ?? []));
      setFournisseurs(Array.isArray(fou) ? fou : (fou.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (location.state?.openForm) {
      openCreate();
      window.history.replaceState({}, "");
    }
  }, []);



  // ── Auto-fill from modele ─────────────────────────────────────────────────
  const handleModeleChange = (modeleId) => {
    const m = modeles.find(m => String(m.id) === String(modeleId));
    if (m) {
      setForm(f => ({
        ...f,
        modele_depense: modeleId,
        libelle:    m.nom || f.libelle,
        categorie:  (autoFilled.categorie || !f.categorie) ? (m.categorie ? String(m.categorie) : "") : f.categorie,
        compte:     (autoFilled.compte     || !f.compte)     ? (m.compte_comptable ? String(m.compte_comptable) : "") : f.compte,
        fournisseur:(autoFilled.fournisseur|| !f.fournisseur) ? (m.fournisseur      ? String(m.fournisseur)      : "") : f.fournisseur,
      }));
      setAutoFilled({ libelle: !!m.nom, categorie: !!m.categorie, compte: !!m.compte_comptable, fournisseur: !!m.fournisseur });
    } else {
      setForm(f => ({ ...f, modele_depense: modeleId }));
      setAutoFilled(EMPTY_AUTO);
    }
  };

  const clearAuto = (field) => setAutoFilled(a => ({ ...a, [field]: false }));

  const openCreate = () => {
    const divers = categories.find(c => c.nom.toLowerCase() === "divers");
    setForm({ ...EMPTY_FORM, mois: MOIS_OPTIONS[new Date().getMonth()].value, categorie: divers ? String(divers.id) : "" });
    setAutoFilled(EMPTY_AUTO); setEditItem(null); setError(""); setSubForm(null); setShowForm(true);
  };
  const openEdit   = (d)  => {
    setForm({
      modele_depense:    String(d.modele_depense   || ""),
      libelle:           d.libelle                  || "",
      categorie:         String(d.categorie         || ""),
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
    if (!form.categorie) { setError("La catégorie est obligatoire."); return; }
    if (!form.montant || parseFloat(form.montant) <= 0) { setError("Le montant doit être > 0."); return; }
    if (!form.date_depense) { setError("La date est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      modele_depense:    form.modele_depense    || null,
      libelle:           form.libelle,
      categorie:         form.categorie         || null,
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
    if (filterFamille)     list = list.filter(d => d.modele_categorie_nom === filterFamille || d.categorie_nom === filterFamille);
    if (filterFournisseur) list = list.filter(d => String(d.fournisseur) === filterFournisseur);
    if (filterAttente)     list = list.filter(d => d.compte_code === "000");
    return list;
  }, [depenses, filterAnnee, filterMois, filterFamille, filterFournisseur, filterAttente]);

  const totalFiltered = filtered.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const annees = useMemo(() => [...new Set(depenses.map(d => d.date_depense?.slice(0, 4)).filter(Boolean))].sort().reverse(), [depenses]);
  const famillesList = useMemo(() => [...new Set(depenses.map(d => d.modele_categorie_nom || d.categorie_nom).filter(Boolean))].sort(), [depenses]);
  const fournisseursUsed = useMemo(() => {
    const ids = [...new Set(depenses.map(d => d.fournisseur).filter(Boolean))];
    return fournisseurs.filter(f => ids.includes(f.id));
  }, [depenses, fournisseurs]);

  const modelesByFamille = useMemo(() => {
    const map = {};
    modeles.forEach(m => { const k = m.categorie_nom || "—"; if (!map[k]) map[k] = []; map[k].push(m); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [modeles]);

  // ── Sub-form callbacks ────────────────────────────────────────────────────
  const onFamilleCreated = (created) => {
    setCategories(prev => [...prev, created]);
    clearAuto("categorie");
    setForm(f => ({ ...f, categorie: String(created.id) }));
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

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
  const isFiltered = filterAnnee || filterMois || filterFamille || filterFournisseur || filterAttente;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6">

      {/* ── En-tête bleu ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-14">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Finances</p>
            <h1 className="text-white font-bold text-xl leading-tight">Dépenses</h1>
            <p className="text-white/50 text-[10px]">
              {filtered.length} dépense{filtered.length !== 1 ? "s" : ""} {isFiltered ? "filtrées" : "au total"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/contrats")}
              className="px-2.5 py-1.5 bg-white/15 border border-white/20 rounded-xl text-[10px] font-bold text-white/80 hover:bg-white/25 transition">
              Contrats
            </button>
            <button onClick={() => navigate("/modeles-depense")}
              className="px-2.5 py-1.5 bg-white/15 border border-white/20 rounded-xl text-[10px] font-bold text-white/80 hover:bg-white/25 transition">
              Modèles
            </button>
            <button onClick={() => setShowChart(v => !v)}
              title="Évolution des dépenses"
              className={`w-10 h-10 border rounded-full flex items-center justify-center transition shadow ${
                showChart ? "bg-white/90 border-white/90" : "bg-white/20 border-white/20 hover:bg-white/30"
              }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke={showChart ? "#2563EB" : "white"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
            </button>
            <button onClick={openCreate}
              className="w-10 h-10 bg-white/20 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition shadow">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        <p className="text-white/60 text-xs mb-1">Total dépenses</p>
        <p className="text-4xl font-bold text-white leading-none mb-1">
          {fmt(totalFiltered)}
          <span className="text-base font-normal text-white/50 ml-2">MAD</span>
        </p>
      </div>

      {/* ── Contenu flottant ──────────────────────────────────── */}
      <div className="px-4 -mt-6 space-y-4 pb-6">

        {/* Graphe évolution dépenses */}
        {showChart && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Évolution des dépenses</p>
            <ChartDepenses depenses={depenses} />
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Filtres</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600">
              <option value="">Toutes années</option>
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600">
              <option value="">Tous mois</option>
              {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={filterFamille} onChange={e => setFilterFamille(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600">
              <option value="">Toutes catégories</option>
              {famillesList.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={filterFournisseur} onChange={e => setFilterFournisseur(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600">
              <option value="">Tous fournisseurs</option>
              {fournisseursUsed.map(f => <option key={f.id} value={String(f.id)}>{f.nom_complet || f.nom}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {nbAttente > 0 && (
              <button onClick={() => setFilterAttente(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                  filterAttente ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                }`}>
                ⚠ À affecter ({nbAttente})
              </button>
            )}
            {isFiltered && (
              <button onClick={() => { setFilterAnnee(""); setFilterMois(""); setFilterFamille(""); setFilterFournisseur(""); setFilterAttente(false); }}
                className="text-[10px] text-blue-600 font-semibold hover:text-blue-700">
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
            <p className="text-slate-300 text-sm">Aucune dépense</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dépenses</p>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {filtered.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map(dep => (
                <div key={dep.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{dep.libelle}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">{dep.date_depense}</span>
                      {dep.mois && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {dep.mois}
                        </span>
                      )}
                      {(dep.modele_categorie_nom || dep.categorie_nom) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {dep.modele_categorie_nom || dep.categorie_nom}
                        </span>
                      )}
                      {dep.compte_code && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${dep.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"}`}>
                          {dep.compte_code}{dep.compte_code === "000" ? " ⚠" : ""}
                        </span>
                      )}
                    </div>
                    {dep.fournisseur_nom && (
                      <p className="text-[10px] text-slate-400 truncate">{dep.fournisseur_nom}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">−{fmt(dep.montant)}</p>
                    <p className="text-[9px] text-slate-400">MAD</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => openEdit(dep)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(dep)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal formulaire ──────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto p-4 pb-20">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto p-6 my-4">
            {subForm === "famille" && (
              <SubFormFamille onBack={() => setSubForm(null)} onCreated={onFamilleCreated} />
            )}
            {subForm === "modele" && (
              <SubFormModele familles={categories} comptes={comptes} fournisseurs={fournisseurs}
                onBack={() => setSubForm(null)} onCreated={onModeleCreated}
                onFamilleAdded={created => setFamilles(prev => [...prev, created])}
                onCompteAdded={created => setComptes(prev => [...prev, created])}
                onFournisseurAdded={created => setFournisseurs(prev => [...prev, created])} />
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

                {!editItem && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs font-bold text-blue-800 mb-1">Dépense récurrente ou sous contrat ?</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Utilisez les boutons <strong>Contrats</strong> ou <strong>Modèles</strong> en haut de page
                      pour générer automatiquement la dépense avec les champs pré-remplis.
                    </p>
                    <p className="text-[11px] text-blue-500 mt-1.5">
                      Pour une dépense ponctuelle, renseignez simplement les champs ci-dessous. ↓
                    </p>
                  </div>
                )}

                <div className="space-y-3">

                  {/* Libellé */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Libellé <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={INPUT_NORMAL}
                      value={form.libelle}
                      onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                      placeholder="Description courte de la dépense"
                    />
                  </div>

                  {/* Famille */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Catégorie <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        className={`flex-1 ${INPUT_NORMAL}`}
                        value={form.categorie}
                        onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                      >
                        <option value="">— Aucune —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => navigate("/familles-depense", { state: { openForm: true } })}
                        title="Gérer les catégories"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">↗</button>
                    </div>
                  </div>

                  {/* Date | Période | Réf */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                      <input type="date" className={INPUT_NORMAL}
                        value={form.date_depense}
                        onChange={e => {
                          const d = e.target.value;
                          const moisAuto = d ? MOIS_OPTIONS[new Date(d + "T00:00:00").getMonth()].value : "";
                          setForm(f => ({ ...f, date_depense: d, mois: moisAuto }));
                        }}
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
                      className="w-full border-2 border-blue-300 bg-blue-50 rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 focus:outline-none focus:border-blue-500 placeholder:text-blue-300 placeholder:font-normal transition"
                      value={form.montant}
                      onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Compte comptable — ligne complète */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
                    <div className="flex gap-2">
                      <select
                        className={`flex-1 ${INPUT_NORMAL}`}
                        value={form.compte}
                        onChange={e => setForm(f => ({ ...f, compte: e.target.value }))}
                      >
                        <option value="">— Attente (000) —</option>
                        {comptes.filter(c => c.code !== "000").map(c => (
                          <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => navigate("/comptes-comptables")}
                        title="Gérer le plan comptable"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">
                        ↗
                      </button>
                    </div>
                  </div>

                  {/* Fournisseur — ligne complète */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur</label>
                    <div className="flex gap-2">
                      <select
                        className={`flex-1 ${INPUT_NORMAL}`}
                        value={form.fournisseur}
                        onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                      >
                        <option value="">— Aucun —</option>
                        {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => navigate("/fournisseurs")}
                        title="Gérer les fournisseurs"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">
                        ↗
                      </button>
                    </div>
                  </div>

                  {/* Détail — ligne complète */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Détail</label>
                    <textarea rows={2} className={INPUT_NORMAL}
                      value={form.detail}
                      onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                      placeholder="Description détaillée (optionnel)"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
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

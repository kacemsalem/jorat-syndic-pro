import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
        body: JSON.stringify({ nom: nom.trim() }),
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
      const res = await fetch("/api/familles-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: newCatNom.trim() }),
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
        famille_depense:  form.famille          || null,
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
      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 text-lg font-bold transition border border-slate-200">
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
        className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
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
  const navigate = useNavigate();
  const location = useLocation();
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
        compte:     (autoFilled.compte     || !f.compte)     ? (m.compte_comptable ? String(m.compte_comptable) : "") : f.compte,
        fournisseur:(autoFilled.fournisseur|| !f.fournisseur) ? (m.fournisseur      ? String(m.fournisseur)      : "") : f.fournisseur,
      }));
      setAutoFilled({ libelle: !!m.nom, compte: !!m.compte_comptable, fournisseur: !!m.fournisseur });
    } else {
      setForm(f => ({ ...f, modele_depense: modeleId }));
      setAutoFilled(EMPTY_AUTO);
    }
  };

  const clearAuto = (field) => setAutoFilled(a => ({ ...a, [field]: false }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, mois: MOIS_OPTIONS[new Date().getMonth()].value });
    setAutoFilled(EMPTY_AUTO); setEditItem(null); setError(""); setSubForm(null); setShowForm(true);
  };
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
        <div className="space-y-1.5">
          {filtered.map(dep => (
            <div key={dep.id} className="bg-red-50 rounded-xl border border-red-200 shadow-sm px-3 py-2.5 flex items-center gap-3 relative">
              {/* Date + badges */}
              <div className="flex flex-col gap-0.5 w-24 shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">{dep.date_depense}</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {dep.mois && <span className="text-[9px] font-semibold px-1 rounded bg-amber-100 text-amber-700">{dep.mois}</span>}
                  {(dep.modele_famille_nom || dep.categorie_famille) && (
                    <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500">{dep.modele_famille_nom || dep.categorie_famille}</span>
                  )}
                </div>
              </div>

              {/* Libellé + sous-infos */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{dep.libelle}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`font-mono text-[10px] px-1 rounded ${dep.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                    {dep.compte_code}{dep.compte_code === "000" ? " ⚠" : ""}
                  </span>
                  {dep.fournisseur_nom   && <span className="text-[10px] text-slate-400">{dep.fournisseur_nom}</span>}
                  {dep.facture_reference && <span className="text-[10px] text-slate-300">Réf: {dep.facture_reference}</span>}
                </div>
              </div>

              {/* Montant */}
              <span className="font-bold text-amber-700 text-sm shrink-0">
                {parseFloat(dep.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(dep)}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition" title="Modifier">
                  ✏️
                </button>
                <button onClick={() => handleDelete(dep)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition" title="Supprimer">
                  🗑️
                </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[96vh] overflow-y-auto">

            {/* Sub-forms */}
            {subForm === "famille" && (
              <SubFormFamille onBack={() => setSubForm(null)} onCreated={onFamilleCreated} />
            )}
            {subForm === "modele" && (
              <SubFormModele familles={familles} comptes={comptes} fournisseurs={fournisseurs}
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
                        className="flex-1 border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
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
                      <button type="button" onClick={() => navigate("/modeles-depense", { state: { openForm: true } })}
                        title="Gérer les modèles de dépense"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">
                        ↗
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
                      className="w-full border-2 border-amber-300 bg-amber-50 rounded-xl px-3 py-2 text-sm font-semibold text-amber-900 focus:outline-none focus:border-amber-500 placeholder:text-amber-300 placeholder:font-normal transition"
                      value={form.montant}
                      onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Compte comptable — ligne complète */}
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
                      <button type="button" onClick={() => navigate("/comptes-comptables")}
                        title="Gérer le plan comptable"
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">
                        ↗
                      </button>
                    </div>
                  </div>

                  {/* Fournisseur — ligne complète */}
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

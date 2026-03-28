import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

const TYPES = [
  { value: "SECURITE",    label: "Sécurité" },
  { value: "ENTRETIEN",   label: "Entretien" },
  { value: "JARDINAGE",   label: "Jardinage" },
  { value: "EAU",         label: "Eau" },
  { value: "ELECTRICITE", label: "Électricité" },
  { value: "ASCENSEUR",   label: "Ascenseur" },
  { value: "ASSURANCE",   label: "Assurance" },
  { value: "INTERNET",    label: "Internet / Télécom" },
  { value: "NETTOYAGE",   label: "Nettoyage" },
  { value: "AUTRE",       label: "Autre" },
];

const PERIODICITES = [
  { value: "MENSUEL",     label: "Mensuel" },
  { value: "BIMESTRIEL",  label: "Bimestriel (2 mois)" },
  { value: "TRIMESTRIEL", label: "Trimestriel (3 mois)" },
  { value: "SEMESTRIEL",  label: "Semestriel (6 mois)" },
  { value: "ANNUEL",      label: "Annuel" },
];

const MOIS_OPTS = [
  { v: "JAN", l: "Janvier" },  { v: "FEV", l: "Février" },  { v: "MAR", l: "Mars" },
  { v: "AVR", l: "Avril" },    { v: "MAI", l: "Mai" },       { v: "JUN", l: "Juin" },
  { v: "JUL", l: "Juillet" },  { v: "AOU", l: "Août" },      { v: "SEP", l: "Septembre" },
  { v: "OCT", l: "Octobre" },  { v: "NOV", l: "Novembre" },  { v: "DEC", l: "Décembre" },
];

const TYPE_ICONS = {
  SECURITE: "🛡️", ENTRETIEN: "🔧", JARDINAGE: "🌿", EAU: "💧",
  ELECTRICITE: "⚡", ASCENSEUR: "🛗", ASSURANCE: "📋",
  INTERNET: "📡", NETTOYAGE: "🧹", AUTRE: "📄",
};

const EMPTY = {
  reference_contrat: "", type_contrat: "", libelle: "", fournisseur: "", periodicite: "MENSUEL",
  montant: "", date_debut: "", date_fin: "", actif: true, notes: "",
  compte_comptable: "", famille_depense: "",
};

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400";

// ── Sub-forms (création rapide) ──────────────────────────────────────────────
function SubFormFournisseur({ onBack, onCreated }) {
  const [form, setForm] = useState({ nom: "", telephone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/fournisseurs/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: form.nom.trim(), telephone: form.telephone, email: form.email, actif: true }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      onCreated(await res.json());
    } catch { setError("Erreur réseau."); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">← Retour au contrat</button>
      <h3 className="text-base font-bold text-slate-800">Nouveau fournisseur</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom du fournisseur…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone</label>
          <input className={INPUT} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="0600…" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
          <input className={INPUT} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="…@…" />
        </div>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">{saving ? "…" : "Créer"}</button>
      </div>
    </div>
  );
}

function SubFormCompte({ onBack, onCreated }) {
  const [form, setForm] = useState({ code: "", libelle: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!form.code.trim() || !form.libelle.trim()) { setError("Code et libellé sont obligatoires."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/comptes-comptables/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ code: form.code.trim(), libelle: form.libelle.trim(), actif: true }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      onCreated(await res.json());
    } catch { setError("Erreur réseau."); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">← Retour au contrat</button>
      <h3 className="text-base font-bold text-slate-800">Nouveau compte comptable</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
          <input className={INPUT} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex : 6140" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
          <input className={INPUT} value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Ex : Entretien…" />
        </div>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">{saving ? "…" : "Créer"}</button>
      </div>
    </div>
  );
}

function SubFormFamille({ onBack, onCreated }) {
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/familles-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: nom.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      onCreated(await res.json());
    } catch { setError("Erreur réseau."); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">← Retour au contrat</button>
      <h3 className="text-base font-bold text-slate-800">Nouvelle famille de dépense</h3>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Entretien, Charges communes…" />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">{saving ? "…" : "Créer"}</button>
      </div>
    </div>
  );
}

export default function ContratPage() {
  const navigate = useNavigate();
  const [contrats,    setContrats]    = useState([]);
  const [fournisseurs,setFournisseurs]= useState([]);
  const [comptes,     setComptes]     = useState([]);
  const [familles,    setFamilles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterActif, setFilterActif] = useState("true");

  // Génération de dépense
  const [genModal,    setGenModal]    = useState(null);
  const [genForm,     setGenForm]     = useState({ date_depense: "", mois: "", facture_reference: "", montant: "" });
  const [genSaving,   setGenSaving]   = useState(false);
  const [genMsg,      setGenMsg]      = useState("");

  // Sous-formulaire de création rapide
  const [subForm,    setSubForm]    = useState(null); // "fournisseur"|"famille"|"compte"

  const onFournisseurCreated = (c) => { setFournisseurs(p => [...p, c]); setForm(f => ({ ...f, fournisseur: String(c.id) })); setSubForm(null); };
  const onCompteCreated      = (c) => { setComptes(p => [...p, c]); setForm(f => ({ ...f, compte_comptable: String(c.id) })); setSubForm(null); };
  const onFamilleCreated     = (c) => { setFamilles(p => [...p, c]); setForm(f => ({ ...f, famille_depense: String(c.id) })); setSubForm(null); };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/contrats/",                        { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true",          { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true",    { credentials: "include" }).then(r => r.json()),
      fetch("/api/familles-depense/",                { credentials: "include" }).then(r => r.json()),
    ]).then(([c, f, cpt, fam]) => {
      setContrats(Array.isArray(c) ? c : (c.results ?? []));
      setFournisseurs(Array.isArray(f) ? f : (f.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
      setFamilles(Array.isArray(fam) ? fam : (fam.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (c) => {
    setForm({
      reference_contrat: c.reference_contrat || "",
      type_contrat:     c.type_contrat,
      libelle:          c.libelle,
      fournisseur:      String(c.fournisseur || ""),
      periodicite:      c.periodicite,
      montant:          c.montant != null ? String(c.montant) : "",
      date_debut:       c.date_debut,
      date_fin:         c.date_fin || "",
      actif:            c.actif,
      notes:            c.notes || "",
      compte_comptable: String(c.compte_comptable || ""),
      famille_depense:  String(c.famille_depense  || ""),
    });
    setEditItem(c); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setSubForm(null); };

  const handleSave = async () => {
    if (!form.type_contrat) { setError("Le type est obligatoire."); return; }
    if (!form.libelle.trim()) { setError("Le libellé est obligatoire."); return; }
    if (!form.date_debut) { setError("La date de début est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      reference_contrat: form.reference_contrat || "",
      type_contrat:     form.type_contrat,
      libelle:          form.libelle.trim(),
      fournisseur:      form.fournisseur      || null,
      periodicite:      form.periodicite,
      montant:          form.montant          || null,
      date_debut:       form.date_debut,
      date_fin:         form.date_fin         || null,
      actif:            form.actif,
      notes:            form.notes,
      compte_comptable: form.compte_comptable || null,
      famille_depense:  form.famille_depense  || null,
    };
    const url    = editItem ? `/api/contrats/${editItem.id}/` : "/api/contrats/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur.");
        return;
      }
      closeForm(); load();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Supprimer le contrat "${c.libelle}" ?`)) return;
    await fetch(`/api/contrats/${c.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    load();
  };

  const openGen = (c) => {
    const today = new Date().toISOString().slice(0, 10);
    const moisAuto = MOIS_OPTS[new Date().getMonth()].v;
    setGenForm({ date_depense: today, mois: moisAuto, facture_reference: "", montant: c.montant ? String(c.montant) : "" });
    setGenMsg("");
    setGenModal(c);
  };

  const handleGen = async () => {
    if (!genModal) return;
    if (!genForm.montant || parseFloat(genForm.montant) <= 0) { setGenMsg("Le montant est obligatoire."); return; }
    setGenSaving(true); setGenMsg("");
    try {
      const res = await fetch(`/api/contrats/${genModal.id}/generer-depense/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(genForm),
      });
      const d = await res.json();
      if (res.ok) {
        setGenMsg(`✓ Dépense créée : ${d.libelle} — ${fmt(d.montant)} MAD`);
        setTimeout(() => { setGenModal(null); setGenMsg(""); }, 2000);
      } else {
        setGenMsg(d.detail || "Erreur.");
      }
    } catch { setGenMsg("Erreur réseau."); }
    finally { setGenSaving(false); }
  };

  const filtered = useMemo(() => {
    let list = contrats;
    if (filterType)  list = list.filter(c => c.type_contrat === filterType);
    if (filterActif) list = list.filter(c => String(c.actif) === filterActif);
    return list;
  }, [contrats, filterType, filterActif]);

  const totalMensuel = useMemo(() => {
    const COEF = { MENSUEL: 1, BIMESTRIEL: 0.5, TRIMESTRIEL: 1/3, SEMESTRIEL: 1/6, ANNUEL: 1/12 };
    return filtered.filter(c => c.actif).reduce((s, c) => s + parseFloat(c.montant || 0) * (COEF[c.periodicite] || 1), 0);
  }, [filtered]);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-4 pt-5 pb-14">
        <button onClick={() => navigate("/depenses")}
          className="flex items-center gap-1 text-white/70 text-[10px] font-semibold mb-3 hover:text-white transition">
          ← Retour Dépenses
        </button>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Contrats récurrents</p>
            <h1 className="text-white font-bold text-xl leading-tight">Contrats</h1>
          </div>
          <button onClick={openCreate}
            className="w-10 h-10 bg-white/20 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <p className="text-white/70 text-xs">Équivalent mensuel (actifs) :</p>
        <p className="text-3xl font-bold text-white leading-none">
          {fmt(totalMensuel)} <span className="text-base font-normal text-white/50">MAD/mois</span>
        </p>
      </div>

      <div className="px-4 -mt-6 space-y-4 pb-6">

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400 text-slate-600">
              <option value="">Tous les types</option>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterActif} onChange={e => setFilterActif(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400 text-slate-600">
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
              <option value="">Tous</option>
            </select>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5">
            {subForm === "fournisseur" && <SubFormFournisseur onBack={() => setSubForm(null)} onCreated={onFournisseurCreated} />}
            {subForm === "compte"      && <SubFormCompte      onBack={() => setSubForm(null)} onCreated={onCompteCreated} />}
            {subForm === "famille"     && <SubFormFamille     onBack={() => setSubForm(null)} onCreated={onFamilleCreated} />}
            {!subForm && (<>
            <h2 className="text-sm font-bold text-slate-700 mb-4">{editItem ? "Modifier le contrat" : "Nouveau contrat"}</h2>
            <div className="space-y-3">

              {/* Référence */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Référence contrat</label>
                <input className={INPUT} placeholder="Ex : CTR-2026-001"
                  value={form.reference_contrat} onChange={e => setForm(f => ({ ...f, reference_contrat: e.target.value }))} />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                <select className={INPUT} value={form.type_contrat} onChange={e => setForm(f => ({ ...f, type_contrat: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé / Désignation *</label>
                <input className={INPUT} placeholder="Ex : Contrat gardiennage résidence"
                  value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
              </div>

              {/* Fournisseur */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur</label>
                <div className="flex gap-2">
                  <select className={`flex-1 ${INPUT}`} value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
                    <option value="">— Aucun —</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                  </select>
                  <button type="button" onClick={() => setSubForm("fournisseur")}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 text-sm font-bold transition">
                    +
                  </button>
                </div>
              </div>

              {/* Périodicité + Montant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Périodicité *</label>
                  <select className={INPUT} value={form.periodicite} onChange={e => setForm(f => ({ ...f, periodicite: e.target.value }))}>
                    {PERIODICITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant indicatif (MAD)</label>
                  <input type="number" step="0.01" min="0" className={INPUT} placeholder="0.00"
                    value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date début *</label>
                  <input type="date" className={INPUT} value={form.date_debut}
                    onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date fin <span className="font-normal text-slate-400">(optionnel)</span></label>
                  <input type="date" className={INPUT} value={form.date_fin}
                    onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} />
                </div>
              </div>

              {/* Compte + Famille */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
                  <div className="flex gap-1.5">
                    <select className={`flex-1 ${INPUT}`} value={form.compte_comptable} onChange={e => setForm(f => ({ ...f, compte_comptable: e.target.value }))}>
                      <option value="">— Aucun —</option>
                      {comptes.filter(c => c.code !== "000").map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setSubForm("compte")}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 text-sm font-bold transition">
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Famille dépense</label>
                  <div className="flex gap-1.5">
                    <select className={`flex-1 ${INPUT}`} value={form.famille_depense} onChange={e => setForm(f => ({ ...f, famille_depense: e.target.value }))}>
                      <option value="">— Aucune —</option>
                      {familles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                    <button type="button" onClick={() => setSubForm("famille")}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 text-sm font-bold transition">
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea className={INPUT} rows={2} placeholder="Observations…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Actif */}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="actif-chk" checked={form.actif}
                  onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="w-4 h-4 accent-teal-500" />
                <label htmlFor="actif-chk" className="text-sm text-slate-700 cursor-pointer">Contrat actif</label>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
            </>)}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-14 text-center">
            <p className="text-slate-300 text-sm">Aucun contrat</p>
            <button onClick={openCreate} className="mt-3 text-teal-600 text-xs font-semibold hover:underline">+ Ajouter un contrat</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.id} className={`bg-white rounded-2xl shadow-sm border ${c.actif ? "border-slate-100" : "border-slate-100 opacity-60"} overflow-hidden`}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg shrink-0">
                    {TYPE_ICONS[c.type_contrat] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{c.libelle}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{c.type_contrat_label}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.periodicite_label}</span>
                          {c.fournisseur_nom && (
                            <span className="text-[10px] text-slate-400">{c.fournisseur_nom}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.reference_contrat && <span className="text-[10px] font-mono font-semibold text-slate-500">{c.reference_contrat}</span>}
                          <span className="text-[10px] font-mono text-slate-400">{c.date_debut}{c.date_fin ? ` → ${c.date_fin}` : " →"}</span>
                          {!c.actif && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactif</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-slate-800 font-mono">{c.montant != null ? fmt(c.montant) : "—"}</p>
                        <p className="text-[10px] text-slate-400">MAD / {c.periodicite_label?.split(" ")[0].toLowerCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="border-t border-slate-50 px-4 py-2 flex items-center gap-2">
                  {c.actif && (
                    <button onClick={() => openGen(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Générer dépense
                    </button>
                  )}
                  <button onClick={() => openEdit(c)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(c)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition ml-auto">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal génération dépense */}
      {genModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mb-1">Générer une dépense</h3>
            <p className="text-xs text-slate-500 mb-4 truncate">{genModal.libelle}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (MAD) *</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-teal-300 bg-teal-50 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500"
                  placeholder="0.00"
                  value={genForm.montant} onChange={e => setGenForm(f => ({ ...f, montant: e.target.value }))} />
                {genModal.montant && <p className="text-[10px] text-slate-400 mt-0.5">Indicatif contrat : {fmt(genModal.montant)} MAD</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date de la dépense *</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  value={genForm.date_depense} onChange={e => setGenForm(f => ({ ...f, date_depense: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mois imputé</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
                  value={genForm.mois} onChange={e => setGenForm(f => ({ ...f, mois: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {MOIS_OPTS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Réf. facture</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  placeholder="FAC-2026-001"
                  value={genForm.facture_reference} onChange={e => setGenForm(f => ({ ...f, facture_reference: e.target.value }))} />
              </div>
            </div>
            {genMsg && (
              <p className={`text-xs mt-3 font-semibold ${genMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>{genMsg}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setGenModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={handleGen} disabled={genSaving || genMsg.startsWith("✓")}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                {genSaving ? "…" : "Créer la dépense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

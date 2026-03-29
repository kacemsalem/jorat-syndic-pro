import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

const MOIS_OPTS = [
  { v: "JAN", l: "Janvier" },  { v: "FEV", l: "Février" },  { v: "MAR", l: "Mars" },
  { v: "AVR", l: "Avril" },    { v: "MAI", l: "Mai" },       { v: "JUN", l: "Juin" },
  { v: "JUL", l: "Juillet" },  { v: "AOU", l: "Août" },      { v: "SEP", l: "Septembre" },
  { v: "OCT", l: "Octobre" },  { v: "NOV", l: "Novembre" },  { v: "DEC", l: "Décembre" },
];

const EMPTY = { nom: "", categorie: "", compte_comptable: "", fournisseur: "", actif: true };
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400";

// ── Sub-forms (création rapide) ──────────────────────────────────────────────
function SubHeader({ icon, label, onBack }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-1 border-b border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>{icon}</svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold text-yellow-700 uppercase tracking-widest">Création rapide</p>
        <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
      </div>
      <button onClick={onBack}
        className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-yellow-700 transition flex items-center gap-1">
        ← Retour
      </button>
    </div>
  );
}

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
    <div className="space-y-3">
      <SubHeader onBack={onBack} label="Nouveau fournisseur"
        icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Raison sociale <span className="text-red-500">*</span></label>
        <input className={INPUT} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : SARL Atlas, Maroc Elect…" />
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
      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-xl bg-yellow-400 text-slate-900 text-sm font-semibold hover:bg-yellow-500 disabled:opacity-60 transition mt-1">
        {saving ? "Création…" : "Créer le fournisseur"}
      </button>
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
    <div className="space-y-3">
      <SubHeader onBack={onBack} label="Nouveau compte comptable"
        icon={<><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />
      <div className="grid gap-3" style={{gridTemplateColumns:"80px 1fr"}}>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
          <input className={INPUT} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="6140" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
          <input className={INPUT} value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Ex : Entretien et réparations…" />
        </div>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-xl bg-yellow-400 text-slate-900 text-sm font-semibold hover:bg-yellow-500 disabled:opacity-60 transition mt-1">
        {saving ? "Création…" : "Créer le compte"}
      </button>
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
      const res = await fetch("/api/categories-depense/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: nom.trim(), famille: "DIVERS" }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      onCreated(await res.json());
    } catch { setError("Erreur réseau."); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <SubHeader onBack={onBack} label="Nouvelle catégorie"
        icon={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>} />
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nom <span className="text-red-500">*</span></label>
        <input className={INPUT} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Entretien, Charges communes…" />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button onClick={save} disabled={saving}
        className="w-full py-2 rounded-xl bg-yellow-400 text-slate-900 text-sm font-semibold hover:bg-yellow-500 disabled:opacity-60 transition mt-1">
        {saving ? "Création…" : "Créer la catégorie"}
      </button>
    </div>
  );
}

export default function ModelesDepensePage() {
  const navigate = useNavigate();
  const [modeles,      setModeles]      = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [comptes,      setComptes]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [filterFamille, setFilterFamille] = useState("");
  const [filterActif,   setFilterActif]   = useState("true");

  // Sous-formulaire de création rapide
  const [subForm,   setSubForm]   = useState(null); // "fournisseur"|"famille"|"compte"

  const onFournisseurCreated = (c) => { setFournisseurs(p => [...p, c]); setForm(f => ({ ...f, fournisseur: String(c.id) })); setSubForm(null); };
  const onCompteCreated      = (c) => { setComptes(p => [...p, c]); setForm(f => ({ ...f, compte_comptable: String(c.id) })); setSubForm(null); };
  const onCategorieCreated   = (c) => { setCategories(p => [...p, c]); setForm(f => ({ ...f, categorie: String(c.id) })); setSubForm(null); };

  // Génération dépense
  const [genModal,  setGenModal]  = useState(null);
  const [genForm,   setGenForm]   = useState({ montant: "", date_depense: "", mois: "", facture_reference: "" });
  const [genSaving, setGenSaving] = useState(false);
  const [genMsg,    setGenMsg]    = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/modeles-depense/",             { credentials: "include" }).then(r => r.json()),
      fetch("/api/categories-depense/?actif=true",{ credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true",{ credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true",     { credentials: "include" }).then(r => r.json()),
    ]).then(([mod, cat, cpt, fou]) => {
      setModeles(Array.isArray(mod) ? mod : (mod.results ?? []));
      setCategories(Array.isArray(cat) ? cat : (cat.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
      setFournisseurs(Array.isArray(fou) ? fou : (fou.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (m) => {
    setForm({
      nom:              m.nom,
      categorie:        String(m.categorie        || ""),
      compte_comptable: String(m.compte_comptable || ""),
      fournisseur:      String(m.fournisseur      || ""),
      actif:            m.actif,
    });
    setEditItem(m); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setSubForm(null); };

  const handleSave = async () => {
    if (!form.nom.trim())  { setError("Le nom est obligatoire."); return; }
    if (!form.categorie)   { setError("La catégorie est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      nom:              form.nom.trim(),
      categorie:        form.categorie        || null,
      compte_comptable: form.compte_comptable || null,
      fournisseur:      form.fournisseur      || null,
      actif:            form.actif,
    };
    const url    = editItem ? `/api/modeles-depense/${editItem.id}/` : "/api/modeles-depense/";
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

  const handleDelete = async (m) => {
    if (!confirm(`Supprimer le modèle "${m.nom}" ?`)) return;
    await fetch(`/api/modeles-depense/${m.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    load();
  };

  const openGen = (m) => {
    const today   = new Date().toISOString().slice(0, 10);
    const moisAuto = MOIS_OPTS[new Date().getMonth()].v;
    setGenForm({ montant: "", date_depense: today, mois: moisAuto, facture_reference: "" });
    setGenMsg("");
    setGenModal(m);
  };

  const handleGen = async () => {
    if (!genModal) return;
    if (!genForm.montant || parseFloat(genForm.montant) <= 0) { setGenMsg("Le montant est obligatoire."); return; }
    setGenSaving(true); setGenMsg("");
    try {
      const res = await fetch(`/api/modeles-depense/${genModal.id}/generer-depense/`, {
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
    let list = modeles;
    if (filterFamille) list = list.filter(m => String(m.categorie) === filterFamille);
    if (filterActif)   list = list.filter(m => String(m.actif) === filterActif);
    return list;
  }, [modeles, filterFamille, filterActif]);

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 px-4 pt-5 pb-14">
        <button onClick={() => navigate("/depenses")}
          className="flex items-center gap-1 text-slate-700 text-[10px] font-semibold mb-3 hover:text-slate-900 transition">
          ← Retour Dépenses
        </button>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Dépenses</p>
            <h1 className="text-slate-900 font-bold text-xl leading-tight">Modèles de dépenses</h1>
          </div>
          <button onClick={openCreate}
            className="w-10 h-10 bg-white/40 border border-white/40 rounded-full flex items-center justify-center hover:bg-white/60 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="#44403c" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <p className="text-slate-600 text-xs">Templates pré-remplis pour la saisie rapide</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {modeles.filter(m => m.actif).length} <span className="text-base font-normal text-slate-600">modèle(s) actif(s)</span>
        </p>
      </div>

      <div className="px-4 -mt-6 space-y-4 pb-24">

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={filterFamille} onChange={e => setFilterFamille(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-yellow-400 text-slate-600">
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
            </select>
            <select value={filterActif} onChange={e => setFilterActif(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-yellow-400 text-slate-600">
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
              <option value="">Tous</option>
            </select>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
            {subForm === "fournisseur" && <SubFormFournisseur onBack={() => setSubForm(null)} onCreated={onFournisseurCreated} />}
            {subForm === "compte"      && <SubFormCompte      onBack={() => setSubForm(null)} onCreated={onCompteCreated} />}
            {subForm === "famille"     && <SubFormFamille     onBack={() => setSubForm(null)} onCreated={onCategorieCreated} />}
            {!subForm && (<>
            <h2 className="text-sm font-bold text-slate-700 mb-4">
              {editItem ? "Modifier le modèle" : "Nouveau modèle"}
            </h2>
            <div className="space-y-3">

              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                <input autoFocus className={INPUT} placeholder="Ex : Facture électricité"
                  value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie *</label>
                <div className="flex gap-2">
                  <select className={`flex-1 ${INPUT}`} value={form.categorie}
                    onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    <option value="">— Choisir —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <button type="button" onClick={() => setSubForm("famille")}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 text-sm font-bold transition">
                    +
                  </button>
                </div>
              </div>

              {/* Compte comptable */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
                <div className="flex gap-2">
                  <select className={`flex-1 ${INPUT}`} value={form.compte_comptable}
                    onChange={e => setForm(f => ({ ...f, compte_comptable: e.target.value }))}>
                    <option value="">— Aucun —</option>
                    {comptes.filter(c => c.code !== "000").map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setSubForm("compte")}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 text-sm font-bold transition">
                    +
                  </button>
                </div>
              </div>

              {/* Fournisseur */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur par défaut</label>
                <div className="flex gap-2">
                  <select className={`flex-1 ${INPUT}`} value={form.fournisseur}
                    onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
                    <option value="">— Aucun —</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                  </select>
                  <button type="button" onClick={() => setSubForm("fournisseur")}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border bg-slate-100 border-slate-200 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 text-sm font-bold transition">
                    +
                  </button>
                </div>
              </div>

              {/* Actif */}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="actif-chk" checked={form.actif}
                  onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="w-4 h-4 accent-yellow-500" />
                <label htmlFor="actif-chk" className="text-sm text-slate-700 cursor-pointer">Modèle actif</label>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-60">
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
            </>)}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-14 text-center">
            <p className="text-slate-300 text-sm">Aucun modèle défini</p>
            <button onClick={openCreate} className="mt-3 text-yellow-700 text-xs font-semibold hover:underline">
              + Ajouter un modèle
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <div key={m.id}
                className={`bg-white rounded-2xl shadow-sm border ${m.actif ? "border-slate-100" : "border-slate-100 opacity-60"} overflow-hidden`}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <path d="M9 12h6M9 16h6M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{m.nom}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {m.categorie_nom && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-yellow-700">
                          {m.categorie_nom}
                        </span>
                      )}
                      {m.compte_code && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {m.compte_code}
                        </span>
                      )}
                      {m.fournisseur_nom && (
                        <span className="text-[10px] text-slate-400">{m.fournisseur_nom}</span>
                      )}
                      {!m.actif && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactif</span>
                      )}
                    </div>
                    {m.compte_libelle && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{m.compte_libelle}</p>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="border-t border-slate-50 px-4 py-2 flex items-center gap-2">
                  {m.actif && (
                    <button onClick={() => openGen(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Générer dépense
                    </button>
                  )}
                  <button onClick={() => openEdit(m)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(m)}
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
            <p className="text-xs text-slate-500 mb-4 truncate">{genModal.nom}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (MAD) *</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-yellow-300 bg-yellow-50 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-yellow-500"
                  placeholder="0.00"
                  value={genForm.montant} onChange={e => setGenForm(f => ({ ...f, montant: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date de la dépense *</label>
                <input type="date"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                  value={genForm.date_depense} onChange={e => setGenForm(f => ({ ...f, date_depense: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mois imputé</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 bg-white"
                  value={genForm.mois} onChange={e => setGenForm(f => ({ ...f, mois: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {MOIS_OPTS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Réf. facture</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                  placeholder="FAC-2026-001"
                  value={genForm.facture_reference} onChange={e => setGenForm(f => ({ ...f, facture_reference: e.target.value }))} />
              </div>
            </div>
            {genMsg && (
              <p className={`text-xs mt-3 font-semibold ${genMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>
                {genMsg}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setGenModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={handleGen} disabled={genSaving || genMsg.startsWith("✓")}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-60">
                {genSaving ? "…" : "Créer la dépense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

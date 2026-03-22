import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const FAMILLE_OPTIONS = [
  { value: "PERSONNEL",      label: "Personnel" },
  { value: "SECURITE",       label: "Sécurité" },
  { value: "NETTOYAGE",      label: "Nettoyage" },
  { value: "JARDINAGE",      label: "Jardinage" },
  { value: "ENERGIE",        label: "Énergie" },
  { value: "MAINTENANCE",    label: "Maintenance" },
  { value: "TRAVAUX",        label: "Travaux" },
  { value: "ADMIN",          label: "Administratif" },
  { value: "EQUIPEMENT",     label: "Équipement" },
  { value: "ANIMATION",      label: "Animation" },
  { value: "ASSURANCE_TAXE", label: "Assurance & Taxes" },
  { value: "DIVERS",         label: "Divers" },
];

const TYPE_OPTIONS = [
  { value: "SYSTEMATIQUE", label: "Systématique" },
  { value: "EVENTUELLE",   label: "Éventuelle" },
];

const NATURE_OPTIONS = [
  { value: "FONCTIONNEMENT", label: "Fonctionnement" },
  { value: "INVESTISSEMENT",  label: "Investissement" },
];

const FAMILLE_COLORS = {
  PERSONNEL:      "bg-blue-100 text-blue-700",
  SECURITE:       "bg-red-100 text-red-700",
  NETTOYAGE:      "bg-emerald-100 text-emerald-700",
  JARDINAGE:      "bg-green-100 text-green-700",
  ENERGIE:        "bg-yellow-100 text-yellow-700",
  MAINTENANCE:    "bg-indigo-100 text-indigo-700",
  TRAVAUX:        "bg-orange-100 text-orange-700",
  ADMIN:          "bg-slate-100 text-slate-600",
  EQUIPEMENT:     "bg-violet-100 text-violet-700",
  ANIMATION:      "bg-pink-100 text-pink-700",
  ASSURANCE_TAXE: "bg-sky-100 text-sky-700",
  DIVERS:         "bg-slate-100 text-slate-500",
};

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition bg-white";

const EMPTY_FORM = { nom: "", famille: "DIVERS", type_depense: "EVENTUELLE", nature: "FONCTIONNEMENT", compte_defaut: "", actif: true };

export default function CategoriesDepensePage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [comptes,    setComptes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [info,       setInfo]       = useState("");
  const [editItem,   setEditItem]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterFamille, setFilterFamille] = useState("");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/categories-depense/",         { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([cat, cpt]) => {
      setCategories(Array.isArray(cat) ? cat : (cat.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
      setLoading(false);
    }).catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditItem(null); setError(""); setInfo(""); };

  const selectItem = (cat) => {
    setEditItem(cat);
    setForm({ nom: cat.nom, famille: cat.famille, type_depense: cat.type_depense, nature: cat.nature, compte_defaut: cat.compte_defaut || "", actif: cat.actif });
    setError(""); setInfo("");
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    const url    = editItem ? `/api/categories-depense/${editItem.id}/` : "/api/categories-depense/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...form, compte_defaut: form.compte_defaut || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la sauvegarde.");
        return;
      }
      setInfo(editItem ? "Catégorie modifiée ✅" : "Catégorie ajoutée ✅");
      resetForm();
      fetchAll();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie "${cat.nom}" ?`)) return;
    await fetch(`/api/categories-depense/${cat.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (editItem?.id === cat.id) resetForm();
    fetchAll();
  };

  const filtered = categories.filter(c => {
    const matchFamille = !filterFamille || c.famille === filterFamille;
    const matchSearch  = !search ||
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.famille_label?.toLowerCase().includes(search.toLowerCase());
    return matchFamille && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/depenses", { state: { openForm: true } })}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Dépenses
          </button>
          <span className="text-slate-200">|</span>
          <button onClick={() => navigate("/modeles-depense", { state: { openForm: true } })}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Modèles dépenses
          </button>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Catégories de dépenses</h1>
        <p className="text-xs text-slate-400 mt-0.5">{categories.length} catégorie{categories.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editItem ? "✏️ Modifier la catégorie" : "➕ Nouvelle catégorie"}
            </h2>
            {editItem && (
              <button onClick={resetForm} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition">
                + Nouveau
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">⚠️ {error}</div>
          )}
          {info && (
            <div className="text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">{info}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nom *</label>
            <input className={inputCls} value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Ex: Gardiennage, Eau, EDF…" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Famille</label>
            <select className={inputCls} value={form.famille}
              onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}>
              {FAMILLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
              <select className={inputCls} value={form.type_depense}
                onChange={e => setForm(f => ({ ...f, type_depense: e.target.value }))}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nature</label>
              <select className={inputCls} value={form.nature}
                onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}>
                {NATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Compte comptable par défaut <span className="normal-case font-normal text-slate-400">(optionnel)</span>
            </label>
            <select className={inputCls} value={form.compte_defaut}
              onChange={e => setForm(f => ({ ...f, compte_defaut: e.target.value }))}>
              <option value="">— Aucun —</option>
              {comptes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif_cat" checked={form.actif}
              onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
              className="w-4 h-4 accent-amber-500" />
            <label htmlFor="actif_cat" className="text-sm text-slate-700">Actif</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
              {saving ? "Enregistrement…" : editItem ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </div>

        {/* ── Liste ── */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liste</h2>
            <input type="search" placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-200 w-40" />
          </div>

          {/* Filtre famille */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterFamille("")}
              className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border transition ${!filterFamille ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}>
              Toutes
            </button>
            {FAMILLE_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setFilterFamille(f.value === filterFamille ? "" : f.value)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border transition ${filterFamille === f.value ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-8">Chargement…</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  {search || filterFamille ? "Aucun résultat." : "Aucune catégorie enregistrée."}
                </p>
              ) : filtered.map(cat => (
                <div key={cat.id} onClick={() => selectItem(cat)}
                  className={`rounded-xl border px-4 py-3 cursor-pointer transition flex items-center justify-between ${
                    editItem?.id === cat.id
                      ? "bg-amber-50 border-amber-300"
                      : "hover:bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                      {cat.nom?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">{cat.nom}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${FAMILLE_COLORS[cat.famille] || "bg-slate-100 text-slate-500"}`}>
                          {cat.famille_label}
                        </span>
                        <span className="text-[10px] text-slate-400">{cat.type_depense_label}</span>
                        {!cat.actif && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">Inactif</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(cat); }}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

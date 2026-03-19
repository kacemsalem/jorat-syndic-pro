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
  PERSONNEL:      { bg: "#dbeafe", text: "#1d4ed8" },
  SECURITE:       { bg: "#fee2e2", text: "#dc2626" },
  NETTOYAGE:      { bg: "#d1fae5", text: "#059669" },
  JARDINAGE:      { bg: "#dcfce7", text: "#16a34a" },
  ENERGIE:        { bg: "#fef3c7", text: "#d97706" },
  MAINTENANCE:    { bg: "#e0e7ff", text: "#4338ca" },
  TRAVAUX:        { bg: "#ffedd5", text: "#ea580c" },
  ADMIN:          { bg: "#f3f4f6", text: "#374151" },
  EQUIPEMENT:     { bg: "#ede9fe", text: "#7c3aed" },
  ANIMATION:      { bg: "#fce7f3", text: "#db2777" },
  ASSURANCE_TAXE: { bg: "#e0f2fe", text: "#0369a1" },
  DIVERS:         { bg: "#f1f5f9", text: "#64748b" },
};

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const EMPTY_FORM = { nom: "", famille: "DIVERS", type_depense: "EVENTUELLE", nature: "FONCTIONNEMENT", compte_defaut: "", actif: true };

export default function CategoriesDepensePage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [comptes,    setComptes]    = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [filterFamille, setFilterFamille] = useState("");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/categories-depense/", { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([cat, cpt]) => {
      setCategories(Array.isArray(cat) ? cat : (cat.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
      setLoading(false);
    }).catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  const fetchCategories = fetchAll; // keep alias for existing calls

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); };
  const openEdit   = (cat) => {
    setForm({ nom: cat.nom, famille: cat.famille, type_depense: cat.type_depense, nature: cat.nature, compte_defaut: cat.compte_defaut || "", actif: cat.actif });
    setEditItem(cat); setShowForm(true);
  };
  const closeForm  = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
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
      closeForm();
      fetchCategories();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie "${cat.nom}" ?`)) return;
    await fetch(`/api/categories-depense/${cat.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchCategories();
  };

  const filtered = filterFamille ? categories.filter(c => c.famille === filterFamille) : categories;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Catégories de dépenses</h1>
            <p className="text-sm text-slate-500 mt-1">{categories.length} catégorie{categories.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow"
        >
          + Nouvelle catégorie
        </button>
      </div>

      {/* Filtre famille */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterFamille("")}
          className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition ${!filterFamille ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"}`}
        >
          Toutes
        </button>
        {FAMILLE_OPTIONS.map(f => (
          <button key={f.value}
            onClick={() => setFilterFamille(f.value === filterFamille ? "" : f.value)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition ${filterFamille === f.value ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Famille</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nature</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Aucune catégorie</td></tr>
              ) : filtered.map(cat => {
                const col = FAMILLE_COLORS[cat.famille] || FAMILLE_COLORS.DIVERS;
                return (
                  <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{cat.nom}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: col.bg, color: col.text }}>
                        {cat.famille_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cat.type_depense_label}</td>
                    <td className="px-4 py-3 text-slate-600">{cat.nature_label}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cat.actif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {cat.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(cat)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                      <button onClick={() => handleDelete(cat)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex: Gardiennage, Eau, EDF…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Famille</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.famille}
                  onChange={e => setForm(f => ({ ...f, famille: e.target.value }))}
                >
                  {FAMILLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.type_depense}
                    onChange={e => setForm(f => ({ ...f, type_depense: e.target.value }))}
                  >
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nature</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.nature}
                    onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}
                  >
                    {NATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Compte comptable par défaut
                  <span className="ml-1 text-slate-400 font-normal">(optionnel)</span>
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.compte_defaut}
                  onChange={e => setForm(f => ({ ...f, compte_defaut: e.target.value }))}
                >
                  <option value="">— Aucun —</option>
                  {comptes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                <label htmlFor="actif" className="text-sm text-slate-700">Actif</label>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

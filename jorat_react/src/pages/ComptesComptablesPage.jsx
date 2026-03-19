import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPE_OPTIONS = [
  { value: "CHARGE",     label: "Charge" },
  { value: "PRODUIT",    label: "Produit" },
  { value: "TRESORERIE", label: "Trésorerie" },
];

const TYPE_COLORS = {
  CHARGE:     { bg: "#fee2e2", text: "#dc2626" },
  PRODUIT:    { bg: "#d1fae5", text: "#059669" },
  TRESORERIE: { bg: "#dbeafe", text: "#1d4ed8" },
};

const EMPTY_FORM = { code: "", libelle: "", type_compte: "CHARGE", actif: true };

export default function ComptesComptablesPage() {
  const navigate = useNavigate();

  const [comptes,   setComptes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");

  const fetchComptes = () => {
    setLoading(true);
    fetch("/api/comptes-comptables/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setComptes(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchComptes(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (c) => { setForm({ code: c.code, libelle: c.libelle, type_compte: c.type_compte || "CHARGE", actif: c.actif }); setEditItem(c); setError(""); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.code.trim())   { setError("Le code est obligatoire."); return; }
    if (!form.libelle.trim()) { setError("Le libellé est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/comptes-comptables/${editItem.id}/` : "/api/comptes-comptables/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la sauvegarde.");
        return;
      }
      closeForm();
      fetchComptes();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Supprimer le compte "${c.code} - ${c.libelle}" ?`)) return;
    const res = await fetch(`/api/comptes-comptables/${c.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = Object.values(data).flat().join(" ") || "Impossible de supprimer ce compte (utilisé dans des dépenses ou recettes).";
      setError(msg);
      return;
    }
    fetchComptes();
  };

  const filtered = search
    ? comptes.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.libelle.toLowerCase().includes(search.toLowerCase())
      )
    : comptes;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Plan comptable</h1>
            <p className="text-sm text-slate-500 mt-1">{comptes.length} compte{comptes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow"
        >
          + Nouveau compte
        </button>
      </div>

      {/* Erreur globale */}
      {error && !showForm && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-4">
        <input
          className="w-full max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
          placeholder="Rechercher par code ou libellé…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Libellé</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Aucun compte</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700">{c.code}</td>
                  <td className="px-4 py-3 text-slate-800">{c.libelle}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const tc = TYPE_COLORS[c.type_compte] || { bg: "#f1f5f9", text: "#64748b" };
                      const label = TYPE_OPTIONS.find(o => o.value === c.type_compte)?.label ?? c.type_compte;
                      return (
                        <span style={{ background: tc.bg, color: tc.text }} className="px-2 py-0.5 rounded-full text-xs font-semibold">
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.actif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                    <button onClick={() => handleDelete(c)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier le compte" : "Nouveau compte"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-400"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="Ex: 615, 626, 702…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.libelle}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex: Entretien et réparations, Gardiennage…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.type_compte}
                  onChange={e => setForm(f => ({ ...f, type_compte: e.target.value }))}
                >
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

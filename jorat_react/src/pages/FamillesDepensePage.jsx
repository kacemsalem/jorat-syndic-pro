import { useState, useEffect } from "react";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const EMPTY = { nom: "" };

export default function FamillesDepensePage() {
  const [familles,  setFamilles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/familles-depense/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setFamilles(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (f) => { setForm({ nom: f.nom }); setEditItem(f); setError(""); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditItem(null); };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/familles-depense/${editItem.id}/` : "/api/familles-depense/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
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

  const handleDelete = async (f) => {
    if (!confirm(`Supprimer la famille "${f.nom}" ?`)) return;
    await fetch(`/api/familles-depense/${f.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Familles de dépenses</h1>
          <p className="text-xs text-slate-400 mt-0.5">Classification des dépenses par grande famille</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow"
        >
          + Nouvelle famille
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">{editItem ? "Modifier la famille" : "Nouvelle famille"}</h2>
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              placeholder="Nom de la famille *"
              value={form.nom}
              onChange={e => setForm({ nom: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
              {saving ? "…" : "Enregistrer"}
            </button>
            <button onClick={closeForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Chargement…</div>
        ) : familles.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Aucune famille définie.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Famille</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {familles.map((f, i) => (
                <tr key={f.id} className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{f.nom}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(f)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                    <button onClick={() => handleDelete(f)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white";

export default function FamillesDepensePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [familles,  setFamilles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editItem,  setEditItem]  = useState(null);
  const [nom,       setNom]       = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/familles-depense/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setFamilles(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (location.state?.openForm) window.history.replaceState({}, "");
  }, []);

  const reset   = () => { setEditItem(null); setNom(""); setError(""); };
  const select  = (f) => { setEditItem(f); setNom(f.nom); setError(""); };

  const handleSave = async () => {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/familles-depense/${editItem.id}/` : "/api/familles-depense/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ nom: nom.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur.");
        return;
      }
      reset(); load();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Supprimer la catégorie "${f.nom}" ?`)) return;
    await fetch(`/api/familles-depense/${f.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (editItem?.id === f.id) reset();
    load();
  };

  const filtered = familles.filter(f =>
    !search || f.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/depenses", { state: { openForm: true } })}
            className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Dépenses
          </button>
          <span className="text-slate-200">|</span>
          <button onClick={() => navigate("/modeles-depense", { state: { openForm: true } })}
            className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Modèles dépenses
          </button>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Catégories de dépenses</h1>
        <p className="text-xs text-slate-400 mt-0.5">{familles.length} catégorie{familles.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editItem ? "✏️ Modifier" : "➕ Nouvelle catégorie"}
            </h2>
            {editItem && (
              <button onClick={reset}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition">
                + Nouveau
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">⚠️ {error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Nom de la catégorie *
            </label>
            <input autoFocus className={INPUT}
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Ex : Énergie, Paiement personnel, Produit entretien…" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={reset}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
              {saving ? "…" : editItem ? "Modifier" : "Ajouter"}
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

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-8">Chargement…</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  {search ? "Aucun résultat." : "Aucune catégorie enregistrée."}
                </p>
              ) : filtered.map(f => (
                <div key={f.id} onClick={() => select(f)}
                  className={`rounded-xl border px-4 py-3 cursor-pointer transition flex items-center justify-between ${
                    editItem?.id === f.id
                      ? "bg-amber-50 border-amber-300"
                      : "hover:bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600 shrink-0">
                      {f.nom?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{f.nom}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(f); }}
                    className="text-slate-400 hover:text-red-500 transition text-xs px-2 py-1 rounded hover:bg-red-50">
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

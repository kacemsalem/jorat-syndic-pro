import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API = "/api/groupes/";

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white";

export default function GroupesPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const residenceId    = searchParams.get("residence");

  const [groupes, setGroupes]   = useState([]);
  const [nom, setNom]           = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");
  const [search, setSearch]     = useState("");

  // ── Chargement ────────────────────────────────────────────
  const load = async () => {
    if (!residenceId) return;
    setLoading(true);
    const res  = await fetch(`${API}?residence=${residenceId}`);
    const data = await res.json();
    setGroupes(data.results ?? data);
    setLoading(false);
  };

  useEffect(() => { if (residenceId) load(); }, [residenceId]);

  // ── Save ─────────────────────────────────────────────────
  const save = async () => {
    if (!nom.trim()) { setError("Le nom du groupe est obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    try {
      if (editing) {
        await fetch(`${API}${editing.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom_groupe: nom, description }),
        });
        setInfo("Groupe modifié ✅");
      } else {
        await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom_groupe: nom, description, residence: residenceId }),
        });
        setInfo("Groupe ajouté ✅");
      }
      reset();
      load();
    } catch {
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const remove = async (g) => {
    if (!window.confirm(`Supprimer le groupe "${g.nom_groupe}" ?`)) return;
    await fetch(`${API}${g.id}/`, { method: "DELETE" });
    if (editing?.id === g.id) reset();
    load();
  };

  const reset = () => {
    setNom(""); setDescription(""); setEditing(null);
    setError(""); setInfo("");
  };

  const startEdit = (g) => {
    setEditing(g);
    setNom(g.nom_groupe ?? "");
    setDescription(g.description ?? "");
    setError(""); setInfo("");
  };

  // ── Filtrage ─────────────────────────────────────────────
  const groupesFiltres = groupes.filter((g) =>
    g.nom_groupe.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Groupes</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {groupes.length} groupe{groupes.length > 1 ? "s" : ""} dans cette résidence
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editing ? "✏️ Modifier le groupe" : "➕ Nouveau groupe"}
            </h2>
            {editing && (
              <button
                onClick={reset}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition"
              >
                + Nouveau
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              ⚠️ {error}
            </div>
          )}
          {info && (
            <div className="text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">
              {info}
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Nom du groupe <span className="text-red-400">*</span>
            </label>
            <input
              className={inputCls}
              placeholder="ex : Bâtiment A, Tour 1…"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Informations complémentaires…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            {editing && (
              <button
                onClick={reset}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                editing
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
            </button>
          </div>

        </div>

        {/* ── Liste ── */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Liste
            </h2>
            <input
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-36"
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center text-slate-400 text-sm py-8">Chargement…</p>
            ) : groupesFiltres.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                {search ? "Aucun résultat." : "Aucun groupe enregistré."}
              </p>
            ) : (
              groupesFiltres.map((g) => (
                <div
                  key={g.id}
                  className={`rounded-xl border px-4 py-3 transition flex items-center justify-between ${
                    editing?.id === g.id
                      ? "bg-indigo-50 border-indigo-300"
                      : "hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {g.nom_groupe?.[0]?.toUpperCase() ?? "G"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{g.nom_groupe}</p>
                      {g.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{g.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => startEdit(g)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-200 text-xs text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remove(g)}
                      className="px-2.5 py-1 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const EMPTY_FORM = { nom_societe: "", genre: "", nom: "", prenom: "", gsm: "", telephone: "", email: "", actif: true };

export default function FournisseursPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");

  const fetchFournisseurs = () => {
    setLoading(true);
    fetch("/api/fournisseurs/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setFournisseurs(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (f) => {
    setForm({ nom_societe: f.nom_societe || "", genre: f.genre || "", nom: f.nom, prenom: f.prenom || "", gsm: f.gsm || "", telephone: f.telephone || "", email: f.email || "", actif: f.actif });
    setEditItem(f); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/fournisseurs/${editItem.id}/` : "/api/fournisseurs/";
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
      fetchFournisseurs();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer "${f.nom_complet || f.nom}" ?`)) return;
    await fetch(`/api/fournisseurs/${f.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchFournisseurs();
  };

  const filtered = search
    ? fournisseurs.filter(f =>
        (f.nom_complet || f.nom).toLowerCase().includes(search.toLowerCase()) ||
        f.email?.toLowerCase().includes(search.toLowerCase()) ||
        f.gsm?.includes(search) ||
        f.telephone?.includes(search)
      )
    : fournisseurs;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Fournisseurs</h1>
            <p className="text-sm text-slate-500 mt-1">{fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow"
        >
          + Nouveau fournisseur
        </button>
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          className="w-full max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
          placeholder="Rechercher…"
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Société</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">GSM</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucun fournisseur</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.nom_societe || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[f.genre === "M" ? "M." : f.genre, f.nom, f.prenom].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.gsm || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{f.telephone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{f.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f.actif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(f)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                    <button onClick={() => handleDelete(f)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </h2>
            <div className="space-y-4">

              {/* Nom société */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom de la société</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.nom_societe}
                  onChange={e => setForm(f => ({ ...f, nom_societe: e.target.value }))}
                  placeholder="Raison sociale / nom entreprise"
                />
              </div>

              {/* Genre + Nom + Prénom contact */}
              <div className="grid grid-cols-[90px_1fr_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Genre</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.genre}
                    onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                  >
                    <option value="">—</option>
                    <option value="M">M.</option>
                    <option value="Mme">Mme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nom contact *</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom du contact"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom contact</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    placeholder="Prénom"
                  />
                </div>
              </div>

              {/* GSM + Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GSM</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.gsm}
                    onChange={e => setForm(f => ({ ...f, gsm: e.target.value }))}
                    placeholder="+212 6xx xxx xxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Téléphone fixe</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.telephone}
                    onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    placeholder="+212 5xx xxx xxx"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@fournisseur.ma"
                />
              </div>

              {/* Actif */}
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

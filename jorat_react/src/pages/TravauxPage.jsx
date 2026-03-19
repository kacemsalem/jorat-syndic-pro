import { useState, useEffect, useMemo } from "react";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const STATUT_OPTIONS = [
  { value: "PLANIFIE", label: "Planifié",  color: "bg-blue-100 text-blue-700" },
  { value: "EN_COURS", label: "En cours",  color: "bg-amber-100 text-amber-700" },
  { value: "TERMINE",  label: "Terminé",   color: "bg-green-100 text-green-700" },
  { value: "ANNULE",   label: "Annulé",    color: "bg-red-100 text-red-700" },
];

const EMPTY_FORM = {
  date_travaux: new Date().toISOString().slice(0, 10),
  nature:       "",
  description:  "",
  fournisseur:  "",
  statut:       "PLANIFIE",
  commentaire:  "",
};

function statutBadge(statut) {
  const opt = STATUT_OPTIONS.find(o => o.value === statut);
  if (!opt) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${opt.color}`}>
      {opt.label}
    </span>
  );
}

export default function TravauxPage() {
  const [travaux,      setTravaux]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [showForm,     setShowForm]     = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/travaux/",      { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/", { credentials: "include" }).then(r => r.json()),
    ]).then(([t, f]) => {
      setTravaux(Array.isArray(t) ? t : (t.results ?? []));
      setFournisseurs(Array.isArray(f) ? f : (f.results ?? []));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!filterStatut) return travaux;
    return travaux.filter(t => t.statut === filterStatut);
  }, [travaux, filterStatut]);

  const handleEdit = (t) => {
    setForm({
      date_travaux: t.date_travaux,
      nature:       t.nature,
      description:  t.description || "",
      fournisseur:  t.fournisseur ?? "",
      statut:       t.statut,
      commentaire:  t.commentaire || "",
    });
    setEditId(t.id);
    setError("");
    setShowForm(true);
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError("");
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nature.trim()) { setError("La nature des travaux est obligatoire."); return; }
    if (!form.date_travaux)  { setError("La date est obligatoire."); return; }
    setSaving(true); setError("");
    const body = {
      date_travaux: form.date_travaux,
      nature:       form.nature.trim(),
      description:  form.description.trim(),
      fournisseur:  form.fournisseur || null,
      statut:       form.statut,
      commentaire:  form.commentaire.trim(),
    };
    const url    = editId ? `/api/travaux/${editId}/` : "/api/travaux/";
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(Object.values(data).flat().join(" "));
        return;
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      load();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette réalisation ?")) return;
    await fetch(`/api/travaux/${id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Événements</h1>
          <p className="text-sm text-slate-500 mt-1">Suivi des travaux et événements de la résidence</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition shadow"
        >
          + Nouvel événement
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
            {editId ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" value={form.date_travaux}
                  onChange={e => setForm(f => ({ ...f, date_travaux: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nature *</label>
                <input type="text" value={form.nature} placeholder="ex: Ravalement façade, plomberie…"
                  onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea value={form.description} rows={2} placeholder="Détails complémentaires…"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Statut</label>
                <select value={form.statut}
                  onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {STATUT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prestataire</label>
                <select value={form.fournisseur}
                  onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">— Aucun —</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nom_societe || `${f.nom} ${f.prenom}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire</label>
              <textarea value={form.commentaire} rows={2} placeholder="Observations…"
                onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition">
                {saving ? "Enregistrement…" : (editId ? "Modifier" : "Enregistrer")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Tous les statuts</option>
          {STATUT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} réalisation{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
          Aucune réalisation enregistrée.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nature</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Prestataire</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{t.date_travaux}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{t.nature}</div>
                    {t.description && (
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{statutBadge(t.statut)}</td>
                  <td className="px-4 py-3 text-slate-500">{t.fournisseur_nom || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleEdit(t)}
                        className="px-3 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        className="px-3 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 text-red-500 font-medium transition">
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

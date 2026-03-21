import { useState, useEffect, useMemo, useRef } from "react";

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
  const [openMenu,     setOpenMenu]     = useState(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

      {/* Formulaire modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
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
              <div className="flex justify-end gap-3 pt-2">
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
        </div>
      )}

      {/* Filtres */}
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

      {/* Kanban */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune réalisation enregistrée.</div>
      ) : (
        <div ref={menuRef} className="flex flex-col gap-3">
          {filtered.map(t => {
            const opt = STATUT_OPTIONS.find(o => o.value === t.statut);
            return (
              <div key={t.id} className="bg-teal-50 rounded-xl border border-teal-200 shadow-sm px-4 py-3 flex flex-col gap-2 relative">
                {/* Top: date + statut + menu */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{t.date_travaux}</span>
                    {opt && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${opt.color}`}>
                        {opt.label}
                      </span>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <button onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                      className="p-0.5 rounded hover:bg-teal-100 text-slate-300 hover:text-slate-600 transition">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                      </svg>
                    </button>
                    {openMenu === t.id && (
                      <div className="absolute right-0 top-5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                        <button onClick={() => { handleEdit(t); setOpenMenu(null); }}
                          className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                        <button onClick={() => { handleDelete(t.id); setOpenMenu(null); }}
                          className="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nature */}
                <div className="font-semibold text-slate-800 text-[13px] leading-tight truncate">{t.nature}</div>

                {/* Description + prestataire */}
                {t.description && (
                  <div className="text-[10px] text-slate-500 line-clamp-1">{t.description}</div>
                )}
                {t.fournisseur_nom && (
                  <div className="text-[10px] text-slate-400 truncate">{t.fournisseur_nom}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

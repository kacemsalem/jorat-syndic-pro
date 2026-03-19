import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPES   = [{ value: "ORDINAIRE", label: "Ordinaire" }, { value: "EXTRAORDINAIRE", label: "Extraordinaire" }];
const STATUTS = [{ value: "PLANIFIEE", label: "Planifiée" }, { value: "TENUE", label: "Tenue" }, { value: "ANNULEE", label: "Annulée" }];

const STATUT_COLORS = {
  PLANIFIEE: "bg-blue-100 text-blue-700",
  TENUE:     "bg-green-100 text-green-700",
  ANNULEE:   "bg-red-100 text-red-700",
};

const EMPTY = { date_ag: "", type_ag: "ORDINAIRE", statut: "PLANIFIEE", ordre_du_jour: "" };

export default function AssembleesPage() {
  const navigate = useNavigate();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [pvFile,   setPvFile]   = useState(null);
  const [saving,   setSaving]   = useState(false);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/assemblees/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => { setForm(EMPTY); setPvFile(null); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = item => {
    setForm({ date_ag: item.date_ag, type_ag: item.type_ag, statut: item.statut, ordre_du_jour: item.ordre_du_jour || "" });
    setPvFile(null); setEditItem(item); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.date_ag) { setError("La date est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/assemblees/${editItem.id}/` : "/api/assemblees/";
    const method = editItem ? "PATCH" : "POST";
    try {
      let res;
      if (pvFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("pv_document", pvFile);
        res = await fetch(url, { method, credentials: "include", headers: { "X-CSRFToken": getCsrf() }, body: fd });
      } else {
        res = await fetch(url, {
          method, credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la sauvegarde.");
        return;
      }
      closeForm(); fetchItems();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async item => {
    if (!window.confirm(`Supprimer cette assemblée générale ?`)) return;
    await fetch(`/api/assemblees/${item.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchItems();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Assemblées Générales</h1>
            <p className="text-sm text-slate-500 mt-1">{items.length} assemblée{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow">
          + Nouvelle AG
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Résolutions</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">PV</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Aucune assemblée générale</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.date_ag}</td>
                  <td className="px-4 py-3 text-slate-600">{item.type_ag_label}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT_COLORS[item.statut] || "bg-slate-100 text-slate-500"}`}>
                      {item.statut_label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/gouvernance/resolutions?ag_id=${item.id}`)}
                      className="text-xs text-indigo-600 hover:underline font-semibold">
                      {item.nb_resolutions ?? 0} résolution{(item.nb_resolutions ?? 0) !== 1 ? "s" : ""} →
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {item.pv_document
                      ? <a href={item.pv_document} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Voir PV</a>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(item)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                    <button onClick={() => handleDelete(item)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier l'assemblée" : "Nouvelle assemblée générale"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.date_ag} onChange={e => setForm(f => ({ ...f, date_ag: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.type_ag} onChange={e => setForm(f => ({ ...f, type_ag: e.target.value }))}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Statut</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ordre du jour</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  placeholder="Points à l'ordre du jour…"
                  value={form.ordre_du_jour} onChange={e => setForm(f => ({ ...f, ordre_du_jour: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">PV (document)</label>
                <input type="file" accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-slate-600"
                  onChange={e => setPvFile(e.target.files[0] || null)} />
                {editItem?.pv_document && !pvFile && (
                  <p className="text-xs text-slate-400 mt-1">PV existant conservé si aucun fichier sélectionné.</p>
                )}
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

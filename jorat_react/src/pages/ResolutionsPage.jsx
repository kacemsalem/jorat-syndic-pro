import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const RESULTATS = [
  { value: "ADOPTEE",  label: "Adoptée" },
  { value: "REJETEE",  label: "Rejetée" },
  { value: "AJOURNEE", label: "Ajournée" },
];

const RESULTAT_COLORS = {
  ADOPTEE:  "bg-green-100 text-green-700",
  REJETEE:  "bg-red-100 text-red-700",
  AJOURNEE: "bg-yellow-100 text-yellow-700",
};

const EMPTY = { assemblee_generale: "", numero: "", titre: "", description: "", voix_pour: 0, voix_contre: 0, abstention: 0, resultat: "ADOPTEE" };

export default function ResolutionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agIdParam = searchParams.get("ag_id") || "";

  const [items,     setItems]     = useState([]);
  const [assemblees, setAssemblees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState({ ...EMPTY, assemblee_generale: agIdParam });
  const [saving,    setSaving]    = useState(false);
  const [filterAg,  setFilterAg]  = useState(agIdParam);

  const fetchItems = (ag = filterAg) => {
    setLoading(true);
    const qs = ag ? `?ag_id=${ag}` : "";
    fetch(`/api/resolutions/${qs}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => {
    fetchItems();
    fetch("/api/assemblees/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setAssemblees(Array.isArray(d) ? d : (d.results ?? [])));
  }, []);

  const openCreate = () => { setForm({ ...EMPTY, assemblee_generale: filterAg || "" }); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = item => {
    setForm({ assemblee_generale: item.assemblee_generale, numero: item.numero, titre: item.titre, description: item.description || "", voix_pour: item.voix_pour, voix_contre: item.voix_contre, abstention: item.abstention, resultat: item.resultat });
    setEditItem(item); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.assemblee_generale || !form.titre || !form.numero) { setError("AG, numéro et titre sont obligatoires."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/resolutions/${editItem.id}/` : "/api/resolutions/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...form, numero: Number(form.numero), voix_pour: Number(form.voix_pour), voix_contre: Number(form.voix_contre), abstention: Number(form.abstention) }),
      });
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
    if (!window.confirm(`Supprimer la résolution "${item.titre}" ?`)) return;
    await fetch(`/api/resolutions/${item.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchItems();
  };

  const handleFilterChange = ag => {
    setFilterAg(ag);
    fetchItems(ag);
  };

  const int = f => <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
    value={form[f]} onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))} />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Résolutions</h1>
            <p className="text-sm text-slate-500 mt-1">{items.length} résolution{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow">
          + Nouvelle résolution
        </button>
      </div>

      {/* Filter by AG */}
      <div className="mb-4">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 min-w-[260px]"
          value={filterAg} onChange={e => handleFilterChange(e.target.value)}>
          <option value="">Toutes les assemblées</option>
          {assemblees.map(a => <option key={a.id} value={a.id}>AG {a.type_ag_label} — {a.date_ag}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">N°</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Titre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">AG</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pour</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Contre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Abst.</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Résultat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Aucune résolution</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-slate-500">{item.numero}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.titre}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.ag_type} {item.ag_date}</td>
                  <td className="px-4 py-3 text-green-700 font-semibold">{item.voix_pour}</td>
                  <td className="px-4 py-3 text-red-500 font-semibold">{item.voix_contre}</td>
                  <td className="px-4 py-3 text-slate-500">{item.abstention}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RESULTAT_COLORS[item.resultat] || "bg-slate-100 text-slate-500"}`}>
                      {item.resultat_label}
                    </span>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier la résolution" : "Nouvelle résolution"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assemblée Générale *</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.assemblee_generale} onChange={e => setForm(f => ({ ...f, assemblee_generale: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {assemblees.map(a => <option key={a.id} value={a.id}>AG {a.type_ag_label} — {a.date_ag}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Numéro *</label>
                  <input type="number" min="1" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Résultat</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.resultat} onChange={e => setForm(f => ({ ...f, resultat: e.target.value }))}>
                    {RESULTATS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Titre *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  placeholder="Intitulé de la résolution"
                  value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Voix pour</label>{int("voix_pour")}</div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Voix contre</label>{int("voix_contre")}</div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Abstentions</label>{int("abstention")}</div>
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

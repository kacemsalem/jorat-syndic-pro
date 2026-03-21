import { useState, useEffect, useRef } from "react";
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
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/assemblees/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assemblées Générales</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} assemblée{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow">
          + Nouvelle AG
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune assemblée générale</div>
      ) : (
        <div ref={menuRef} className="flex flex-col gap-3">
          {items.map(item => {
            const dateFormatted = item.date_ag
              ? new Date(item.date_ag).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : item.date_ag;
            return (
            <div key={item.id} className="bg-violet-50 rounded-xl border border-violet-200 shadow-sm px-4 py-3 flex flex-col gap-2 relative">
              {/* Ligne 1 : titre + statut + menu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-slate-800 text-sm">
                    Assemblée Générale du {dateFormatted}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUT_COLORS[item.statut] ?? "bg-slate-100 text-slate-500"}`}>
                    {item.statut_label}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className="p-0.5 rounded hover:bg-violet-100 text-slate-300 hover:text-slate-600 transition">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === item.id && (
                    <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                      <button onClick={() => { openEdit(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                      <button onClick={() => { handleDelete(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : session */}
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Session :</span> {item.type_ag_label}
              </div>

              {/* Ligne 3 : ordre du jour */}
              {item.ordre_du_jour && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Ordre du jour :</span>{" "}
                  <span className="line-clamp-2">{item.ordre_du_jour}</span>
                </div>
              )}

              {/* Ligne 4 : résolutions + PV */}
              <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-violet-100">
                <button onClick={() => navigate(`/gouvernance/resolutions?ag_id=${item.id}`)}
                  className="text-xs text-indigo-600 hover:underline font-semibold">
                  {item.nb_resolutions ?? 0} résolution{(item.nb_resolutions ?? 0) !== 1 ? "s" : ""} →
                </button>
                {item.pv_document && (
                  <a href={item.pv_document} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline">📄 PV</a>
                )}
              </div>
            </div>
            );
          })}
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

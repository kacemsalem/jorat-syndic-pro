import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPES = [
  { value: "PV",        label: "Procès-verbal" },
  { value: "REGLEMENT", label: "Règlement" },
  { value: "CONTRAT",   label: "Contrat" },
  { value: "RAPPORT",   label: "Rapport" },
  { value: "AUTRE",     label: "Autre" },
];

const TYPE_COLORS = {
  PV:        "bg-blue-100 text-blue-700",
  REGLEMENT: "bg-purple-100 text-purple-700",
  CONTRAT:   "bg-orange-100 text-orange-700",
  RAPPORT:   "bg-green-100 text-green-700",
  AUTRE:     "bg-slate-100 text-slate-600",
};

const today = new Date().toISOString().slice(0, 10);
const EMPTY = { type_document: "AUTRE", titre: "", date: today, visible_resident: false };

export default function DocumentsGouvernancePage() {
  const navigate = useNavigate();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [fichier,  setFichier]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/documents-gouvernance/", { credentials: "include" })
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

  const openCreate = () => { setForm(EMPTY); setFichier(null); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = item => {
    setForm({ type_document: item.type_document, titre: item.titre, date: item.date, visible_resident: item.visible_resident });
    setFichier(null); setEditItem(item); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.titre || !form.date) { setError("Le titre et la date sont obligatoires."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/documents-gouvernance/${editItem.id}/` : "/api/documents-gouvernance/";
    const method = editItem ? "PATCH" : "POST";
    try {
      let res;
      if (fichier) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("fichier", fichier);
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
    if (!window.confirm(`Supprimer "${item.titre}" ?`)) return;
    await fetch(`/api/documents-gouvernance/${item.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchItems();
  };

  const filtered = search
    ? items.filter(i => i.titre.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Documents</h1>
          </div>
          <button onClick={openCreate} className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
            + Nouveau document
          </button>
        </div>
        <p className="text-white/50 text-[10px] mt-1">{items.length} document{items.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

      <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Rechercher par titre…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">Aucun document</div>
      ) : (
        <div ref={menuRef} className="flex flex-col gap-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-purple-50 rounded-xl border border-purple-200 shadow-sm px-4 py-3 flex flex-col gap-2 relative">
              {/* Top: type + date + menu */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[item.type_document] ?? "bg-slate-100 text-slate-500"}`}>
                    {item.type_document_label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.date}</span>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className="p-0.5 rounded hover:bg-purple-100 text-slate-300 hover:text-slate-600 transition">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === item.id && (
                    <div className="absolute right-0 top-5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                      <button onClick={() => { openEdit(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                      <button onClick={() => { handleDelete(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Titre */}
              <div className="font-semibold text-slate-800 text-[13px] leading-tight line-clamp-2">{item.titre}</div>

              {/* Visible + fichier */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.visible_resident ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.visible_resident ? "Visible" : "Privé"}
                </span>
                {item.fichier && (
                  <a href={item.fichier} target="_blank" rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:underline">Télécharger</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier le document" : "Nouveau document"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Titre *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  placeholder="Nom du document"
                  value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Type</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.type_document} onChange={e => setForm(f => ({ ...f, type_document: e.target.value }))}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date *</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Fichier</label>
                <input type="file" className="w-full text-sm text-slate-600"
                  onChange={e => setFichier(e.target.files[0] || null)} />
                {editItem?.fichier && !fichier && (
                  <p className="text-xs text-slate-400 mt-1">Fichier existant conservé si aucun fichier sélectionné.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="visible_res" checked={form.visible_resident} onChange={e => setForm(f => ({ ...f, visible_resident: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="visible_res" className="text-sm text-slate-700">Visible par les résidents</label>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

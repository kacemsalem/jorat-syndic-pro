import { useState, useEffect, useRef } from "react";
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

  const [items,      setItems]      = useState([]);
  const [assemblees, setAssemblees] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [form,       setForm]       = useState({ ...EMPTY, assemblee_generale: agIdParam });
  const [saving,     setSaving]     = useState(false);
  const [filterAg,   setFilterAg]   = useState(agIdParam);
  const [openMenu,   setOpenMenu]   = useState(null);
  const menuRef = useRef(null);

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
    if (searchParams.get("new") === "1") {
      setForm({ ...EMPTY, assemblee_generale: agIdParam });
      setEditItem(null);
      setShowForm(true);
    }
  }, []);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        {agIdParam && (
          <button onClick={() => navigate("/gouvernance/assemblees")}
            className="flex items-center gap-1 text-white/70 hover:text-white text-[10px] font-semibold mb-3 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour AG
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Résolutions</h1>
          </div>
          <button onClick={openCreate} className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
            + Nouvelle résolution
          </button>
        </div>
        <p className="text-white/50 text-[10px] mt-1">{items.length} résolution{items.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

      <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
        {agIdParam ? (
          <div className="text-sm font-semibold text-slate-700">
            {(() => { const a = assemblees.find(a => String(a.id) === agIdParam); return a ? `AG ${a.type_ag_label} — ${a.date_ag}` : "Assemblée…"; })()}
          </div>
        ) : (
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={filterAg} onChange={e => handleFilterChange(e.target.value)}>
            <option value="">Toutes les assemblées</option>
            {assemblees.map(a => <option key={a.id} value={a.id}>AG {a.type_ag_label} — {a.date_ag}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">Aucune résolution</div>
      ) : (
        <div ref={menuRef} className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm px-4 py-3 flex flex-col gap-2 relative">
              {/* Top: n° + résultat + menu */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">N°{item.numero}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${RESULTAT_COLORS[item.resultat] ?? "bg-slate-100 text-slate-500"}`}>
                    {item.resultat_label}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className="p-0.5 rounded hover:bg-indigo-100 text-slate-300 hover:text-slate-600 transition">
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

              {/* AG + votes */}
              <div className="text-[10px] text-slate-500 truncate">{item.ag_type} {item.ag_date}</div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-green-700 font-semibold">✓ {item.voix_pour}</span>
                <span className="text-red-500 font-semibold">✗ {item.voix_contre}</span>
                <span className="text-slate-400">~ {item.abstention}</span>
              </div>
            </div>
          ))}
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
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Assemblée Générale *</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.assemblee_generale} onChange={e => setForm(f => ({ ...f, assemblee_generale: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {assemblees.map(a => <option key={a.id} value={a.id}>AG {a.type_ag_label} — {a.date_ag}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Numéro *</label>
                  <input type="number" min="1" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Résultat</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.resultat} onChange={e => setForm(f => ({ ...f, resultat: e.target.value }))}>
                    {RESULTATS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Titre *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  placeholder="Intitulé de la résolution"
                  value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Description</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[10px] font-semibold text-slate-400 mb-1">Voix pour</label>{int("voix_pour")}</div>
                <div><label className="block text-[10px] font-semibold text-slate-400 mb-1">Voix contre</label>{int("voix_contre")}</div>
                <div><label className="block text-[10px] font-semibold text-slate-400 mb-1">Abstentions</label>{int("abstention")}</div>
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

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const MOIS_OPTIONS = [
  { value: "JAN", label: "Janvier" }, { value: "FEV", label: "Février" },
  { value: "MAR", label: "Mars" },    { value: "AVR", label: "Avril" },
  { value: "MAI", label: "Mai" },     { value: "JUN", label: "Juin" },
  { value: "JUL", label: "Juillet" }, { value: "AOU", label: "Août" },
  { value: "SEP", label: "Septembre"},{ value: "OCT", label: "Octobre" },
  { value: "NOV", label: "Novembre" },{ value: "DEC", label: "Décembre" },
];

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 transition";

const EMPTY_FORM = {
  compte: "",
  date_recette: new Date().toISOString().slice(0, 10),
  montant: "",
  libelle: "",
  source: "",
  commentaire: "",
  mois: "",
};

export default function RecettesPage() {
  const navigate = useNavigate();

  const [recettes,  setRecettes]  = useState([]);
  const [comptes,   setComptes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [openMenu,  setOpenMenu]  = useState(null);
  const menuRef = useRef(null);

  const [filterAnnee,   setFilterAnnee]   = useState("");
  const [filterMois,    setFilterMois]    = useState("");
  const [filterCompte,  setFilterCompte]  = useState("");
  const [filterAttente, setFilterAttente] = useState(false);

  // Quick-add compte
  const [quickOpen,       setQuickOpen]       = useState(false);
  const [quickCompteForm, setQuickCompteForm] = useState({ code: "", libelle: "" });
  const [savingQuick,     setSavingQuick]     = useState(false);
  const [quickError,      setQuickError]      = useState("");

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/recettes/",                      { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([rec, cpt]) => {
      setRecettes(Array.isArray(rec) ? rec : (rec.results ?? []));
      setComptes(Array.isArray(cpt)  ? cpt : (cpt.results ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nbAttente = useMemo(() => recettes.filter(r => r.compte_code === "000").length, [recettes]);

  const filtered = useMemo(() => {
    return recettes.filter(r => {
      if (filterAnnee   && !r.date_recette?.startsWith(filterAnnee)) return false;
      if (filterMois    && r.mois !== filterMois)                     return false;
      if (filterCompte  && String(r.compte) !== filterCompte)         return false;
      if (filterAttente && r.compte_code !== "000")                   return false;
      return true;
    });
  }, [recettes, filterAnnee, filterMois, filterCompte, filterAttente]);

  const totalRecettes = useMemo(() =>
    filtered.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0), [filtered]);

  const comptesUsed = useMemo(() => {
    const ids = new Set(recettes.map(r => String(r.compte)));
    return comptes.filter(c => ids.has(String(c.id)));
  }, [recettes, comptes]);

  const annees = useMemo(() => {
    const set = new Set(recettes.map(r => r.date_recette?.slice(0, 4)).filter(Boolean));
    return [...set].sort().reverse();
  }, [recettes]);

  const openCreate = () => {
    setEditItem(null); setForm(EMPTY_FORM); setError(""); setQuickOpen(false); setShowForm(true);
  };
  const openEdit = (r) => {
    setEditItem(r);
    setForm({ compte: String(r.compte), date_recette: r.date_recette, montant: r.montant,
              libelle: r.libelle, source: r.source || "", commentaire: r.commentaire || "", mois: r.mois || "" });
    setError(""); setQuickOpen(false); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setQuickOpen(false); setError(""); };

  const handleSubmit = async () => {
    setError("");
    if (!form.montant || !form.libelle || !form.date_recette) {
      setError("Montant, libellé et date sont obligatoires."); return;
    }
    setSaving(true);
    try {
      const url    = editItem ? `/api/recettes/${editItem.id}/` : "/api/recettes/";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...form, compte: Number(form.compte) }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(JSON.stringify(d)); return; }
      closeForm(); fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette recette ?")) return;
    await fetch(`/api/recettes/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchAll();
  };

  const handleQuickCompteSave = async () => {
    if (!quickCompteForm.code.trim())    { setQuickError("Code obligatoire."); return; }
    if (!quickCompteForm.libelle.trim()) { setQuickError("Libellé obligatoire."); return; }
    setSavingQuick(true); setQuickError("");
    try {
      const res = await fetch("/api/comptes-comptables/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...quickCompteForm, type_compte: "PRODUIT", actif: true }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setQuickError(Object.values(d).flat().join(" ") || "Erreur."); return; }
      const created = await res.json();
      setComptes(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      setForm(f => ({ ...f, compte: String(created.id) }));
      setQuickOpen(false); setQuickCompteForm({ code: "", libelle: "" });
    } catch { setQuickError("Erreur réseau."); }
    finally { setSavingQuick(false); }
  };

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header avec ← Retour */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div>
          <button onClick={() => navigate("/caisse")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium mb-1">
            ← Retour à la Caisse
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Recettes</h1>
          <p className="text-xs text-slate-400 mt-0.5">Encaissements exceptionnels hors paiements copropriétaires</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition shadow self-start sm:self-auto">
          + Nouvelle recette
        </button>
      </div>

      {/* KPI compact */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Total ({filtered.length})</span>
        <span className="text-lg font-bold text-emerald-700">{fmt(totalRecettes)} MAD</span>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap mb-4">
        <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
          <option value="">Toutes périodes</option>
          {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filterCompte} onChange={e => setFilterCompte(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400">
          <option value="">Tous comptes</option>
          {comptesUsed.map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>)}
        </select>
        {nbAttente > 0 && (
          <button onClick={() => setFilterAttente(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              filterAttente ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
            }`}>
            ⚠ À affecter ({nbAttente})
          </button>
        )}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucune recette</div>
      ) : (
        <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-emerald-100 shadow-sm px-3 py-2 flex flex-col gap-1 relative">
              {/* Ligne 1 : date · mois · compte · menu */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{r.date_recette}</span>
                  {r.mois && <span className="text-[10px] font-semibold px-1 rounded bg-emerald-100 text-emerald-700">{r.mois}</span>}
                  <span className={`text-[10px] px-1 rounded font-mono ${r.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                    {r.compte_code}{r.compte_code === "000" ? " ⚠" : ""}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === r.id && (
                    <div className="absolute right-0 top-5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                      <button onClick={() => { openEdit(r); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                      <button onClick={() => { handleDelete(r.id); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : libellé + montant */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 text-[13px] leading-tight truncate">{r.libelle}</span>
                <span className="font-bold text-emerald-700 text-[13px] shrink-0">+{fmt(r.montant)}</span>
              </div>

              {/* Ligne 3 : source + compte libellé */}
              {(r.source || r.compte_libelle) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {r.source        && <span className="text-[10px] text-slate-400 truncate">{r.source}</span>}
                  {r.compte_libelle && r.compte_code !== "000" && (
                    <span className="text-[10px] text-indigo-400 truncate">{r.compte_libelle}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2.5 text-sm font-semibold text-emerald-800">
            Total : {fmt(totalRecettes)} MAD
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[94vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-800 mb-4">
              {editItem ? "Modifier la recette" : "Nouvelle recette"}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm mb-3">{error}</div>
            )}

            <div className="space-y-3">
              {/* Libellé */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
                <input type="text" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex: Location salle commune" className={INPUT} />
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
                <input type="text" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="Ex: Mairie, assurance, subvention…" className={INPUT} />
              </div>

              {/* Date | Période */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.date_recette} onChange={e => setForm(f => ({ ...f, date_recette: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
                  <select value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))} className={INPUT}>
                    <option value="">— Mois —</option>
                    {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (MAD) <span className="text-red-500">*</span></label>
                <input type="number" min="0.01" step="0.01" value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border-2 border-emerald-300 bg-emerald-50 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-900 focus:outline-none focus:border-emerald-500 placeholder:text-emerald-300 placeholder:font-normal transition"
                />
              </div>

              {/* Compte comptable */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Compte comptable <span className="font-normal text-slate-400">(optionnel — 000 par défaut)</span>
                </label>
                <div className="flex gap-2">
                  <select value={form.compte} onChange={e => setForm(f => ({ ...f, compte: e.target.value }))} className={`flex-1 ${INPUT}`}>
                    <option value="">— Attente d'affectation (000) —</option>
                    {comptes.filter(c => c.code !== "000").map(c => (
                      <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => { setQuickError(""); setQuickOpen(q => !q); }}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 text-lg font-bold transition border border-slate-200">
                    +
                  </button>
                </div>
                {quickOpen && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-emerald-700">Nouveau compte produit</p>
                    {quickError && <p className="text-red-500 text-xs">{quickError}</p>}
                    <div className="flex gap-2">
                      <input placeholder="Code (ex: 702)" value={quickCompteForm.code}
                        onChange={e => setQuickCompteForm(f => ({ ...f, code: e.target.value }))}
                        className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      <input placeholder="Libellé" value={quickCompteForm.libelle}
                        onChange={e => setQuickCompteForm(f => ({ ...f, libelle: e.target.value }))}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setQuickOpen(false)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">Annuler</button>
                      <button onClick={handleQuickCompteSave} disabled={savingQuick}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
                        {savingQuick ? "…" : "Créer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire</label>
                <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                  rows={2} placeholder="Remarques optionnelles…" className={INPUT} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

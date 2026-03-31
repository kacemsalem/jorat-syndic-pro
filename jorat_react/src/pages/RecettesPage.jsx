import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const relUrl = (url) => {
  if (!url) return null;
  try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
};

const MOIS_OPTIONS = [
  { value: "JAN", label: "Janvier" }, { value: "FEV", label: "Février" },
  { value: "MAR", label: "Mars" },    { value: "AVR", label: "Avril" },
  { value: "MAI", label: "Mai" },     { value: "JUN", label: "Juin" },
  { value: "JUL", label: "Juillet" }, { value: "AOU", label: "Août" },
  { value: "SEP", label: "Septembre"},{ value: "OCT", label: "Octobre" },
  { value: "NOV", label: "Novembre" },{ value: "DEC", label: "Décembre" },
];

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition";
const SEL   = "border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600 shrink-0";

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

  const [recettes,     setRecettes]     = useState([]);
  const [recTotal,     setRecTotal]     = useState(0);
  const [nextUrl,      setNextUrl]      = useState(null);
  const [annees,       setAnnees]       = useState([]);
  const [nbAttente,    setNbAttente]    = useState(0);
  const [comptes,      setComptes]      = useState([]);
  const [comptesUsed,  setComptesUsed]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState("");
  const [openMenu,         setOpenMenu]         = useState(null);
  const [defaultCompte,    setDefaultCompte]    = useState("");
  const menuRef       = useRef(null);
  const isFirstRender = useRef(true);

  const [filterAnnee,   setFilterAnnee]   = useState("");
  const [filterMois,    setFilterMois]    = useState("");
  const [filterCompte,  setFilterCompte]  = useState("");
  const [filterAttente, setFilterAttente] = useState(false);

  const [quickOpen,       setQuickOpen]       = useState(false);
  const [quickCompteForm, setQuickCompteForm] = useState({ code: "", libelle: "" });
  const [savingQuick,     setSavingQuick]     = useState(false);
  const [quickError,      setQuickError]      = useState("");

  const fetchStats = () => {
    fetch("/api/recettes/stats/", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setAnnees(d.annees ?? []);
          setNbAttente(d.count_attente ?? 0);
        }
      })
      .catch(() => {});
  };

  const fetchComptes = () => {
    fetch("/api/comptes-comptables/?actif=true", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.results ?? []);
        setComptes(list);
        const c000 = list.find(c => c.code === "000");
        if (c000) setDefaultCompte(String(c000.id));
      })
      .catch(() => {});
  };

  const buildUrl = (extra = {}) => {
    const params = new URLSearchParams();
    const a  = extra.annee   ?? filterAnnee;
    const m  = extra.mois    ?? filterMois;
    const cp = extra.compte  ?? filterCompte;
    const at = extra.attente ?? filterAttente;
    if (a)  params.set("annee",      a);
    if (m)  params.set("mois",       m);
    if (cp) params.set("compte_id",  cp);
    if (at) params.set("a_affecter", "true");
    return `/api/recettes/?${params.toString()}`;
  };

  const fetchRecettes = (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    const url = append && nextUrl ? nextUrl : buildUrl();
    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const results = d.results ?? [];
        setRecettes(prev => append ? [...prev, ...results] : results);
        setRecTotal(d.count ?? 0);
        setNextUrl(relUrl(d.next));
        // Rebuild comptesUsed from loaded records
        if (!append) {
          const ids = new Set(results.map(r => String(r.compte)));
          setComptesUsed(comptes.filter(c => ids.has(String(c.id))));
        } else {
          setComptesUsed(prev => {
            const existing = new Set(prev.map(c => String(c.id)));
            const newIds   = new Set(results.map(r => String(r.compte)));
            const toAdd    = comptes.filter(c => !existing.has(String(c.id)) && newIds.has(String(c.id)));
            return toAdd.length ? [...prev, ...toAdd] : prev;
          });
        }
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    fetchStats();
    fetchComptes();
    fetchRecettes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchRecettes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAnnee, filterMois, filterCompte, filterAttente]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalRecettes = useMemo(() =>
    recettes.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0), [recettes]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, compte: defaultCompte });
    setError(""); setQuickOpen(false); setShowForm(true);
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
        body: JSON.stringify({ ...form, compte: form.compte ? Number(form.compte) : null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(JSON.stringify(d)); return; }
      closeForm(); fetchStats(); fetchRecettes(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette recette ?")) return;
    await fetch(`/api/recettes/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchStats(); fetchRecettes(false);
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
  const isFiltered = filterAnnee || filterMois || filterCompte || filterAttente;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6">

      {/* ── En-tête bleu ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-14">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Recettes</p>
            <p className="text-white/50 text-[10px]">
              {recettes.length} / {recTotal} recette{recTotal !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={openCreate}
            className="w-10 h-10 bg-white/20 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition shadow">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <p className="text-white/60 text-xs mb-1">Total recettes</p>
        <p className="text-4xl font-bold text-white leading-none mb-1">
          {fmt(totalRecettes)}
          <span className="text-base font-normal text-white/50 ml-2">MAD</span>
        </p>
      </div>

      {/* ── Contenu flottant ──────────────────────────────────── */}
      <div className="px-4 -mt-6 space-y-4 pb-24">

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Filtres</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} className={SEL}>
              <option value="">Toutes années</option>
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)} className={SEL}>
              <option value="">Tous mois</option>
              {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={filterCompte} onChange={e => setFilterCompte(e.target.value)} className={SEL}>
              <option value="">Tous comptes</option>
              {comptesUsed.map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {nbAttente > 0 && (
              <button onClick={() => setFilterAttente(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                  filterAttente ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                }`}>
                ⚠ À affecter ({nbAttente})
              </button>
            )}
            {isFiltered && (
              <button onClick={() => { setFilterAnnee(""); setFilterMois(""); setFilterCompte(""); setFilterAttente(false); }}
                className="text-[10px] text-blue-600 font-semibold hover:text-blue-700">
                ✕ Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recettes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
            <p className="text-slate-300 text-sm">Aucune recette</p>
          </div>
        ) : (
          <div ref={menuRef} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recettes</p>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {recettes.length} / {recTotal}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {recettes.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">

                  {/* Icône cercle vert */}
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{r.libelle}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">{r.date_recette}</span>
                      {r.mois && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {r.mois}
                        </span>
                      )}
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                        r.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
                      }`}>
                        {r.compte_code}{r.compte_code === "000" ? " ⚠" : ""}
                      </span>
                    </div>
                    {r.source && <p className="text-[10px] text-slate-400 truncate">{r.source}</p>}
                    {r.compte_libelle && r.compte_code !== "000" && (
                      <p className="text-[10px] text-indigo-400 truncate">{r.compte_libelle}</p>
                    )}
                  </div>

                  {/* Montant */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">+{fmt(r.montant)}</p>
                    <p className="text-[9px] text-slate-400">MAD</p>
                  </div>

                  {/* Menu 3 points */}
                  <div className="relative shrink-0">
                    <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="4"  r="1.5"/>
                        <circle cx="10" cy="10" r="1.5"/>
                        <circle cx="10" cy="16" r="1.5"/>
                      </svg>
                    </button>
                    {openMenu === r.id && (
                      <div className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                        <button onClick={() => { openEdit(r); setOpenMenu(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                        <button onClick={() => { handleDelete(r.id); setOpenMenu(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Charger plus */}
            {nextUrl && (
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <button onClick={() => fetchRecettes(true)} disabled={loadingMore}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                  {loadingMore ? "Chargement…" : `Charger plus (${recTotal - recettes.length} restants)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal formulaire ──────────────────────────────────── */}
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
                <input type="text" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex: Location salle commune" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
                <input type="text" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="Ex: Mairie, assurance, subvention…" className={INPUT} />
              </div>
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (MAD) <span className="text-red-500">*</span></label>
                <input type="number" min="0.01" step="0.01" value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="0.00"
                  className="w-full border-2 border-blue-300 bg-blue-50 rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 focus:outline-none focus:border-blue-500 placeholder:text-blue-300 placeholder:font-normal transition"
                />
              </div>
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
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 text-lg font-bold transition border border-slate-200">
                    +
                  </button>
                </div>
                {quickOpen && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Nouveau compte produit</p>
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
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60">
                        {savingQuick ? "…" : "Créer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

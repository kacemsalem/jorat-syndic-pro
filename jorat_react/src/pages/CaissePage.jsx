import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChartCaisse from "../components/ChartCaisse";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const relUrl = (url) => {
  if (!url) return null;
  try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
};

const TYPE_LABELS = {
  SOLDE_INITIAL:      "Solde initial",
  PAIEMENT:           "Paiement",
  RECETTE:            "Recette",
  DEPENSE:            "Dépense",
  AJUSTEMENT:         "Ajustement",
  ARCHIVE_ADJUSTMENT: "Ajust. archive",
};

const TYPE_BADGE = {
  SOLDE_INITIAL:      "bg-sky-100 text-sky-700",
  PAIEMENT:           "bg-emerald-100 text-emerald-700",
  RECETTE:            "bg-green-100 text-green-700",
  DEPENSE:            "bg-red-100 text-red-700",
  AJUSTEMENT:         "bg-amber-100 text-amber-700",
  ARCHIVE_ADJUSTMENT: "bg-purple-100 text-purple-700",
};

const MANUAL_TYPES = ["SOLDE_INITIAL", "AJUSTEMENT"];

const EMPTY_FORM = {
  type_mouvement: "AJUSTEMENT",
  sens: "DEBIT",
  date_mouvement: new Date().toISOString().slice(0, 10),
  montant: "",
  libelle: "",
  commentaire: "",
};

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition";
const SEL   = "border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600 shrink-0";

export default function CaissePage() {
  const navigate = useNavigate();
  const [mouvements,         setMouvements]         = useState([]);
  const [caissTotal,         setCaissTotal]         = useState(0);
  const [totalEntrees,       setTotalEntrees]       = useState(0);
  const [totalSorties,       setTotalSorties]       = useState(0);
  const [totalArchive,       setTotalArchive]       = useState(0);
  const [nextUrl,            setNextUrl]            = useState(null);
  const [balanceTotale,      setBalanceTotale]      = useState(0);
  const [annees,             setAnnees]             = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [loadingMore,        setLoadingMore]        = useState(false);
  const [showForm,           setShowForm]           = useState(false);
  const [showRecetteConfirm, setShowRecetteConfirm] = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterMois,  setFilterMois]  = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterSens,  setFilterSens]  = useState("");
  const [openMenu,    setOpenMenu]    = useState(null);
  const [showChart,   setShowChart]   = useState(false);
  const [chartMvt,    setChartMvt]    = useState([]);
  const menuRef      = useRef(null);
  const isFirstRender = useRef(true);

  const fetchStats = () => {
    fetch("/api/caisse-mouvements/stats/", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setBalanceTotale(d.balance_totale ?? 0);
          setAnnees(d.annees ?? []);
        }
      })
      .catch(() => {});
  };

  const buildUrl = (extra = {}) => {
    const params = new URLSearchParams();
    const a = extra.annee ?? filterAnnee;
    const m = extra.mois  ?? filterMois;
    const t = extra.type  ?? filterType;
    const s = extra.sens  ?? filterSens;
    if (a) params.set("annee",          a);
    if (m) params.set("mois",           m);
    if (t) params.set("type_mouvement", t);
    if (s) params.set("sens",           s);
    return `/api/caisse-mouvements/?${params.toString()}`;
  };

  const fetchMouvements = (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    const url = append && nextUrl ? nextUrl : buildUrl();
    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const results = d.results ?? [];
        setMouvements(prev => append ? [...prev, ...results] : results);
        setCaissTotal(d.count ?? 0);
        if (!append) {
          setTotalEntrees(d.total_entrees ?? 0);
          setTotalSorties(d.total_sorties ?? 0);
          setTotalArchive(d.total_archive ?? 0);
        }
        setNextUrl(relUrl(d.next));
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  // Fetch ALL mouvements (no filters) for chart — runs once when chart is first opened
  const fetchChartMvt = () => {
    fetch("/api/caisse-mouvements/?page_size=9999", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setChartMvt(d.results ?? (Array.isArray(d) ? d : [])); })
      .catch(() => {});
  };
  useEffect(() => { if (showChart && chartMvt.length === 0) fetchChartMvt(); }, [showChart]);

  useEffect(() => {
    fetchStats();
    fetchMouvements(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchMouvements(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAnnee, filterMois, filterType, filterSens]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const handleSubmit = async () => {
    setError("");
    if (!form.montant || !form.libelle || !form.date_mouvement) {
      setError("Montant, libellé et date sont obligatoires."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/caisse-mouvements/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(JSON.stringify(d)); return; }
      setShowForm(false); setForm(EMPTY_FORM);
      fetchStats(); fetchMouvements(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await fetch(`/api/caisse-mouvements/${id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchStats(); fetchMouvements(false);
  };

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
  const isFiltered = filterAnnee || filterMois || filterType || filterSens;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6">

      {/* ── En-tête bleu ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-14">

        {/* Titre + bouton + */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Finances</p>
            <h1 className="text-white font-bold text-xl leading-tight">Caisse</h1>
            <p className="text-white/50 text-[10px] mt-0.5">
              {mouvements.length} / {caissTotal} mouvement(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowChart(v => !v)}
              title="Évolution de la caisse"
              className={`w-10 h-10 border rounded-full flex items-center justify-center transition shadow ${
                showChart ? "bg-white/90 border-white/90" : "bg-white/20 border-white/20 hover:bg-white/30"
              }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke={showChart ? "#2563EB" : "white"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </button>
            <button onClick={() => { setForm(EMPTY_FORM); setError(""); setShowForm(true); }}
              className="w-10 h-10 bg-white/20 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition shadow">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Solde principal */}
        <div className="mb-5">
          <p className="text-white/60 text-xs mb-1">Solde actuel (total général)</p>
          <p className={`text-4xl font-bold leading-none mb-1 ${balanceTotale >= 0 ? "text-white" : "text-red-200"}`}>
            {fmt(balanceTotale)}
            <span className="text-base font-normal text-white/50 ml-2">MAD</span>
          </p>
        </div>

        {/* Mini KPIs en ligne */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Entrées</p>
            <p className="text-emerald-300 font-bold text-sm">+ {fmt(totalEntrees)}</p>
            <p className="text-white/30 text-[9px]">MAD</p>
          </div>
          <div className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Sorties</p>
            <p className="text-red-300 font-bold text-sm">− {fmt(totalSorties)}</p>
            <p className="text-white/30 text-[9px]">MAD</p>
          </div>
          {totalArchive !== 0 && (
            <div className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5">
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Archive</p>
              <p className={`font-bold text-sm ${totalArchive >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {totalArchive >= 0 ? "+" : "−"} {fmt(Math.abs(totalArchive))}
              </p>
              <p className="text-white/30 text-[9px]">MAD</p>
            </div>
          )}
          <div className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Solde</p>
            {(() => { const s = totalEntrees - totalSorties + totalArchive; return (
              <p className={`font-bold text-sm ${s >= 0 ? "text-white" : "text-red-300"}`}>
                {s >= 0 ? "+" : "−"} {fmt(Math.abs(s))}
              </p>
            ); })()}
            <p className="text-white/30 text-[9px]">MAD</p>
          </div>
          <button onClick={() => setShowRecetteConfirm(true)}
            className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5 hover:bg-white/20 transition flex flex-col items-center justify-center gap-1">
            <p className="text-white/70 text-[10px] font-semibold leading-none">Recettes</p>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Contenu flottant ──────────────────────────────────── */}
      <div className="px-4 -mt-6 space-y-4 pb-24">

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Filtres</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)} className={SEL}>
              <option value="">Toutes années</option>
              {annees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)} className={SEL}>
              <option value="">Tous mois</option>
              {[["JAN","Janvier"],["FEV","Février"],["MAR","Mars"],["AVR","Avril"],["MAI","Mai"],["JUN","Juin"],
                ["JUL","Juillet"],["AOU","Août"],["SEP","Septembre"],["OCT","Octobre"],["NOV","Novembre"],["DEC","Décembre"],
              ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={SEL}>
              <option value="">Tous types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterSens} onChange={e => setFilterSens(e.target.value)} className={SEL}>
              <option value="">Entrées + Sorties</option>
              <option value="DEBIT">Entrées</option>
              <option value="CREDIT">Sorties</option>
            </select>
          </div>
          {isFiltered && (
            <button onClick={() => { setFilterAnnee(""); setFilterMois(""); setFilterType(""); setFilterSens(""); }}
              className="mt-2 text-[10px] text-blue-600 font-semibold hover:text-blue-700">
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Graphe évolution */}
        {showChart && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Évolution du solde</p>
            <ChartCaisse mouvements={chartMvt} />
          </div>
        )}

        {/* Liste des mouvements */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mouvements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
            <p className="text-slate-300 text-sm">Aucun mouvement</p>
          </div>
        ) : (
          <div ref={menuRef} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mouvements</p>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {mouvements.length} / {caissTotal}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {mouvements.map(m => {
                const isEntree = m.sens === "DEBIT";
                const isManual = MANUAL_TYPES.includes(m.type_mouvement);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">

                    {/* Icône cercle */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isEntree ? "bg-emerald-100" : "bg-red-100"
                    }`}>
                      <svg viewBox="0 0 24 24" fill="none"
                        stroke={isEntree ? "#059669" : "#DC2626"}
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: 14, height: 14 }}>
                        {isEntree
                          ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                          : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                        }
                      </svg>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{m.libelle}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">{m.date_mouvement}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[m.type_mouvement] ?? "bg-slate-100 text-slate-600"}`}>
                          {TYPE_LABELS[m.type_mouvement] ?? m.type_mouvement}
                        </span>
                      </div>
                      {m.compte_code && (
                        <p className="text-[10px] font-mono text-indigo-500 truncate">
                          {m.compte_code}{m.compte_libelle ? ` — ${m.compte_libelle}` : ""}
                        </p>
                      )}
                      {m.commentaire && (
                        <p className="text-[10px] text-slate-400 truncate">{m.commentaire}</p>
                      )}
                    </div>

                    {/* Montant */}
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${isEntree ? "text-emerald-600" : "text-red-600"}`}>
                        {isEntree ? "+" : "−"}{fmt(m.montant)}
                      </p>
                      <p className="text-[9px] text-slate-400">MAD</p>
                    </div>

                    {/* Menu 3 points (manuels seulement) */}
                    {isManual && (
                      <div className="relative shrink-0">
                        <button onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="4"  r="1.5"/>
                            <circle cx="10" cy="10" r="1.5"/>
                            <circle cx="10" cy="16" r="1.5"/>
                          </svg>
                        </button>
                        {openMenu === m.id && (
                          <div className="absolute right-0 top-7 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-32">
                            <button onClick={() => { handleDelete(m.id); setOpenMenu(null); }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Charger plus */}
            {nextUrl && (
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <button onClick={() => fetchMouvements(true)} disabled={loadingMore}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                  {loadingMore ? "Chargement…" : `Charger plus (${caissTotal - mouvements.length} restants)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modale confirmation Recettes ──────────────────────── */}
      {showRecetteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">ℹ</div>
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Opération peu fréquente</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Les <strong>recettes</strong> concernent des encaissements exceptionnels hors paiements copropriétaires
                  (ex : location de salle commune, subvention, remboursement assurance…).
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  En gestion courante, cette opération est <strong>rare</strong>.
                  Les paiements des copropriétaires se gèrent dans <em>Paiements</em>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRecetteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => { setShowRecetteConfirm(false); navigate("/recettes"); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                Continuer vers Recettes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale nouveau mouvement ──────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Nouveau mouvement manuel</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type <span className="text-red-500">*</span></label>
                <select value={form.type_mouvement} onChange={e => setForm(f => ({ ...f, type_mouvement: e.target.value }))}
                  className="w-full border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition">
                  {MANUAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sens <span className="text-red-500">*</span></label>
                  <select value={form.sens} onChange={e => setForm(f => ({ ...f, sens: e.target.value }))} className={INPUT}>
                    <option value="DEBIT">Entrée</option>
                    <option value="CREDIT">Sortie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.date_mouvement} onChange={e => setForm(f => ({ ...f, date_mouvement: e.target.value }))} className={INPUT} />
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé <span className="text-red-500">*</span></label>
                <input type="text" value={form.libelle}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Description du mouvement" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire</label>
                <textarea value={form.commentaire}
                  onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                  rows={2} placeholder="Remarques optionnelles…" className={INPUT} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setError(""); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
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

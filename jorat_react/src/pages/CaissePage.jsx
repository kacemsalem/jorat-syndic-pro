import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

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

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400 transition";

export default function CaissePage() {
  const navigate = useNavigate();
  const [mouvements,      setMouvements]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showForm,        setShowForm]        = useState(false);
  const [showRecetteConfirm, setShowRecetteConfirm] = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterMois,  setFilterMois]  = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterSens,  setFilterSens]  = useState("");
  const [openMenu,    setOpenMenu]    = useState(null);
  const menuRef = useRef(null);

  const fetchAll = () => {
    setLoading(true);
    fetch("/api/caisse-mouvements/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setMouvements(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    return mouvements.filter(m => {
      if (filterAnnee && !m.date_mouvement?.startsWith(filterAnnee)) return false;
      if (filterMois  && m.mois !== filterMois)                        return false;
      if (filterType  && m.type_mouvement !== filterType)              return false;
      if (filterSens  && m.sens !== filterSens)                        return false;
      return true;
    });
  }, [mouvements, filterAnnee, filterMois, filterType, filterSens]);

  // Solde réel = TOUJOURS sur l'ensemble des mouvements (non filtré)
  // Entrée (DEBIT) → ajoute au solde, Sortie (CREDIT) → réduit le solde
  const balance = useMemo(() =>
    mouvements.reduce((acc, m) => {
      const v = parseFloat(m.montant) || 0;
      return m.sens === "DEBIT" ? acc + v : acc - v;
    }, 0), [mouvements]);

  // Totaux sur les données filtrées pour les KPI du bas
  const totalEntrees = useMemo(() =>
    filtered.filter(m => m.sens === "DEBIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0),
    [filtered]);

  const totalSorties = useMemo(() =>
    filtered.filter(m => m.sens === "CREDIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0),
    [filtered]);

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
      setShowForm(false); setForm(EMPTY_FORM); fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await fetch(`/api/caisse-mouvements/${id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchAll();
  };

  const annees = useMemo(() => {
    const set = new Set(mouvements.map(m => m.date_mouvement?.slice(0, 4)).filter(Boolean));
    return [...set].sort().reverse();
  }, [mouvements]);

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Caisse</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRecetteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-50 transition self-start sm:self-auto"
          >
            Recettes
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setError(""); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl font-semibold text-sm hover:bg-sky-600 transition shadow self-start sm:self-auto"
          >
            + Nouveau mouvement
          </button>
        </div>
      </div>

      {/* Modale confirmation Recettes */}
      {showRecetteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg">ℹ</div>
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Opération peu fréquente</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Les <strong>recettes</strong> concernent des encaissements exceptionnels hors paiements copropriétaires
                  (ex : location de salle commune, subvention municipale, remboursement assurance, produit financier…).
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  En gestion courante de copropriété, cette opération est <strong>rare</strong>.
                  Les paiements des copropriétaires se gèrent dans la section <em>Paiements</em>.
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

      {/* KPI — compact pour mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className={`rounded-xl border px-3 py-2 ${balance >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">Solde actuel</div>
          <div className={`text-base font-bold leading-tight ${balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(balance)}</div>
          <div className="text-[10px] text-slate-400">MAD</div>
        </div>
        <div className="rounded-xl border px-3 py-2 bg-green-50 border-green-200">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">Total entrées</div>
          <div className="text-base font-bold text-green-700 leading-tight">{fmt(totalEntrees)}</div>
          <div className="text-[10px] text-slate-400">MAD</div>
        </div>
        <div className="rounded-xl border px-3 py-2 bg-red-50 border-red-200">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">Total sorties</div>
          <div className="text-base font-bold text-red-700 leading-tight">{fmt(totalSorties)}</div>
          <div className="text-[10px] text-slate-400">MAD</div>
        </div>
        <div className="rounded-xl border px-3 py-2 bg-sky-50 border-sky-200">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-0.5">Mouvements</div>
          <div className="text-base font-bold text-sky-700 leading-tight">{filtered.length}</div>
          <div className="text-[10px] text-slate-400">total</div>
        </div>
      </div>

      {/* Légende formule */}
      <p className="text-[10px] text-slate-400 mb-3">
        Solde actuel = total général (toutes dates) · Entrée (DÉBIT) ajoute · Sortie (CRÉDIT) réduit
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400">
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400">
          <option value="">Toutes périodes</option>
          {[["JAN","Jan"],["FEV","Fév"],["MAR","Mar"],["AVR","Avr"],["MAI","Mai"],["JUN","Jui"],
            ["JUL","Jul"],["AOU","Aoû"],["SEP","Sep"],["OCT","Oct"],["NOV","Nov"],["DEC","Déc"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400">
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterSens} onChange={e => setFilterSens(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-sky-400">
          <option value="">Entrées + Sorties</option>
          <option value="DEBIT">Entrées seulement</option>
          <option value="CREDIT">Sorties seulement</option>
        </select>
      </div>

      {/* Formulaire nouveau mouvement */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Nouveau mouvement manuel</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              {/* Type — pleine largeur, fond bleu léger */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type <span className="text-red-500">*</span></label>
                <select value={form.type_mouvement} onChange={e => setForm(f => ({ ...f, type_mouvement: e.target.value }))}
                  className="w-full border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition">
                  {MANUAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              {/* Sens + Date — même ligne */}
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
                  className="w-full border-2 border-amber-300 bg-amber-50 rounded-xl px-3 py-2 text-sm font-semibold text-amber-900 focus:outline-none focus:border-amber-500 placeholder:text-amber-300 placeholder:font-normal transition"
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
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban mouvements */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Aucun mouvement</div>
      ) : (
        <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {filtered.map(m => {
            const isEntree = m.sens === "DEBIT";
            const isManual = MANUAL_TYPES.includes(m.type_mouvement);
            return (
              <div key={m.id}
                className={`rounded-2xl border p-3 flex flex-col gap-1.5 relative ${
                  isEntree
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                {/* Top: date + badges + menu */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">{m.date_mouvement}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[m.type_mouvement] ?? "bg-slate-100 text-slate-600"}`}>
                      {TYPE_LABELS[m.type_mouvement] ?? m.type_mouvement}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isEntree ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"}`}>
                      {isEntree ? "Entrée" : "Sortie"}
                    </span>
                  </div>
                  {/* 3-dot menu — seulement pour mouvements manuels */}
                  {isManual && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                        className="p-0.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-700 transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                        </svg>
                      </button>
                      {openMenu === m.id && (
                        <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-32">
                          <button onClick={() => { handleDelete(m.id); setOpenMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Supprimer</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Libellé */}
                <div className="font-semibold text-slate-800 text-sm leading-snug truncate">{m.libelle}</div>

                {/* Compte */}
                {m.compte_code && (
                  <div className="text-[11px] font-mono text-indigo-600 truncate">
                    {m.compte_code}{m.compte_libelle ? ` — ${m.compte_libelle}` : ""}
                  </div>
                )}

                {/* Commentaire */}
                {m.commentaire && (
                  <div className="text-[11px] text-slate-500 truncate">{m.commentaire}</div>
                )}

                {/* Montant */}
                <div className="pt-1 border-t border-white/50">
                  <span className={`text-sm font-bold ${isEntree ? "text-emerald-700" : "text-red-700"}`}>
                    {isEntree ? "+" : "−"} {fmt(m.montant)} MAD
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
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
      fetch("/api/recettes/",                                       { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([rec, cpt]) => {
      setRecettes(Array.isArray(rec) ? rec : (rec.results ?? []));
      setComptes(Array.isArray(cpt)  ? cpt : (cpt.results ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const nbAttente = useMemo(() => recettes.filter(r => r.compte_code === "000").length, [recettes]);

  const filtered = useMemo(() => {
    return recettes.filter(r => {
      if (filterAnnee   && !r.date_recette?.startsWith(filterAnnee)) return false;
      if (filterMois    && r.mois !== filterMois) return false;
      if (filterCompte  && String(r.compte) !== filterCompte) return false;
      if (filterAttente && r.compte_code !== "000") return false;
      return true;
    });
  }, [recettes, filterAnnee, filterMois, filterCompte, filterAttente]);

  const totalRecettes = useMemo(() =>
    filtered.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0),
    [filtered]);

  const comptesUsed = useMemo(() => {
    const ids = new Set(recettes.map(r => String(r.compte)));
    return comptes.filter(c => ids.has(String(c.id)));
  }, [recettes, comptes]);

  const annees = useMemo(() => {
    const set = new Set(recettes.map(r => r.date_recette?.slice(0, 4)).filter(Boolean));
    return [...set].sort().reverse();
  }, [recettes]);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setError("");
    setQuickOpen(false);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditItem(r);
    setForm({
      compte:       String(r.compte),
      date_recette: r.date_recette,
      montant:      r.montant,
      libelle:      r.libelle,
      source:       r.source || "",
      commentaire:  r.commentaire || "",
      mois:         r.mois || "",
    });
    setError("");
    setQuickOpen(false);
    setShowForm(true);
  };

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
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...form, compte: Number(form.compte) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(JSON.stringify(d)); return;
      }
      setShowForm(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette recette ?")) return;
    await fetch(`/api/recettes/${id}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchAll();
  };

  const handleQuickCompteSave = async () => {
    if (!quickCompteForm.code.trim())    { setQuickError("Le code est obligatoire."); return; }
    if (!quickCompteForm.libelle.trim()) { setQuickError("Le libellé est obligatoire."); return; }
    setSavingQuick(true); setQuickError("");
    try {
      const res = await fetch("/api/comptes-comptables/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...quickCompteForm, type_compte: "PRODUIT", actif: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setQuickError(Object.values(d).flat().join(" ") || "Erreur."); return;
      }
      const created = await res.json();
      setComptes(prev => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      setForm(f => ({ ...f, compte: String(created.id) }));
      setQuickOpen(false);
      setQuickCompteForm({ code: "", libelle: "" });
    } catch { setQuickError("Erreur réseau."); }
    finally { setSavingQuick(false); }
  };

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Recettes</h1>
            <p className="text-sm text-slate-500">Encaissements hors paiements copropriétaires</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/comptes-comptables")}
            className="px-3 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            Plan comptable
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
          >
            + Nouvelle recette
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-4 mb-5">
        <div className="text-xs text-slate-500 uppercase tracking-wide">Total recettes ({filtered.length})</div>
        <div className="text-2xl font-bold text-emerald-600">{fmt(totalRecettes)} MAD</div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap mb-5">
        <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm">
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm">
          <option value="">Toutes périodes</option>
          {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select value={filterCompte} onChange={e => setFilterCompte(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm">
          <option value="">Tous comptes</option>
          {comptesUsed.map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>)}
        </select>
        {nbAttente > 0 && (
          <button
            onClick={() => setFilterAttente(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
              filterAttente
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
            }`}
          >
            ⚠ À affecter ({nbAttente})
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-5">
            {editItem ? "Modifier la recette" : "Nouvelle recette"}
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm mb-4">{error}</div>
          )}

          <div className="space-y-3">
            {/* Ligne 1 : Libellé | Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Libellé *</label>
                <input type="text" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex: Location salle commune"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
                <input type="text" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="Ex: Mairie, assurance…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* Ligne 2 : Date | Période | Montant */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" value={form.date_recette} onChange={e => setForm(f => ({ ...f, date_recette: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
                <select value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                  <option value="">— Mois —</option>
                  {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (MAD) *</label>
                <input type="number" min="0.01" step="0.01" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* Ligne 3 : Compte comptable (full) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Compte comptable <span className="font-normal text-slate-400">(optionnel — 000 par défaut)</span>
              </label>
              <div className="flex gap-1.5">
                <select value={form.compte} onChange={e => setForm(f => ({ ...f, compte: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                  <option value="">— Attente d'affectation (000) —</option>
                  {comptes.filter(c => c.code !== "000").map(c => <option key={c.id} value={String(c.id)}>{c.code} — {c.libelle}</option>)}
                </select>
                <button type="button" onClick={() => { setQuickError(""); setQuickOpen(q => !q); }}
                  className="px-2.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition"
                  title="Créer un compte produit">+</button>
              </div>
            </div>

            {quickOpen && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
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
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition">Annuler</button>
                  <button onClick={handleQuickCompteSave} disabled={savingQuick}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition">
                    {savingQuick ? "…" : "Créer"}
                  </button>
                </div>
              </div>
            )}

            {/* Ligne 4 : Commentaire */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire</label>
              <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                rows={2} placeholder="Remarques optionnelles…"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving}
              className={`px-6 py-2 rounded-xl text-sm font-semibold text-white transition ${saving ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); setQuickOpen(false); }}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
          Aucune recette trouvée
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Date", "Libellé", "Source", "Compte", "Montant (MAD)", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-emerald-50 transition`}>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <div>{r.date_recette}</div>
                    {r.mois && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{r.mois}</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.libelle}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.source || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${r.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                      {r.compte_code} — {r.compte_libelle}
                    </span>
                    {r.compte_code === "000" && (
                      <span className="ml-1 text-[10px] font-bold text-orange-500 uppercase">⚠ à affecter</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">
                    +{fmt(r.montant)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(r)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 transition text-slate-600">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-xs hover:bg-red-50 transition text-red-600">
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

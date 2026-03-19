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

// Classes de base et highlight auto-fill
const INPUT_BASE = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition";
const INPUT_NORMAL = `${INPUT_BASE} border-slate-200 focus:border-amber-400`;
const INPUT_AUTO   = `${INPUT_BASE} border-blue-300 bg-blue-50 focus:border-blue-400`;

const EMPTY_FORM = {
  modele_depense:   "",
  libelle:          "",
  compte:           "",
  fournisseur:      "",
  date_depense:     new Date().toISOString().slice(0, 10),
  montant:          "",
  detail:           "",
  facture_reference: "",
  commentaire:      "",
  mois:             "",
};

const EMPTY_AUTO = { libelle: false, compte: false, fournisseur: false };

export default function DepensesPage() {
  const navigate = useNavigate();

  const [depenses,     setDepenses]     = useState([]);
  const [modeles,      setModeles]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [comptes,      setComptes]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [autoFilled,   setAutoFilled]   = useState(EMPTY_AUTO);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  // Filters
  const [filterAnnee,       setFilterAnnee]       = useState("");
  const [filterMois,        setFilterMois]        = useState("");
  const [filterFamille,     setFilterFamille]     = useState("");
  const [filterFournisseur, setFilterFournisseur] = useState("");
  const [filterAttente,     setFilterAttente]     = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/depenses/",                   { credentials: "include" }).then(r => r.json()),
      fetch("/api/modeles-depense/?actif=true",  { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true",     { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([dep, mod, fou, cpt]) => {
      setDepenses(Array.isArray(dep) ? dep : (dep.results ?? []));
      setModeles(Array.isArray(mod) ? mod : (mod.results ?? []));
      setFournisseurs(Array.isArray(fou) ? fou : (fou.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Auto-fill from modele ────────────────────────────────
  const handleModeleChange = (modeleId) => {
    const m = modeles.find(m => String(m.id) === String(modeleId));
    setForm(f => {
      const updates = { ...f, modele_depense: modeleId };
      const newAuto = { ...autoFilled };
      if (m) {
        // Fill libelle if auto-filled or empty
        if (autoFilled.libelle || !f.libelle) {
          updates.libelle = m.nom;
          newAuto.libelle = !!m.nom;
        }
        // Fill compte if auto-filled or empty
        if (autoFilled.compte || !f.compte) {
          updates.compte = m.compte_comptable ? String(m.compte_comptable) : "";
          newAuto.compte = !!m.compte_comptable;
        }
        // Fill fournisseur if auto-filled or empty
        if (autoFilled.fournisseur || !f.fournisseur) {
          updates.fournisseur = m.fournisseur ? String(m.fournisseur) : "";
          newAuto.fournisseur = !!m.fournisseur;
        }
        setAutoFilled(newAuto);
      } else {
        setAutoFilled(EMPTY_AUTO);
      }
      return updates;
    });
  };

  // Helper: clear highlight when user manually edits a field
  const clearAuto = (field) => setAutoFilled(a => ({ ...a, [field]: false }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setAutoFilled(EMPTY_AUTO);
    setEditItem(null); setError(""); setShowForm(true);
  };
  const openEdit = (d) => {
    setForm({
      modele_depense:    String(d.modele_depense   || ""),
      libelle:           d.libelle                  || "",
      compte:            String(d.compte            || ""),
      fournisseur:       String(d.fournisseur       || ""),
      date_depense:      d.date_depense,
      montant:           d.montant,
      detail:            d.detail                   || "",
      facture_reference: d.facture_reference        || "",
      commentaire:       d.commentaire              || "",
      mois:              d.mois                     || "",
    });
    setAutoFilled(EMPTY_AUTO);
    setEditItem(d); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); };

  const handleSave = async () => {
    if (!form.montant || parseFloat(form.montant) <= 0) { setError("Le montant doit être > 0."); return; }
    if (!form.libelle.trim()) { setError("Le libellé est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      modele_depense:    form.modele_depense    || null,
      libelle:           form.libelle,
      compte:            form.compte            || null,
      fournisseur:       form.fournisseur       || null,
      date_depense:      form.date_depense,
      montant:           form.montant,
      detail:            form.detail,
      facture_reference: form.facture_reference,
      commentaire:       form.commentaire,
      mois:              form.mois              || null,
    };
    const url    = editItem ? `/api/depenses/${editItem.id}/` : "/api/depenses/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur.");
        return;
      }
      closeForm(); fetchAll();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dep) => {
    if (!confirm(`Supprimer "${dep.libelle}" ?`)) return;
    await fetch(`/api/depenses/${dep.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchAll();
  };

  const nbAttente = useMemo(() => depenses.filter(d => d.compte_code === "000").length, [depenses]);

  const filtered = useMemo(() => {
    let list = depenses;
    if (filterAnnee)       list = list.filter(d => d.date_depense?.startsWith(filterAnnee));
    if (filterMois)        list = list.filter(d => d.mois === filterMois);
    if (filterFamille)     list = list.filter(d => d.modele_famille_nom === filterFamille || d.categorie_famille === filterFamille);
    if (filterFournisseur) list = list.filter(d => String(d.fournisseur) === filterFournisseur);
    if (filterAttente)     list = list.filter(d => d.compte_code === "000");
    return list;
  }, [depenses, filterAnnee, filterMois, filterFamille, filterFournisseur, filterAttente]);

  const totalFiltered = filtered.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const annees = useMemo(() => [...new Set(depenses.map(d => d.date_depense?.slice(0, 4)).filter(Boolean))].sort().reverse(), [depenses]);
  const familles = useMemo(() => [...new Set(depenses.map(d => d.modele_famille_nom || d.categorie_famille).filter(Boolean))].sort(), [depenses]);
  const fournisseursUsed = useMemo(() => {
    const ids = [...new Set(depenses.map(d => d.fournisseur).filter(Boolean))];
    return fournisseurs.filter(f => ids.includes(f.id));
  }, [depenses, fournisseurs]);

  const modelesByFamille = useMemo(() => {
    const map = {};
    modeles.forEach(m => {
      const k = m.famille_nom || "—";
      if (!map[k]) map[k] = [];
      map[k].push(m);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [modeles]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} dépense{filtered.length !== 1 ? "s" : ""} — Total :{" "}
            <span className="font-semibold text-amber-600">
              {totalFiltered.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate("/familles-depense")}
            className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition border border-slate-200">
            Familles
          </button>
          <button onClick={() => navigate("/modeles-depense")}
            className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition border border-slate-200">
            Modèles
          </button>
          <button onClick={() => navigate("/comptes-comptables")}
            className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition border border-slate-200">
            Plan comptable
          </button>
          <button onClick={() => navigate("/fournisseurs")}
            className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition border border-slate-200">
            Fournisseurs
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow">
            + Nouvelle dépense
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
          <option value="">Toutes les années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterMois} onChange={e => setFilterMois(e.target.value)}>
          <option value="">Toutes périodes</option>
          {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterFamille} onChange={e => setFilterFamille(e.target.value)}>
          <option value="">Toutes familles</option>
          {familles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          value={filterFournisseur} onChange={e => setFilterFournisseur(e.target.value)}>
          <option value="">Tous fournisseurs</option>
          {fournisseursUsed.map(f => <option key={f.id} value={String(f.id)}>{f.nom_complet || f.nom}</option>)}
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

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Libellé</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Compte</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Famille / Modèle</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Fournisseur</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Montant</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucune dépense</td></tr>
                ) : filtered.map(dep => (
                  <tr key={dep.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div>{dep.date_depense}</div>
                      {dep.mois && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{dep.mois}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{dep.libelle}</div>
                      {dep.facture_reference && <div className="text-xs text-slate-400">Réf: {dep.facture_reference}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${dep.compte_code === "000" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"}`}>
                        {dep.compte_code}
                      </span>
                      <span className="ml-1 text-slate-500 text-xs">{dep.compte_libelle}</span>
                      {dep.compte_code === "000" && (
                        <span className="ml-1 text-[10px] font-bold text-orange-500 uppercase tracking-wide">⚠ à affecter</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dep.modele_famille_nom && (
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{dep.modele_famille_nom}</div>
                      )}
                      {dep.modele_nom
                        ? <span className="text-xs font-medium text-slate-700">{dep.modele_nom}</span>
                        : dep.categorie_nom
                          ? <span className="text-xs text-slate-500">{dep.categorie_nom}</span>
                          : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{dep.fournisseur_nom || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {parseFloat(dep.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(dep)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                      <button onClick={() => handleDelete(dep)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-50 border-t-2 border-amber-100">
                    <td colSpan={5} className="px-4 py-3 font-semibold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 whitespace-nowrap">
                      {totalFiltered.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {editItem ? "Modifier la dépense" : "Nouvelle dépense"}
            </h2>

            {/* Legend auto-fill */}
            <p className="text-[11px] text-blue-500 mb-4 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-blue-300 bg-blue-50" />
              Champ pré-rempli par le modèle — modifiable librement
            </p>

            <div className="space-y-4">

              {/* Modèle (assistant) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Modèle de dépense <span className="font-normal text-slate-400">(optionnel — pré-remplit les champs)</span>
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.modele_depense}
                  onChange={e => handleModeleChange(e.target.value)}
                >
                  <option value="">— Choisir un modèle —</option>
                  {modelesByFamille.map(([familleNom, items]) => (
                    <optgroup key={familleNom} label={familleNom}>
                      {items.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Libellé *
                  {autoFilled.libelle && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                </label>
                <input
                  className={autoFilled.libelle ? INPUT_AUTO : INPUT_NORMAL}
                  value={form.libelle}
                  onChange={e => { clearAuto("libelle"); setForm(f => ({ ...f, libelle: e.target.value })); }}
                  placeholder="Description courte de la dépense"
                />
              </div>

              {/* Compte | Fournisseur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Compte comptable
                    {autoFilled.compte && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                  </label>
                  <select
                    className={autoFilled.compte ? INPUT_AUTO : INPUT_NORMAL}
                    value={form.compte}
                    onChange={e => { clearAuto("compte"); setForm(f => ({ ...f, compte: e.target.value })); }}
                  >
                    <option value="">— Attente (000) —</option>
                    {comptes.filter(c => c.code !== "000").map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fournisseur
                    {autoFilled.fournisseur && <span className="ml-1.5 text-[10px] font-normal text-blue-400">pré-rempli</span>}
                  </label>
                  <select
                    className={autoFilled.fournisseur ? INPUT_AUTO : INPUT_NORMAL}
                    value={form.fournisseur}
                    onChange={e => { clearAuto("fournisseur"); setForm(f => ({ ...f, fournisseur: e.target.value })); }}
                  >
                    <option value="">— Aucun —</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                  </select>
                </div>
              </div>

              {/* Date | Période | Montant | Réf */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                  <input type="date"
                    className={INPUT_NORMAL}
                    value={form.date_depense}
                    onChange={e => setForm(f => ({ ...f, date_depense: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
                  <select className={INPUT_NORMAL}
                    value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}>
                    <option value="">— Mois —</option>
                    {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant (DH) *</label>
                  <input type="number" min="0.01" step="0.01"
                    className={INPUT_NORMAL}
                    value={form.montant}
                    onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Réf. facture</label>
                  <input className={INPUT_NORMAL}
                    value={form.facture_reference}
                    onChange={e => setForm(f => ({ ...f, facture_reference: e.target.value }))}
                    placeholder="FAC-2026-001"
                  />
                </div>
              </div>

              {/* Détail | Commentaire */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Détail</label>
                  <textarea rows={2} className={INPUT_NORMAL}
                    value={form.detail}
                    onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                    placeholder="Description détaillée (optionnel)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Commentaire interne</label>
                  <textarea rows={2} className={INPUT_NORMAL}
                    value={form.commentaire}
                    onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                    placeholder="Note interne…"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-4">
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

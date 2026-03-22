import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const EMPTY = { nom: "", famille_depense: "", compte_comptable: "", fournisseur: "", actif: true };

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400";

export default function ModelesDepensePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [modeles,      setModeles]      = useState([]);
  const [familles,     setFamilles]     = useState([]);
  const [comptes,      setComptes]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [filterFamille, setFilterFamille] = useState("");


  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/modeles-depense/",        { credentials: "include" }).then(r => r.json()),
      fetch("/api/familles-depense/",       { credentials: "include" }).then(r => r.json()),
      fetch("/api/comptes-comptables/?actif=true", { credentials: "include" }).then(r => r.json()),
      fetch("/api/fournisseurs/?actif=true", { credentials: "include" }).then(r => r.json()),
    ]).then(([mod, fam, cpt, fou]) => {
      setModeles(Array.isArray(mod) ? mod : (mod.results ?? []));
      setFamilles(Array.isArray(fam) ? fam : (fam.results ?? []));
      setComptes(Array.isArray(cpt) ? cpt : (cpt.results ?? []));
      setFournisseurs(Array.isArray(fou) ? fou : (fou.results ?? []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (location.state?.openForm) {
      openCreate();
      window.history.replaceState({}, "");
    }
  }, []);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = (m) => {
    setForm({
      nom: m.nom,
      famille_depense:  String(m.famille_depense  || ""),
      compte_comptable: String(m.compte_comptable || ""),
      fournisseur:      String(m.fournisseur      || ""),
      actif: m.actif,
    });
    setEditItem(m); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); };

  const handleSave = async () => {
    if (!form.nom.trim())         { setError("Le nom est obligatoire."); return; }
    if (!form.famille_depense)    { setError("La famille est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      nom:              form.nom.trim(),
      famille_depense:  form.famille_depense  || null,
      compte_comptable: form.compte_comptable || null,
      fournisseur:      form.fournisseur      || null,
      actif:            form.actif,
    };
    const url    = editItem ? `/api/modeles-depense/${editItem.id}/` : "/api/modeles-depense/";
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
      closeForm(); load();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m) => {
    if (!confirm(`Supprimer le modèle "${m.nom}" ?`)) return;
    await fetch(`/api/modeles-depense/${m.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    load();
  };


  const filtered = useMemo(() => {
    if (!filterFamille) return modeles;
    return modeles.filter(m => String(m.famille_depense) === filterFamille);
  }, [modeles, filterFamille]);

  // Group by famille for display
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      const key = m.famille_nom || "—";
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Modèles de dépenses</h1>
          <p className="text-xs text-slate-400 mt-0.5">Templates pré-remplis pour la saisie rapide des dépenses</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition shadow"
        >
          + Nouveau modèle
        </button>
      </div>

      {/* Filtre famille */}
      {familles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterFamille("")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${!filterFamille ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            Toutes
          </button>
          {familles.map(f => (
            <button key={f.id} onClick={() => setFilterFamille(String(f.id))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${filterFamille === String(f.id) ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              {f.nom}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          {/* Bouton retour uniquement en création */}
          {!editItem && (
            <button onClick={closeForm} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Retour
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-700 mb-4">{editItem ? "Modifier le modèle" : "Nouveau modèle"}</h2>
          <div className="space-y-3">
            {/* Nom */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nom *</label>
              <input autoFocus className={INPUT} placeholder="Ex : Facture électricité"
                value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            {/* Famille */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Famille *</label>
              <select className={INPUT} value={form.famille_depense}
                onChange={e => setForm(f => ({ ...f, famille_depense: e.target.value }))}>
                <option value="">— Choisir —</option>
                {familles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            {/* Compte comptable */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Compte comptable</label>
              <div className="flex gap-2">
                <select className={`flex-1 ${INPUT}`} value={form.compte_comptable}
                  onChange={e => setForm(f => ({ ...f, compte_comptable: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {comptes.filter(c => c.code !== "000").map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
                  ))}
                </select>
                <button type="button" onClick={() => navigate("/comptes-comptables", { state: { openForm: true } })}
                  title="Gérer le plan comptable"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">↗</button>
              </div>
            </div>
            {/* Fournisseur */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fournisseur par défaut</label>
              <div className="flex gap-2">
                <select className={`flex-1 ${INPUT}`} value={form.fournisseur}
                  onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom_complet || f.nom}</option>)}
                </select>
                <button type="button" onClick={() => navigate("/fournisseurs", { state: { openForm: true } })}
                  title="Gérer les fournisseurs"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition border border-slate-200 text-base">↗</button>
              </div>
            </div>
            {/* Actif */}
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="actif-chk" checked={form.actif}
                onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                className="w-4 h-4 accent-amber-500" />
              <label htmlFor="actif-chk" className="text-sm text-slate-700 cursor-pointer">Actif</label>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* List grouped by famille */}
      {loading ? (
        <div className="py-10 text-center text-slate-400 text-sm">Chargement…</div>
      ) : grouped.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">Aucun modèle défini.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([familleNom, items]) => (
            <div key={familleNom} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{familleNom}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-4 py-2 font-semibold">Modèle</th>
                    <th className="px-4 py-2 font-semibold">Compte</th>
                    <th className="px-4 py-2 font-semibold">Fournisseur</th>
                    <th className="px-4 py-2 font-semibold">Statut</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m, i) => (
                    <tr key={m.id} className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/40" : ""} ${!m.actif ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{m.nom}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {m.compte_code
                          ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{m.compte_code}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                        {m.compte_libelle && <span className="ml-1.5 text-xs">{m.compte_libelle}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{m.fournisseur_nom || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {m.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(m)} className="text-xs text-indigo-600 hover:underline mr-3">Modifier</button>
                        <button onClick={() => handleDelete(m)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

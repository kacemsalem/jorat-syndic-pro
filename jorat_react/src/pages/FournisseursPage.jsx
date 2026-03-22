import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";


function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition bg-white";

const EMPTY_FORM = { nom_societe: "", genre: "", nom: "", prenom: "", gsm: "", telephone: "", email: "", actif: true };

export default function FournisseursPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [editItem, setEditItem] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");

  const fetchFournisseurs = () => {
    setLoading(true);
    fetch("/api/fournisseurs/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setFournisseurs(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditItem(null); setError(""); setInfo(""); };

  const selectItem = (f) => {
    setEditItem(f);
    setForm({ nom_societe: f.nom_societe || "", genre: f.genre || "", nom: f.nom, prenom: f.prenom || "", gsm: f.gsm || "", telephone: f.telephone || "", email: f.email || "", actif: f.actif });
    setError(""); setInfo("");
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError("Le nom contact est obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    const url    = editItem ? `/api/fournisseurs/${editItem.id}/` : "/api/fournisseurs/";
    const method = editItem ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la sauvegarde.");
        return;
      }
      setInfo(editItem ? "Fournisseur modifié ✅" : "Fournisseur ajouté ✅");
      resetForm();
      fetchFournisseurs();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Supprimer "${f.nom_complet || f.nom}" ?`)) return;
    await fetch(`/api/fournisseurs/${f.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (editItem?.id === f.id) resetForm();
    fetchFournisseurs();
  };

  const filtered = search
    ? fournisseurs.filter(f =>
        (f.nom_complet || f.nom).toLowerCase().includes(search.toLowerCase()) ||
        f.nom_societe?.toLowerCase().includes(search.toLowerCase()) ||
        f.email?.toLowerCase().includes(search.toLowerCase()) ||
        f.gsm?.includes(search) ||
        f.telephone?.includes(search)
      )
    : fournisseurs;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/depenses", { state: { openForm: true } })}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Dépenses
          </button>
          <span className="text-slate-200">|</span>
          <button onClick={() => navigate("/modeles-depense", { state: { openForm: true } })}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
            ← Retour Modèles dépenses
          </button>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Fournisseurs</h1>
        <p className="text-xs text-slate-400 mt-0.5">{fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editItem ? "✏️ Modifier le fournisseur" : "➕ Nouveau fournisseur"}
            </h2>
            {editItem && (
              <button onClick={resetForm} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition">
                + Nouveau
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">⚠️ {error}</div>
          )}
          {info && (
            <div className="text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">{info}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nom de la société</label>
            <input className={inputCls} value={form.nom_societe}
              onChange={e => setForm(f => ({ ...f, nom_societe: e.target.value }))}
              placeholder="Raison sociale / nom entreprise" />
          </div>

          <div className="grid grid-cols-[80px_1fr_1fr] gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Genre</label>
              <select className={inputCls} value={form.genre}
                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
                <option value="">—</option>
                <option value="M">M.</option>
                <option value="Mme">Mme</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nom contact *</label>
              <input className={inputCls} value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="Nom du contact" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Prénom</label>
              <input className={inputCls} value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                placeholder="Prénom" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">GSM</label>
              <input className={inputCls} value={form.gsm}
                onChange={e => setForm(f => ({ ...f, gsm: e.target.value }))}
                placeholder="+212 6xx xxx xxx" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Téléphone fixe</label>
              <input className={inputCls} value={form.telephone}
                onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                placeholder="+212 5xx xxx xxx" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
            <input type="email" className={inputCls} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contact@fournisseur.ma" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif_f" checked={form.actif}
              onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
              className="w-4 h-4 accent-amber-500" />
            <label htmlFor="actif_f" className="text-sm text-slate-700">Actif</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
              {saving ? "Enregistrement…" : editItem ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </div>

        {/* ── Liste ── */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liste</h2>
            <input type="search" placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-200 w-40" />
          </div>

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-8">Chargement…</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">
                  {search ? "Aucun résultat." : "Aucun fournisseur enregistré."}
                </p>
              ) : filtered.map(f => {
                const contact = [f.genre === "M" ? "M." : f.genre, f.nom, f.prenom].filter(Boolean).join(" ");
                const initiale = (f.nom_societe || f.nom || "?")[0].toUpperCase();
                return (
                  <div key={f.id} onClick={() => selectItem(f)}
                    className={`rounded-xl border px-4 py-3 cursor-pointer transition flex items-center justify-between ${
                      editItem?.id === f.id
                        ? "bg-amber-50 border-amber-300"
                        : "hover:bg-slate-50 border-slate-200"
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {initiale}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                          {f.nom_societe || contact || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {f.nom_societe ? contact : (f.gsm || f.email || "—")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!f.actif && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">Inactif</span>}
                      <button onClick={e => { e.stopPropagation(); handleDelete(f); }}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

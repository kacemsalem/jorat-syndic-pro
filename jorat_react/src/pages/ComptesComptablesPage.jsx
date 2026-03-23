import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PLAN_DEFAUT from "../data/planComptableDefaut.json";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPE_OPTIONS = [
  { value: "CHARGE",     label: "Charge" },
  { value: "PRODUIT",    label: "Produit" },
  { value: "TRESORERIE", label: "Trésorerie" },
];

const TYPE_COLORS = {
  CHARGE:     "bg-red-100 text-red-700",
  PRODUIT:    "bg-emerald-100 text-emerald-700",
  TRESORERIE: "bg-blue-100 text-blue-700",
  RECETTE:    "bg-emerald-100 text-emerald-700",
  AUTRE:      "bg-slate-100 text-slate-600",
};

const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition bg-white";

const EMPTY_FORM = { code: "", libelle: "", type_compte: "CHARGE", actif: true };

export default function ComptesComptablesPage() {
  const navigate = useNavigate();

  const [comptes,  setComptes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [editItem, setEditItem] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [search,        setSearch]        = useState("");
  const [showPlanType,  setShowPlanType]  = useState(false);
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [injecting,     setInjecting]     = useState(false);
  const [injectInfo,    setInjectInfo]    = useState("");

  const fetchComptes = () => {
    setLoading(true);
    fetch("/api/comptes-comptables/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setComptes(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchComptes(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditItem(null); setError(""); setInfo(""); };

  const selectItem = (c) => {
    setEditItem(c);
    setForm({ code: c.code, libelle: c.libelle, type_compte: c.type_compte || "CHARGE", actif: c.actif });
    setError(""); setInfo("");
  };

  const handleSave = async () => {
    if (!form.code.trim())    { setError("Le code est obligatoire.");    return; }
    if (!form.libelle.trim()) { setError("Le libellé est obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    const url    = editItem ? `/api/comptes-comptables/${editItem.id}/` : "/api/comptes-comptables/";
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
      setInfo(editItem ? "Compte modifié ✅" : "Compte ajouté ✅");
      resetForm();
      fetchComptes();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Supprimer le compte "${c.code} - ${c.libelle}" ?`)) return;
    const res = await fetch(`/api/comptes-comptables/${c.id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(Object.values(data).flat().join(" ") || "Impossible de supprimer ce compte (utilisé dans des dépenses ou recettes).");
      return;
    }
    if (editItem?.id === c.id) resetForm();
    fetchComptes();
  };

  const filtered = search
    ? comptes.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.libelle.toLowerCase().includes(search.toLowerCase())
      )
    : comptes;

  const existingCodes = new Set(comptes.map(c => c.code));

  const allDefautComptes = PLAN_DEFAUT.flatMap(g => g.comptes);

  const toggleCode = (code) => setSelectedCodes(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const toggleGroupe = (comptes) => {
    const codes = comptes.map(c => c.code).filter(c => !existingCodes.has(c));
    const allSelected = codes.every(c => selectedCodes.has(c));
    setSelectedCodes(prev => {
      const next = new Set(prev);
      codes.forEach(c => allSelected ? next.delete(c) : next.add(c));
      return next;
    });
  };

  const handleInjecter = async () => {
    if (selectedCodes.size === 0) return;
    setInjecting(true); setInjectInfo("");
    const toCreate = allDefautComptes.filter(c => selectedCodes.has(c.code));
    let ok = 0;
    for (const c of toCreate) {
      try {
        const res = await fetch("/api/comptes-comptables/", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ code: c.code, libelle: c.libelle, type_compte: c.type_compte, actif: true }),
        });
        if (res.ok) ok++;
      } catch {}
    }
    setInjecting(false);
    setInjectInfo(`${ok} compte${ok > 1 ? "s" : ""} injecté${ok > 1 ? "s" : ""} ✅`);
    setSelectedCodes(new Set());
    fetchComptes();
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Plan comptable</h1>
            <p className="text-xs text-slate-400 mt-0.5">{comptes.length} compte{comptes.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { setShowPlanType(v => !v); setInjectInfo(""); setSelectedCodes(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border shadow-sm ${showPlanType ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Plan type
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editItem ? "✏️ Modifier le compte" : "➕ Nouveau compte"}
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Code *</label>
            <input className={inputCls} value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="Ex: 615, 626, 702…" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Libellé *</label>
            <input className={inputCls} value={form.libelle}
              onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
              placeholder="Ex: Entretien et réparations…" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type *</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type_compte: opt.value }))}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    form.type_compte === opt.value
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="actif_c" checked={form.actif}
              onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
              className="w-4 h-4 accent-amber-500" />
            <label htmlFor="actif_c" className="text-sm text-slate-700">Actif</label>
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
                  {search ? "Aucun résultat." : "Aucun compte enregistré."}
                </p>
              ) : filtered.map(c => (
                <div key={c.id} onClick={() => selectItem(c)}
                  className={`rounded-xl border px-4 py-3 cursor-pointer transition flex items-center justify-between ${
                    editItem?.id === c.id
                      ? "bg-amber-50 border-amber-300"
                      : "hover:bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-mono text-xs font-bold text-amber-700 shrink-0">
                      {c.code}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">{c.libelle}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[c.type_compte] || "bg-slate-100 text-slate-500"}`}>
                          {TYPE_OPTIONS.find(o => o.value === c.type_compte)?.label ?? c.type_compte}
                        </span>
                        {!c.actif && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400">Inactif</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(c); }}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Plan type intrinsèque ── */}
      {showPlanType && (
        <div className="mt-5 bg-white rounded-2xl shadow border border-indigo-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-700">Plan comptable type — Syndic</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cochez les comptes à injecter dans votre plan. Les comptes déjà présents sont grisés.</p>
            </div>
            <div className="flex items-center gap-3">
              {injectInfo && <span className="text-xs text-emerald-600 font-semibold">{injectInfo}</span>}
              <button onClick={handleInjecter} disabled={injecting || selectedCodes.size === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition">
                {injecting ? "Injection…" : `Injecter ${selectedCodes.size > 0 ? `(${selectedCodes.size})` : ""}`}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {PLAN_DEFAUT.map(groupe => {
              const disponibles = groupe.comptes.filter(c => !existingCodes.has(c.code));
              const deja        = groupe.comptes.filter(c => existingCodes.has(c.code));
              const allSel      = disponibles.length > 0 && disponibles.every(c => selectedCodes.has(c.code));
              return (
                <div key={groupe.groupe}>
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => toggleGroupe(groupe.comptes)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${allSel ? "bg-indigo-600 border-indigo-600" : "border-slate-300 hover:border-indigo-400"}`}>
                      {allSel && <svg width="9" height="9" viewBox="0 0 12 12" fill="white"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{groupe.groupe}</span>
                    {disponibles.length === 0 && <span className="text-[10px] text-emerald-500 font-semibold">✓ Tous présents</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                    {groupe.comptes.map(c => {
                      const exists = existingCodes.has(c.code);
                      const sel    = selectedCodes.has(c.code);
                      return (
                        <label key={c.code}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition text-xs ${
                            exists ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                   : sel ? "border-indigo-300 bg-indigo-50" : "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40"
                          }`}>
                          <input type="checkbox" checked={sel || exists} disabled={exists}
                            onChange={() => !exists && toggleCode(c.code)}
                            className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-mono text-slate-500 w-9 shrink-0">{c.code}</span>
                          <span className={`flex-1 ${exists ? "text-slate-400" : "text-slate-700"}`}>{c.libelle}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${TYPE_COLORS[c.type_compte] || "bg-slate-100 text-slate-500"}`}>
                            {c.type_compte}
                          </span>
                          {exists && <span className="text-[9px] text-emerald-500 font-bold">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { postJson, patchJson, deleteJson } from "../api";

const API_BASE = "/api";

const inputCls  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white";
const selectCls = inputCls;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const emptyForm = {
  type_personne: "PHYSIQUE",
  nom:           "",
  prenom:        "",
  cin:           "",
  telephone:     "",
  email:         "",
};

export default function PersonnesPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const residenceId     = searchParams.get("residence");

  const [personnes, setPersonnes] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [info, setInfo]           = useState("");
  const [search, setSearch]       = useState("");

  // ── Chargement ────────────────────────────────────────────
  const loadPersonnes = async () => {
    const res  = await fetch(`${API_BASE}/personnes/?residence=${residenceId}`, { credentials: "include" });
    const data = await res.json();
    setPersonnes(data.results ?? data);
  };

  useEffect(() => {
    if (residenceId) loadPersonnes();
  }, [residenceId]);

  // ── Save ─────────────────────────────────────────────────
  const save = async () => {
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    const url = editing
      ? `${API_BASE}/personnes/${editing.id}/`
      : `${API_BASE}/personnes/`;
    try {
      const payload = { ...form, residence: Number(residenceId) };
      const r = editing
        ? await patchJson(url, payload)
        : await postJson(url, payload);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const detail = Object.values(body).flat().join(" ") || `Erreur ${r.status}`;
        setError(detail);
        return;
      }
      setInfo(editing ? "Contact modifié ✅" : "Contact ajouté ✅");
      resetForm();
      loadPersonnes();
    } catch {
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer ${p.nom} ${p.prenom} ?`)) return;
    setError(""); setInfo("");
    try {
      const r = await deleteJson(`${API_BASE}/personnes/${p.id}/`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.detail || Object.values(body).flat().join(" ") || `Erreur ${r.status}`);
        return;
      }
      if (selected?.id === p.id) resetForm();
      loadPersonnes();
    } catch {
      setError("Erreur réseau lors de la suppression.");
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setSelected(null);
    setError("");
  };

  const selectPersonne = (p) => {
    setSelected(p);
    setEditing(p);
    setForm({
      type_personne: p.type_personne ?? "PHYSIQUE",
      nom:           p.nom           ?? "",
      prenom:        p.prenom        ?? "",
      cin:           p.cin           ?? "",
      telephone:     p.telephone     ?? "",
      email:         p.email         ?? "",
    });
    setError(""); setInfo("");
  };

  // ── Filtrage ─────────────────────────────────────────────
  const personnesFiltrees = personnes.filter((p) =>
    `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.telephone ?? "").includes(search) ||
    (p.email     ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour Lot
          </button>
          <h1 className="text-xl font-bold text-slate-800">Contacts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {personnes.length} contact{personnes.length > 1 ? "s" : ""} dans cette résidence
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Formulaire ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {editing ? "✏️ Modifier le contact" : "➕ Nouveau contact"}
            </h2>
            {editing && (
              <button
                onClick={resetForm}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition"
              >
                + Nouveau
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              ⚠️ {error}
            </div>
          )}
          {info && (
            <div className="text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">
              {info}
            </div>
          )}

          {/* Type */}
          <Field label="Type de personne">
            <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm">
              {[
                { value: "PHYSIQUE", label: "👤 Physique" },
                { value: "MORALE",   label: "🏢 Morale"   },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type_personne: opt.value }))}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    form.type_personne === opt.value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Nom + Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nom *">
              <input
                className={inputCls}
                placeholder="Nom"
                value={form.nom}
                onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
              />
            </Field>
            <Field label="Prénom">
              <input
                className={inputCls}
                placeholder="Prénom"
                value={form.prenom}
                onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
              />
            </Field>
          </div>

          {/* CIN */}
          <Field label="CIN / ICE">
            <input
              className={inputCls}
              placeholder="ex : AB123456"
              value={form.cin}
              onChange={(e) => setForm((p) => ({ ...p, cin: e.target.value }))}
            />
          </Field>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone">
              <input
                className={inputCls}
                placeholder="+212 6XX XXX XXX"
                value={form.telephone}
                onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                placeholder="email@exemple.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : editing ? "Modifier" : "Ajouter"}
            </button>
          </div>

        </div>

        {/* ── Liste ── */}
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-3">

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Liste
            </h2>
            <input
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-40"
            />
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {personnesFiltrees.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                {search ? "Aucun résultat." : "Aucun contact enregistré."}
              </p>
            ) : (
              personnesFiltrees.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectPersonne(p)}
                  className={`rounded-xl border px-4 py-3 cursor-pointer transition flex items-center justify-between ${
                    selected?.id === p.id
                      ? "bg-indigo-50 border-indigo-300"
                      : "hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      p.type_personne === "MORALE"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}>
                      {p.type_personne === "MORALE" ? "🏢" : (p.nom?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {p.nom} {p.prenom}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.telephone || p.email || p.cin || "—"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); remove(p); }}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
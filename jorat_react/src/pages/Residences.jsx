import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "/api";

async function fetchJson(url, options = {}) {
  const csrfToken = document.cookie
    .split("; ")
    .find(r => r.startsWith("csrftoken="))
    ?.split("=")[1];

  const isFormData = options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "X-CSRFToken": csrfToken || "",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}
    </label>
    {children}
  </div>
);


export default function Residences() {
  const navigate = useNavigate();

  const [residence, setResidence] = useState(null);
  const [form, setForm]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [info, setInfo]           = useState("");
  const [logoFile, setLogoFile]   = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const inputCls  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchJson(`${API_BASE}/residences/`);
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      const r = list[0] ?? null;
      setResidence(r);
      if (r) setForm({
        nom_residence:         r.nom_residence         ?? "",
        ville_residence:       r.ville_residence       ?? "",
        adresse_residence:     r.adresse_residence     ?? "",
        code_postal_residence: r.code_postal_residence ?? "",
        statut_residence:      r.statut_residence      ?? "ACTIF",
        description:           r.description           ?? "",
      });
    } catch (e) {
      setError(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!residence?.id) return;
    setSaving(true); setError(""); setInfo("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v ?? ""));
      if (logoFile) body.append("logo", logoFile);
      await fetchJson(`${API_BASE}/residences/${residence.id}/`, {
        method: "PATCH",
        body,
      });
      setInfo("Modifications enregistrées ✅");
      setLogoFile(null);
      await load();
    } catch (e) {
      setError(e.message || "Erreur modification");
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence || !form) return (
    <div className="max-w-xl mx-auto mt-16 text-center text-slate-400">
      <p className="text-lg font-semibold">Aucune résidence assignée.</p>
      <p className="text-sm mt-1">Contactez un administrateur.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{residence.nom_residence}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {residence.ville_residence}{residence.code_postal_residence ? ` — ${residence.code_postal_residence}` : ""}
            {" · "}{residence.nombre_lots ?? 0} lot{(residence.nombre_lots ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/kanban")}
            className="text-sm px-3 py-1.5 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition"
          >
            Gérer les lots →
          </button>
<span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            residence.statut_residence === "ACTIF" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}>
            {residence.statut_residence}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-bold text-slate-800 mb-5">Modifier la résidence</h2>

        {error && (
          <div className="mb-4 text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            ⚠️ {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Ligne 1 : Nom */}
          <Field label="Nom de la résidence *">
            <input className={inputCls} value={form.nom_residence}
              onChange={set("nom_residence")} required
              placeholder="ex : Résidence Les Oliviers" />
          </Field>

          {/* Ligne 2 : Adresse + Ville + CP */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Field label="Adresse">
                <input className={inputCls} value={form.adresse_residence}
                  onChange={set("adresse_residence")} placeholder="123 rue des Fleurs" />
              </Field>
            </div>
            <Field label="Ville *">
              <input className={inputCls} value={form.ville_residence}
                onChange={set("ville_residence")} required placeholder="Casablanca" />
            </Field>
            <Field label="Code postal">
              <input className={inputCls} value={form.code_postal_residence}
                onChange={set("code_postal_residence")} placeholder="20000" />
            </Field>
          </div>

          {/* Ligne 3 : Description + Logo côte à côte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Description">
              <textarea className={`${inputCls} resize-none`} rows={2}
                value={form.description} onChange={set("description")}
                placeholder="Informations complémentaires…" />
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-3 h-full">
                {(logoPreview || residence?.logo) && (
                  <img
                    src={logoPreview ?? residence.logo}
                    alt="logo"
                    className="h-12 w-12 rounded-xl object-contain border border-slate-200 bg-slate-50 p-1 flex-shrink-0"
                  />
                )}
                <label className="flex-1 flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition">
                  <span>📷</span>
                  <span className="truncate">{logoFile ? logoFile.name : "Choisir une image…"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
            </Field>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => load()}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

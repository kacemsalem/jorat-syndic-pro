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
    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
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
  const [showPwd, setShowPwd]     = useState(false);

  const inputCls  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition bg-white";

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
        email:                 r.email                 ?? "",
        email_password:        r.email_password        ?? "",
        statut_residence:      r.statut_residence      ?? "ACTIF",
        description:           r.description           ?? "",
        logo_base64:           null,
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
    if (file.size > 100 * 1024) {
      setError("Le logo ne doit pas dépasser 100 Ko. Compressez l'image avant de l'envoyer.");
      e.target.value = "";
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setLogoPreview(evt.target.result);
      setForm(f => ({ ...f, logo_base64: evt.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!residence?.id) return;
    setSaving(true); setError(""); setInfo("");
    try {
      const payload = {
        nom_residence:         form.nom_residence,
        ville_residence:       form.ville_residence,
        adresse_residence:     form.adresse_residence,
        code_postal_residence: form.code_postal_residence,
        email:                 form.email,
        email_password:        form.email_password || null,
        statut_residence:      form.statut_residence,
        description:           form.description,
      };
      if (form.logo_base64) payload.logo_base64 = form.logo_base64;
      await fetchJson(`${API_BASE}/residences/${residence.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setInfo("Modifications enregistrées ✅");
      setLogoFile(null);
      setLogoPreview(null);
      setForm(f => ({ ...f, logo_base64: null }));
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
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!residence || !form) return (
    <div className="max-w-xl mx-auto mt-16 text-center text-slate-400">
      <p className="text-lg font-semibold">Aucune résidence assignée.</p>
      <p className="text-sm mt-1">Contactez un administrateur.</p>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Résidence</p>
            <h1 className="text-white font-bold text-lg leading-tight">{residence.nom_residence}</h1>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-2">
          {residence.ville_residence}{residence.code_postal_residence ? ` ${residence.code_postal_residence}` : ""}
          {" · "}{residence.nombre_lots ?? 0} lot{(residence.nombre_lots ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        {error && (
          <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            ⚠️ {error}
          </div>
        )}
        {info && (
          <div className="text-xs rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2">
            {info}
          </div>
        )}

        {/* Edit form */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Nom */}
            <Field label="Nom de la résidence *">
              <input className={inputCls} value={form.nom_residence}
                onChange={set("nom_residence")} required
                placeholder="ex : Résidence Les Oliviers" />
            </Field>

            {/* Adresse */}
            <Field label="Adresse">
              <input className={inputCls} value={form.adresse_residence}
                onChange={set("adresse_residence")} placeholder="123 rue des Fleurs" />
            </Field>

            {/* Ville + CP sur une ligne */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville *">
                <input className={inputCls} value={form.ville_residence}
                  onChange={set("ville_residence")} required placeholder="Casablanca" />
              </Field>
              <Field label="Code postal">
                <input className={inputCls} value={form.code_postal_residence}
                  onChange={set("code_postal_residence")} placeholder="20000" />
              </Field>
            </div>

            {/* Email + SMTP sur une ligne */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email expéditeur">
                <input type="email" className={inputCls} value={form.email}
                  onChange={set("email")} placeholder="contact@residence.ma" />
              </Field>
              <Field label="Mot de passe SMTP">
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    className={`${inputCls} pr-9`}
                    value={form.email_password}
                    onChange={set("email_password")}
                    placeholder="Mot de passe d'application Gmail…"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    {showPwd
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Gmail : Compte → Sécurité → Mots de passe des applications</p>
              </Field>
            </div>

            {/* Description + Logo */}
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

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => load()}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

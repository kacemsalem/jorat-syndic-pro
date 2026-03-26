import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";

/* ── Modal reset mot de passe ───────────────────────── */
function PasswordModal({ admin, onClose, onSaved }) {
  const [pw, setPw]     = useState("");
  const [msg, setMsg]   = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pw.length < 6) { setMsg("Minimum 6 caractères."); return; }
    setSaving(true);
    const r = await fetch("/api/superuser/set-password/", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ user_id: admin.id, password: pw }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { onSaved(d.detail); onClose(); }
    else setMsg(d.detail || "Erreur.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Réinitialiser le mot de passe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
        <p className="text-xs text-slate-500">Utilisateur : <strong>{admin.username}</strong></p>
        {msg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{msg}</p>}
        <input type="password" className={INPUT} placeholder="Nouveau mot de passe (≥ 6 car.)"
          value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()} />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "…" : "Enregistrer"}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function AppDocsButton({ onLoaded }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const load = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch("/api/ai/load-app-docs/", {
        method: "POST", credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
      });
      const d = await r.json().catch(() => ({}));
      setLoading(false);
      const text = (d.detail || (r.ok ? "Chargé avec succès." : "Erreur inconnue."))
        + (d.taille_texte ? ` (${Math.round(d.taille_texte / 1000)} k car.)` : "");
      setMsg({ ok: r.ok, text });
      // Rafraîchir la liste APRÈS que le message soit visible (3 s)
      setTimeout(() => { setMsg(null); if (r.ok && onLoaded) onLoaded(); }, 3000);
    } catch (e) {
      setLoading(false);
      setMsg({ ok: false, text: "Erreur réseau : " + e.message });
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={load} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-200 disabled:opacity-50 transition">
        {loading ? "Chargement…" : "⚡ Charger la doc de l'application"}
      </button>
      {msg && (
        <span className={`text-[10px] font-medium ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}

const MODELS_GROQ = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

/* ── Panneau config IA globale (identique à /parametrage/ia) ── */
function AIConfigPanel() {
  const fileRef     = useRef(null);
  const [docs,      setDocs]      = useState([]);
  const [config,    setConfig]    = useState({ system_prompt: "", api_url: "", api_key: "", model_name: "" });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [nomDoc,    setNomDoc]    = useState("");

  const load = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/ai/documents/",        { credentials: "include" }),
      fetch("/api/superuser/ai-config/", { credentials: "include" }),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    setDocs(Array.isArray(d1) ? d1 : []);
    setConfig({ ...d2, api_key: "", _key_saved: d2.api_key === "***" });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("fichier", file);
    fd.append("nom", nomDoc || file.name.replace(".pdf", ""));
    await fetch("/api/ai/documents/", {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
      body: fd,
    });
    setNomDoc(""); fileRef.current.value = "";
    await load(); setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    await fetch(`/api/ai/documents/${id}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleToggle = async (doc) => {
    await fetch(`/api/ai/documents/${doc.id}/`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ actif: !doc.actif }),
    });
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, actif: !d.actif } : d));
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    const r = await fetch("/api/superuser/ai-config/", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await r.json().catch(() => ({}));
      setSaveError(d.detail || `Erreur ${r.status}`);
      setTimeout(() => setSaveError(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Configuration API */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration API</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <strong>Recommandé (gratuit) :</strong> Créez un compte sur{" "}
          <span className="font-mono">console.groq.com</span> → API Keys → Créer une clé.
          Modèle suggéré : <span className="font-mono">llama-3.1-8b-instant</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">URL de l'API</label>
            <input className={INPUT} value={config.api_url}
              onChange={e => setConfig(c => ({ ...c, api_url: e.target.value }))}
              placeholder="https://api.groq.com/openai/v1/chat/completions" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Clé API</label>
            {config._key_saved && !config.api_key && (
              <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-600 text-sm">✓</span>
                <span className="text-xs text-emerald-700 font-semibold">Clé API enregistrée</span>
                <span className="text-xs text-emerald-500 ml-1">— laissez vide pour conserver, ou saisissez une nouvelle clé pour remplacer</span>
              </div>
            )}
            <input type="password" className={INPUT} value={config.api_key}
              onChange={e => setConfig(c => ({ ...c, api_key: e.target.value }))}
              placeholder={config._key_saved ? "Laisser vide = conserver la clé actuelle" : "gsk_…"} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modèle</label>
            <div className="flex gap-2">
              <select className={INPUT} value={config.model_name}
                onChange={e => setConfig(c => ({ ...c, model_name: e.target.value }))}>
                {MODELS_GROQ.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className={INPUT + " w-64"} value={config.model_name}
                onChange={e => setConfig(c => ({ ...c, model_name: e.target.value }))}
                placeholder="ou saisir manuellement" />
            </div>
          </div>
        </div>
      </div>

      {/* Instructions système */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instructions système</h2>
        <p className="text-xs text-slate-500">Définissez le comportement de l'IA : ton, règles à respecter, domaine d'expertise.</p>
        <textarea rows={6} className={INPUT + " resize-none font-mono text-xs"}
          value={config.system_prompt}
          onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
          placeholder="Ex: Tu es l'assistant IA de Syndic Pro. Tu réponds toujours en français…" />
      </div>

      {/* Bouton sauvegarder */}
      {saveError && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
          ✕ Erreur : {saveError}
        </div>
      )}
      <button onClick={handleSave} disabled={saving}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
          saved ? "bg-emerald-500 text-white" : saveError ? "bg-red-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50`}>
        {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Sauvegarder la configuration"}
      </button>

      {/* Documents de référence */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documents de référence (PDF)</h2>
          <AppDocsButton onLoaded={load} />
        </div>
        <p className="text-xs text-slate-500">Les documents actifs sont utilisés par l'IA. Règlement de copropriété, lois, procédures, etc.</p>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex gap-2">
            <input className={INPUT} placeholder="Nom du document (optionnel)"
              value={nomDoc} onChange={e => setNomDoc(e.target.value)} />
          </div>
          <div className="flex gap-2 items-center">
            <input ref={fileRef} type="file" accept=".pdf"
              className="text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:font-semibold file:cursor-pointer"
              onChange={handleUpload} disabled={uploading} />
            {uploading && <span className="text-xs text-slate-400">Traitement…</span>}
          </div>
        </div>
        {docs.length === 0 ? (
          <div className="text-center py-8 text-slate-300 text-xs border border-dashed border-slate-200 rounded-xl">
            Aucun document uploadé
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                  doc.actif ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"
                }`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  className="w-5 h-5 text-red-400 shrink-0" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.nom}</p>
                  <p className="text-[10px] text-slate-400">
                    {doc.date_upload} · {(doc.taille_texte / 1000).toFixed(1)} k caractères extraits
                  </p>
                </div>
                <button onClick={() => handleToggle(doc)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${
                    doc.actif ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  }`}>
                  {doc.actif ? "Actif" : "Inactif"}
                </button>
                <button onClick={() => handleDelete(doc.id)}
                  className="text-slate-300 hover:text-red-500 transition text-sm shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sécurité */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sécurité & Confidentialité</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>✅ L'IA n'a aucun accès direct à votre base de données</li>
          <li>✅ Seuls des résumés calculés par le backend sont envoyés</li>
          <li>✅ Aucune donnée brute n'est transmise au modèle LLM</li>
          <li>✅ La clé API est stockée uniquement sur votre serveur</li>
        </ul>
      </div>

    </div>
  );
}

/* ── Modal créer résidence + admin ─────────────────── */
function CreateResidenceModal({ onClose, onCreated }) {
  const EMPTY = { nom_residence: "", ville_residence: "", username: "", password: "", email: "" };
  const [form, setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setErrors({});
    const r = await fetch("/api/setup/", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { onCreated("Résidence « " + form.nom_residence + " » créée."); onClose(); }
    else setErrors(typeof d === "object" ? d : { detail: JSON.stringify(d) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-slate-700">Nouvelle résidence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        {errors.detail && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{errors.detail}</p>
        )}

        <div className="bg-slate-50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Résidence</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nom *</label>
            <input className={INPUT} value={form.nom_residence} onChange={f("nom_residence")} />
            {errors.nom_residence && <p className="text-[10px] text-red-600 mt-0.5">{errors.nom_residence}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Ville *</label>
            <input className={INPUT} value={form.ville_residence} onChange={f("ville_residence")} />
            {errors.ville_residence && <p className="text-[10px] text-red-600 mt-0.5">{errors.ville_residence}</p>}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Administrateur</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nom d'utilisateur *</label>
            <input className={INPUT} value={form.username} onChange={f("username")} />
            {errors.username && <p className="text-[10px] text-red-600 mt-0.5">{errors.username}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Mot de passe (≥ 6 car.) *</label>
            <input type="password" className={INPUT} value={form.password} onChange={f("password")} />
            {errors.password && <p className="text-[10px] text-red-600 mt-0.5">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email (optionnel)</label>
            <input type="email" className={INPUT} value={form.email} onChange={f("email")} />
            {errors.email && <p className="text-[10px] text-red-600 mt-0.5">{errors.email}</p>}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Création…" : "Créer"}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ────────────────────────────────── */
export default function SuperuserDashboardPage() {
  const navigate = useNavigate();
  const [residences, setResidences] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pwModal, setPwModal]         = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [toast, setToast]           = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = () => {
    setLoading(true);
    fetch("/api/superuser/residences/", { credentials: "include" })
      .then(r => { if (r.status === 403) { navigate("/login"); return null; } return r.json(); })
      .then(d => { if (d) setResidences(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [navigate]); // eslint-disable-line

  const logout = async () => {
    await fetch("/api/logout/", {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    localStorage.removeItem("syndic_user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {pwModal && (
        <PasswordModal
          admin={pwModal.admin}
          onClose={() => setPwModal(null)}
          onSaved={msg => showToast(msg)}
        />
      )}

      {createModal && (
        <CreateResidenceModal
          onClose={() => setCreateModal(false)}
          onCreated={msg => { showToast(msg); load(); }}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
              <circle cx="19" cy="19" r="3"/><line x1="21" y1="21" x2="19.5" y2="19.5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Syndic Pro — Administration</h1>
            <p className="text-[10px] text-slate-400">Superuser</p>
          </div>
        </div>
        <button onClick={logout}
          className="text-xs text-slate-500 hover:text-red-600 font-medium transition px-3 py-1.5 rounded-lg hover:bg-red-50">
          Déconnexion
        </button>
      </div>

      {/* Contenu */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── Section Configuration IA ─────────────────── */}
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-violet-50 border-b border-violet-100">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Configuration IA — globale</span>
          </div>
          <div className="p-5">
            <AIConfigPanel />
          </div>
        </div>

        {/* ── Section Résidences ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                Gestion des résidences
                <span className="ml-2 normal-case font-normal text-slate-400">({residences.length})</span>
              </span>
            </div>
            <button onClick={() => setCreateModal(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
              + Nouvelle résidence
            </button>
          </div>
          <div className="p-5 space-y-3">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : residences.length === 0 ? (
          <div className="text-center py-16 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl text-sm">
            Aucune résidence
          </div>
        ) : (
          <div className="space-y-3">
            {residences.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">

                  {/* Infos résidence */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-800">{r.nom}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                        {r.nb_lots} lot{r.nb_lots !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{r.ville || "—"}</p>
                    <p className="text-[10px] text-slate-300">Créée le {r.created_at || "—"}</p>
                  </div>

                </div>

                {/* Admins */}
                {r.admins.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Administrateurs</p>
                    <div className="space-y-1.5">
                      {r.admins.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2">
                          <div>
                            <span className="text-xs font-bold text-slate-700">{a.username}</span>
                            {a.email && <span className="text-[10px] text-slate-400 ml-2">{a.email}</span>}
                          </div>
                          <button onClick={() => setPwModal({ admin: a, residence: r })}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                            🔑 Changer MP
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 pt-3 border-t border-slate-50 text-[10px] text-slate-300">Aucun administrateur actif</p>
                )}
              </div>
            ))}
          </div>
        )}
        </div>{/* fin p-5 section résidences */}
        </div>{/* fin card résidences */}

      </div>
    </div>
  );
}

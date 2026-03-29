import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";

function AppDocsButton({ onLoaded }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const load = async () => {
    setLoading(true); setMsg(null);
    try {
      const activeRid = localStorage.getItem("active_residence") || "";
      const r = await fetch("/api/ai/load-app-docs/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(activeRid ? { residence_id: activeRid } : {}),
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

const PRESETS = [
  { label: "DeepSeek Chat",    model: "deepseek-chat",             url: "https://api.deepseek.com/v1",                              badge: "Recommandé", badgeColor: "bg-emerald-100 text-emerald-700" },
  { label: "Gemini 2.0 Flash", model: "gemini-2.0-flash",         url: "https://generativelanguage.googleapis.com/v1beta/openai/", badge: "Gratuit",    badgeColor: "bg-blue-100 text-blue-700" },
  { label: "Gemini 1.5 Flash", model: "gemini-1.5-flash",         url: "https://generativelanguage.googleapis.com/v1beta/openai/", badge: "Gratuit",    badgeColor: "bg-blue-100 text-blue-700" },
  { label: "Llama 3.3 70B",    model: "llama-3.3-70b-versatile",  url: "https://api.groq.com/openai/v1",                           badge: "Rapide",     badgeColor: "bg-indigo-100 text-indigo-700" },
  { label: "Llama 3.1 8B",     model: "llama-3.1-8b-instant",     url: "https://api.groq.com/openai/v1",                           badge: "Léger",      badgeColor: "bg-slate-100 text-slate-600" },
  { label: "Llama 3 70B",      model: "llama3-70b-8192",          url: "https://api.groq.com/openai/v1",                           badge: "Groq",       badgeColor: "bg-slate-100 text-slate-600" },
];

export default function IASettingsPage() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);
  const [docs,     setDocs]     = useState([]);
  const [config,   setConfig]   = useState({ system_prompt: "", api_url: "", api_key: "", model_name: "" });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [saved,    setSaved]    = useState(false);
  const [nomDoc,   setNomDoc]   = useState("");

  const rid = localStorage.getItem("active_residence") || "";
  const ridParam = rid ? `?residence_id=${rid}` : "";

  const load = async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/ai/documents/${ridParam}`,  { credentials: "include" }),
      fetch("/api/ai/config/",                { credentials: "include" }),
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
    setNomDoc("");
    fileRef.current.value = "";
    await load();
    setUploading(false);
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

  const [saveError, setSaveError] = useState(null);

  const handleSaveConfig = async () => {
    setSaving(true); setSaveError(null);
    const r = await fetch("/api/ai/config/", {
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
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/accueil")}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium transition">
          ← Tableau de bord
        </button>
        <button onClick={() => navigate("/ia/chat")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Ouvrir le chat IA
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-800">Paramétrage IA</h1>
        <p className="text-xs text-slate-400 mt-0.5">Configurez l'assistant IA de votre résidence</p>
      </div>

      {/* ── Configuration API ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration API</h2>

        {/* Préréglages rapides */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sélection rapide</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.model} type="button"
                onClick={() => setConfig(c => ({ ...c, model_name: p.model, api_url: p.url }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  config.model_name === p.model
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                }`}>
                {p.label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${p.badgeColor}`}>{p.badge}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Cliquer remplit automatiquement URL + modèle · DeepSeek → <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-indigo-500 underline">platform.deepseek.com</a> · Gemini → <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 underline">aistudio.google.com</a> · Groq → <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-500 underline">console.groq.com</a>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">URL de l'API</label>
            <input className={INPUT} value={config.api_url}
              onChange={e => setConfig(c => ({ ...c, api_url: e.target.value }))}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai/" />
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
              placeholder={config._key_saved ? "Laisser vide = conserver la clé actuelle" : "AIza… (Gemini) ou gsk_… (Groq)"} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modèle <span className="font-normal text-slate-400">(saisie libre)</span></label>
            <input className={INPUT} value={config.model_name}
              onChange={e => setConfig(c => ({ ...c, model_name: e.target.value }))}
              placeholder="gemini-2.0-flash" />
          </div>
        </div>
      </div>

      {/* ── Prompt système ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instructions système</h2>
        <p className="text-xs text-slate-500">
          Définissez le comportement de l'IA : ton, règles à respecter, domaine d'expertise.
        </p>
        <textarea rows={6} className={INPUT + " resize-none font-mono text-xs"}
          value={config.system_prompt}
          onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
          placeholder="Ex: Tu es l'assistant IA du Syndic Pro de la résidence X. Tu réponds toujours en français…" />
      </div>

      {/* Save button */}
      {saveError && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
          ✕ Erreur : {saveError}
        </div>
      )}
      <button onClick={handleSaveConfig} disabled={saving}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
          saved ? "bg-emerald-500 text-white" : saveError ? "bg-red-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50`}>
        {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Sauvegarder la configuration"}
      </button>

      {/* ── Documents PDF ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documents de référence (PDF)</h2>
          <AppDocsButton onLoaded={load} />
        </div>
        <p className="text-xs text-slate-500">
          Les documents actifs sont utilisés par l'IA pour répondre aux questions.
          Règlement de copropriété, lois, procédures, etc.
        </p>

        {/* Upload */}
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

        {/* Liste documents */}
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
                    doc.actif
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-200 text-slate-500 hover:bg-slate-300"
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

      {/* Sécurité info */}
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

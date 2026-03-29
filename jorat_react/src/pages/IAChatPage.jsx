import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            className="w-4 h-4 text-indigo-600" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-indigo-600 text-white rounded-br-sm"
          : "bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm"
      }`}>
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mr-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          className="w-4 h-4 text-indigo-600" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </div>
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Quelle est la situation financière de la résidence ?",
  "Quels sont les lots avec des impayés ?",
  "Quel est le solde de caisse actuel ?",
  "Explique-moi la procédure de relance des impayés",
  "Quelles sont les dépenses totales enregistrées ?",
];

function InfoModal({ onClose, onSettings }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-5 pb-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">À propos de l'Assistant IA</h2>
              <p className="text-white/60 text-[10px]">Configuration · Documents · Modèles</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Section 1 — Configuration */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              <p className="text-xs font-bold text-amber-800">Paramétrage du modèle IA</p>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              L'administrateur peut configurer l'IA dans les paramètres : <strong>URL du serveur</strong>, <strong>clé API</strong> et <strong>modèle LLM</strong>. Cette configuration permet de connecter n'importe quel fournisseur compatible (OpenAI, Ollama, Mistral, etc.).
            </p>
          </div>

          {/* Section 2 — Modèles performants */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <p className="text-xs font-bold text-indigo-800">Des modèles plus puissants = de meilleurs résultats</p>
            </div>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Les modèles avancés (GPT-4, Claude, Mistral Large…) comprennent mieux le contexte financier, formulent des analyses plus précises et commettent moins d'erreurs. Un modèle local basique reste utile pour des questions simples.
            </p>
          </div>

          {/* Section 3 — Documents */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <p className="text-xs font-bold text-emerald-800">Charger des documents utiles</p>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Dans <strong>Paramétrage → Assistant IA</strong>, vous pouvez importer des documents de référence (règlement intérieur, contrats types, textes juridiques…). L'assistant les consulte pour enrichir ses réponses avec le contexte propre à votre résidence.
            </p>
          </div>

        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button onClick={onSettings}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            Accéder au paramétrage IA
          </button>
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition">
            ← Retour à l'assistant
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IAChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis l'assistant IA de Syndic Pro. Je peux vous aider à comprendre la situation financière de votre résidence, répondre à vos questions sur les règlements et procédures, et analyser des situations spécifiques. Comment puis-je vous aider ?" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(null);
  const [modelName,  setModelName]  = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    fetch("/api/ai/config/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setConfigured(d.configured); setModelName(d.model_name || ""); })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.slice(1).map(m => ({ role: m.role, content: m.content }));

    const r = await fetch("/api/ai/chat/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ message: msg, history: history.slice(0, -1) }),
    });
    const data = await r.json();
    setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Erreur de réponse." }]);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
    {showInfo && (
      <InfoModal
        onClose={() => setShowInfo(false)}
        onSettings={() => { setShowInfo(false); navigate("/parametrage/ia"); }}
      />
    )}
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/accueil")}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium transition">
            ← Tableau de bord
          </button>
          <span className="text-slate-200">|</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                className="w-4 h-4 text-indigo-600" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Assistant IA</p>
              {configured && modelName ? (
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {modelName}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400">Syndic Pro</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {configured === false && (
            <button onClick={() => navigate("/parametrage/ia")}
              className="text-[11px] px-3 py-1 bg-amber-100 text-amber-700 rounded-lg font-semibold hover:bg-amber-200 transition">
              ⚙ Configurer l'IA
            </button>
          )}
          <button onClick={() => setMessages([{ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" }])}
            className="text-[11px] px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition">
            Nouvelle conversation
          </button>
          <button onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center hover:bg-indigo-100 transition"
            title="À propos de l'assistant IA">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/50">
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only at start) */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                className="text-[11px] px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none bg-white"
            style={{ maxHeight: 120, overflowY: "auto" }}
            placeholder="Posez votre question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-300 mt-1.5 text-center">
          L'IA ne peut pas modifier vos données · Entrée pour envoyer
        </p>
      </div>
    </div>
    </>
  );
}

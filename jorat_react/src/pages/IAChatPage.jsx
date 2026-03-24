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

export default function IAChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis l'assistant IA de Syndic Pro. Je peux vous aider à comprendre la situation financière de votre résidence, répondre à vos questions sur les règlements et procédures, et analyser des situations spécifiques. Comment puis-je vous aider ?" }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    fetch("/api/ai/config/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setConfigured(d.configured))
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
              <p className="text-[10px] text-slate-400">Syndic Pro</p>
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
  );
}

/**
 * Toast — notification légère affichée en bas à droite.
 * Usage :
 *   import { useToast, ToastContainer } from "./Toast";
 *   const toast = useToast();
 *   toast.success("Message envoyé !");
 *   toast.error("Une erreur s'est produite.");
 */
import { useState, useCallback, useRef, createContext, useContext } from "react";

const ToastContext = createContext(null);

let _uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, type = "success", duration = 4000) => {
    const id = ++_uid;
    setToasts(prev => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, dur) => show(msg, "success", dur),
    error:   (msg, dur) => show(msg, "error",   dur),
    info:    (msg, dur) => show(msg, "info",     dur),
    warn:    (msg, dur) => show(msg, "warn",     dur),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const STYLES = {
  success: { bar: "bg-emerald-500", icon: "✓", ring: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  error:   { bar: "bg-red-500",     icon: "✕", ring: "border-red-200   bg-red-50   text-red-800"   },
  info:    { bar: "bg-blue-500",    icon: "ℹ", ring: "border-blue-200  bg-blue-50  text-blue-800"  },
  warn:    { bar: "bg-amber-500",   icon: "⚠", ring: "border-amber-200 bg-amber-50 text-amber-800" },
};

function ToastContainer({ toasts, dismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, minWidth: 260, maxWidth: 380 }}
    >
      {toasts.map(t => {
        const s = STYLES[t.type] ?? STYLES.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 text-sm font-medium ${s.ring}`}
            style={{ animation: "fadeSlideIn 200ms ease" }}
          >
            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${s.bar}`}>
              {s.icon}
            </span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-40 hover:opacity-80 transition text-base leading-none mt-0.5"
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

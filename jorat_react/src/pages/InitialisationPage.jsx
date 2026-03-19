import { useState } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const CONFIRM_WORD = "CONFIRMER";

export default function InitialisationPage() {
  const navigate = useNavigate();

  const [step, setStep]         = useState("idle"); // idle | confirm | running | done | error
  const [input, setInput]       = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [counts, setCounts]     = useState(null);

  const canSubmit = input === CONFIRM_WORD;

  const handleInit = async () => {
    if (!canSubmit) return;
    setStep("running");
    setErrorMsg("");
    try {
      const res = await fetch("/api/init-complete/", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCsrf(), "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.detail || `Erreur ${res.status}`);
        setStep("error");
        return;
      }
      setCounts(data.counts ?? null);
      setStep("done");
    } catch {
      setErrorMsg("Erreur réseau.");
      setStep("error");
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Initialisation effectuée</h2>
        <p className="text-sm text-slate-500">Toutes les données opérationnelles ont été supprimées.</p>
        {counts && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-left text-xs text-slate-600 space-y-1">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-semibold text-slate-800">{v} supprimé(s)</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => navigate("/accueil")}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Initialisation complète</h1>
        <p className="text-sm text-slate-500 mt-1">Réinitialisation des données opérationnelles</p>
      </div>

      {/* Warning card */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-red-700">Attention — Action irréversible</h2>
        </div>
        <p className="text-sm text-red-700 leading-relaxed">
          Cette opération va supprimer <strong>définitivement</strong> toutes les données opérationnelles :
        </p>
        <ul className="text-sm text-red-600 space-y-0.5 pl-4 list-disc">
          <li>Appels de charge et de fond</li>
          <li>Détails d'appels de charge</li>
          <li>Paiements et affectations</li>
          <li>Dépenses</li>
          <li>Recettes</li>
          <li>Mouvements de caisse</li>
        </ul>
        <p className="text-xs font-semibold text-red-700 bg-red-100 rounded-lg px-3 py-2">
          Les utilisateurs, la résidence, les lots, le plan comptable et la configuration ne seront pas affectés.
        </p>
      </div>

      {/* Confirmation step */}
      {step === "idle" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm text-slate-700 font-medium">
            Pour confirmer, saisissez <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-red-600">{CONFIRM_WORD}</code> ci-dessous :
          </p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/accueil")}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmer l'initialisation
            </button>
          </div>
        </div>
      )}

      {/* Final modal */}
      {step === "confirm" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Dernière confirmation</h3>
            <p className="text-sm text-slate-600">
              Vous êtes sur le point de supprimer <strong>toutes les données opérationnelles</strong> de manière irréversible. Êtes-vous absolument certain ?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("idle")}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleInit}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition"
              >
                Oui, initialiser maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "running" && (
        <div className="flex items-center justify-center gap-3 py-8 text-slate-500">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Initialisation en cours…</span>
        </div>
      )}

      {step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {errorMsg}
          <button onClick={() => setStep("idle")} className="ml-3 underline text-xs">Réessayer</button>
        </div>
      )}

    </div>
  );
}

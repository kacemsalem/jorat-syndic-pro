import { useState } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (newPassword !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/change-password/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.new_password || d.detail || "Erreur."); return;
      }
      // Update localStorage
      const saved = localStorage.getItem("syndic_user");
      if (saved) {
        const u = JSON.parse(saved);
        u.must_change_password = false;
        localStorage.setItem("syndic_user", JSON.stringify(u));
      }
      navigate("/accueil", { replace: true });
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)" }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(201,168,76,0.2)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>
        <div className="text-center mb-7">
          <div className="text-2xl mb-1" style={{ color: "#c9a84c" }}>🔒</div>
          <h1 className="text-lg font-bold mb-1" style={{ color: "#f1f5f9" }}>
            Changement de mot de passe
          </h1>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Nouveau mot de passe
            </label>
            <input
              type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Répéter le mot de passe"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center p-2 rounded-lg"
              style={{ background: "rgba(248,113,113,0.1)" }}>{error}</p>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{
              background: loading ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg,#c9a84c,#f0d080)",
              color: "#0f172a",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}

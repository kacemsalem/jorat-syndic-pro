import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── CSRF helper ────────────────────────────────────────────
async function getCsrf() {
  await fetch("/api/csrf/", { credentials: "include" });
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

// ── Input component ────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Input({ type = "text", placeholder, value, onChange, onKeyDown }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      onFocus={e => (e.target.style.borderColor = "rgba(201,168,76,0.7)")}
      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
    />
  );
}

// ── Login form ─────────────────────────────────────────────
function LoginForm({ onLogin, onSwitchCreate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!username || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/login/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "Identifiants incorrects."); return;
      }
      onLogin();
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="space-y-4">
      <Field label="Identifiant">
        <Input placeholder="nom_utilisateur" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={onKey} />
      </Field>
      <Field label="Mot de passe">
        <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey} />
      </Field>

      {error && (
        <p className="text-sm text-red-400 text-center py-2 rounded-lg"
          style={{ background: "rgba(248,113,113,0.1)" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit} disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition"
        style={{
          background: loading ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg,#c9a84c,#f0d080)",
          color: "#0f172a",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>

      <div className="pt-3 text-center">
        <span className="text-slate-500 text-sm">Pas encore de résidence ?</span>
        <button
          onClick={onSwitchCreate}
          className="ml-2 text-sm font-semibold"
          style={{ color: "#c9a84c" }}
        >
          Créer une résidence
        </button>
      </div>
    </div>
  );
}

// ── Create residence form ──────────────────────────────────
function CreateForm({ onCreated, onSwitchLogin }) {
  const [form, setForm] = useState({ nom_residence: "", ville_residence: "", username: "", password: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setErrors({});
    setLoading(true);
    try {
      const csrf = await getCsrf();
      const res = await fetch("/api/setup/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(typeof data === "object" ? data : { nom_residence: JSON.stringify(data) });
        return;
      }
      onCreated();
    } catch {
      setErrors({ nom_residence: "Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 text-center pb-1">
        Crée une résidence et son premier compte administrateur.
      </p>

      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Résidence</p>
        <Field label="Nom de la résidence" error={errors.nom_residence}>
          <Input placeholder="Résidence Les Oliviers" value={form.nom_residence} onChange={e => set("nom_residence", e.target.value)} />
        </Field>
        <Field label="Ville" error={errors.ville_residence}>
          <Input placeholder="Casablanca" value={form.ville_residence} onChange={e => set("ville_residence", e.target.value)} />
        </Field>
      </div>

      <div className="space-y-1 pt-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compte admin</p>
        <Field label="Identifiant" error={errors.username}>
          <Input placeholder="admin" value={form.username} onChange={e => set("username", e.target.value)} />
        </Field>
        <Field label="Mot de passe (min. 6 car.)" error={errors.password}>
          <Input type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} />
        </Field>
        <Field label="Email (optionnel)" error={errors.email}>
          <Input type="email" placeholder="admin@residence.ma" value={form.email} onChange={e => set("email", e.target.value)} />
        </Field>
      </div>

      <button
        onClick={handleSubmit} disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition"
        style={{
          background: loading ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg,#c9a84c,#f0d080)",
          color: "#0f172a",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Création…" : "Créer la résidence"}
      </button>

      <div className="pt-2 text-center">
        <button onClick={onSwitchLogin} className="text-sm font-semibold" style={{ color: "#c9a84c" }}>
          ← Retour à la connexion
        </button>
      </div>
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────
export default function LandingApp() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "create"

  // Redirect if already logged in
  useEffect(() => {
    const saved = localStorage.getItem("syndic_user");
    if (saved) {
      const u = JSON.parse(saved);
      const dest = u.is_superuser ? "/superuser" : u.role === "RESIDENT" ? "/resident" : "/accueil";
      navigate(dest, { replace: true });
    }
  }, [navigate]);

  const fetchMeAndNavigate = async () => {
    try {
      const res = await fetch("/api/me/", { credentials: "include" });
      if (res.ok) {
        const me = await res.json();
        localStorage.setItem("syndic_user", JSON.stringify(me));
        const dest = me.is_superuser ? "/superuser" : me.role === "RESIDENT" ? "/resident" : "/accueil";
        navigate(dest, { replace: true });
      }
    } catch {}
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Subtle pattern */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(45deg,#c9a84c 0,#c9a84c 1px,transparent 0,transparent 50%)",
        backgroundSize: "20px 20px",
      }} />

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg,#c9a84c,#f0d080)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <div className="font-bold text-sm tracking-widest" style={{ color: "#f1f5f9" }}>XYZ SYNDIC</div>
          <div className="text-xs tracking-widest uppercase" style={{ color: "#c9a84c", fontSize: 9 }}>Gestion Copropriété</div>
        </div>
      </header>

      {/* ── Main — vertically centered ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="rounded-2xl p-8" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(201,168,76,0.18)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Title */}
            <div className="text-center mb-7">
              {mode === "login" ? (
                <>
                  <h1 className="text-xl font-bold mb-1" style={{ color: "#f1f5f9" }}>Connexion</h1>
                  <p className="text-xs" style={{ color: "#64748b" }}>Accédez à votre espace de gestion</p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold mb-1" style={{ color: "#f1f5f9" }}>Nouvelle résidence</h1>
                  <p className="text-xs" style={{ color: "#64748b" }}>Configurer votre premier espace</p>
                </>
              )}
            </div>

            {/* Form */}
            {mode === "login" ? (
              <LoginForm
                onLogin={fetchMeAndNavigate}
                onSwitchCreate={() => setMode("create")}
              />
            ) : (
              <CreateForm
                onCreated={fetchMeAndNavigate}
                onSwitchLogin={() => setMode("login")}
              />
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-6" style={{ color: "#334155" }}>
            © 2026 XYZ Syndic — Gestion de copropriété
          </p>
        </div>
      </main>
    </div>
  );
}

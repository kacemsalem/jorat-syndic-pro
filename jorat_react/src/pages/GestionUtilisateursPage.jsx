import { useState, useEffect, useMemo } from "react";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const ROLE_LABELS = {
  SUPER_ADMIN:  "Super Admin",
  ADMIN:        "Admin",
  GESTIONNAIRE: "Gestionnaire",
  COMPTABLE:    "Comptable",
  LECTURE:      "Lecture",
  RESIDENT:     "Résident",
};

const ROLE_COLORS = {
  SUPER_ADMIN:  "bg-purple-100 text-purple-700",
  ADMIN:        "bg-blue-100 text-blue-700",
  GESTIONNAIRE: "bg-indigo-100 text-indigo-700",
  COMPTABLE:    "bg-teal-100 text-teal-700",
  LECTURE:      "bg-slate-100 text-slate-600",
  RESIDENT:     "bg-amber-100 text-amber-700",
};

const ROLE_AVATAR = {
  SUPER_ADMIN:  "from-purple-500 to-purple-700",
  ADMIN:        "from-blue-500 to-blue-700",
  GESTIONNAIRE: "from-indigo-500 to-indigo-700",
  COMPTABLE:    "from-teal-500 to-teal-700",
  LECTURE:      "from-slate-400 to-slate-600",
  RESIDENT:     "from-amber-400 to-amber-600",
};

const EMPTY_FORM = { username: "", password: "", email: "", role: "RESIDENT", lot_id: "" };
const EMPTY_EDIT = { username: "", email: "", role: "", actif: true, lot_id: "" };

function makeUsername(residence, lotNumero) {
  const r = (residence?.nom_residence || "").toUpperCase().replace(/\s+/g, "_");
  const l = (lotNumero || "").toUpperCase().replace(/\s+/g, "_");
  return r && l ? `${r}_${l}` : "";
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls  = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400";
const selectCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white";

export default function GestionUtilisateursPage() {
  const me = useMemo(() => JSON.parse(localStorage.getItem("syndic_user") || "null"), []);
  const residence = me?.residence;

  const [users,      setUsers]      = useState([]);
  const [lots,       setLots]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit,   setShowEdit]   = useState(null);
  const [showReset,  setShowReset]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editForm,   setEditForm]   = useState(EMPTY_EDIT);
  const [resetPwd,   setResetPwd]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});
  const [search,     setSearch]     = useState("");

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/residence-users/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchLots = () => {
    fetch("/api/lots/?page_size=500", { credentials: "include" })
      .then(r => r.json())
      .then(d => setLots(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); fetchLots(); }, []);

  const onLotChange = (lotId) => {
    const lot = lots.find(l => String(l.id) === String(lotId));
    const generated = makeUsername(residence, lot?.numero_lot);
    setForm(f => ({ ...f, lot_id: lotId, username: generated || f.username, password: generated || f.password }));
  };

  const handleCreate = async () => {
    setErrors({}); setSaving(true);
    try {
      const res = await fetch("/api/residence-users/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...form, lot_id: form.lot_id || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors(typeof data === "object" ? data : { username: JSON.stringify(data) }); return; }
      setShowCreate(false); setForm(EMPTY_FORM); fetchUsers();
    } finally { setSaving(false); }
  };

  const openEdit = (u) => {
    setEditForm({ username: u.username, email: u.email || "", role: u.role, actif: u.actif, lot_id: u.lot_id || "" });
    setErrors({}); setShowEdit(u);
  };

  const handleEdit = async () => {
    setErrors({}); setSaving(true);
    try {
      const res = await fetch(`/api/residence-users/${showEdit.membership_id}/`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ ...editForm, lot_id: editForm.lot_id || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors(typeof data === "object" ? data : { username: JSON.stringify(data) }); return; }
      setShowEdit(null); fetchUsers();
    } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    setErrors({}); setSaving(true);
    try {
      const res = await fetch(`/api/residence-users/${showReset.membership_id}/reset-password/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ password: resetPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors({ password: data.password || data.detail || "Erreur." }); return; }
      setShowReset(null); setResetPwd("");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (u) => {
    await fetch(`/api/residence-users/${u.membership_id}/`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ actif: !u.actif }),
    });
    fetchUsers();
  };

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.lot_numero || "").toLowerCase().includes(q) ||
      ROLE_LABELS[u.role]?.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (!me || !["ADMIN", "SUPER_ADMIN"].includes(me.role)) {
    return (
      <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Administration</p>
            <h1 className="text-white font-bold text-lg leading-tight">Utilisateurs</h1>
          </div>
          <button
            onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowCreate(true); }}
            className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition shadow-sm"
          >
            + Ajouter
          </button>
        </div>
        <p className="text-white/50 text-[10px] mt-1">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""} · {residence?.nom_residence}
        </p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Rechercher par nom, lot, rôle…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Aucun utilisateur trouvé</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(ROLE_LABELS).map(([role, roleLabel]) => {
              const group = filtered.filter(u => u.role === role);
              if (group.length === 0) return null;
              return (
                <div key={role} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[role] || "bg-slate-100 text-slate-600"}`}>
                      {roleLabel}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{group.length}</span>
                  </div>

                  {/* User cards */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {group.map(u => (
                      <div
                        key={u.membership_id}
                        className={`rounded-xl border px-3 py-3 space-y-2.5 transition hover:shadow-md ${
                          u.actif
                            ? "border-slate-100 bg-white shadow-sm"
                            : "border-slate-100 bg-slate-50/60 shadow-sm opacity-60"
                        }`}
                      >
                        {/* Top row: avatar + info + badges */}
                        <div className="flex items-start gap-2.5">
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ROLE_AVATAR[u.role] || "from-slate-400 to-slate-600"} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-white font-bold text-sm">
                              {u.username[0]?.toUpperCase() || "?"}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 text-sm truncate leading-tight">{u.username}</div>
                            {u.email && <div className="text-[10px] text-slate-400 truncate mt-0.5">{u.email}</div>}
                            {u.must_change_password && (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠ mdp à changer</div>
                            )}
                          </div>

                          {/* Right badges */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {u.lot_numero && (
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg text-[10px]">
                                {u.lot_numero}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.actif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {u.actif ? "Actif" : "Inactif"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5 border-t border-slate-50">
                          <button onClick={() => openEdit(u)}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                            Modifier
                          </button>
                          <button onClick={() => { setResetPwd(""); setErrors({}); setShowReset(u); }}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition">
                            Réinitialiser
                          </button>
                          {u.user_id !== me.id && (
                            <button onClick={() => handleToggleActive(u)}
                              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition ${
                                u.actif
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}>
                              {u.actif ? "Désactiver" : "Activer"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal title="Nouvel utilisateur" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <Field label="Lot (optionnel)" error={errors.lot_id}>
              <select className={selectCls} value={form.lot_id} onChange={e => onLotChange(e.target.value)}>
                <option value="">— Sans lot —</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.numero_lot}</option>)}
              </select>
            </Field>
            <Field label="Identifiant *" error={errors.username}>
              <input className={inputCls} value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder={makeUsername(residence, "") || "nom_utilisateur"} />
            </Field>
            <Field label="Mot de passe par défaut *" error={errors.password}>
              <input className={inputCls} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 4 caractères" />
              <p className="mt-1 text-[10px] text-slate-400">L'utilisateur devra le changer à sa première connexion.</p>
            </Field>
            <Field label="Email (optionnel)" error={errors.email}>
              <input type="email" className={inputCls} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemple.ma" />
            </Field>
            <Field label="Rôle" error={errors.role}>
              <select className={selectCls} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? "Création…" : "Créer l'utilisateur"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {showEdit && (
        <Modal title={`Modifier — ${showEdit.username}`} onClose={() => setShowEdit(null)}>
          <div className="space-y-4">
            <Field label="Identifiant *" error={errors.username}>
              <input className={inputCls} value={editForm.username}
                onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" className={inputCls} value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Lot" error={errors.lot_id}>
              <select className={selectCls} value={editForm.lot_id}
                onChange={e => setEditForm(f => ({ ...f, lot_id: e.target.value }))}>
                <option value="">— Sans lot —</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.numero_lot}</option>)}
              </select>
            </Field>
            {showEdit.user_id !== me.id && (
              <Field label="Rôle" error={errors.role}>
                <select className={selectCls} value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={handleEdit} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button onClick={() => setShowEdit(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset password modal ── */}
      {showReset && (
        <Modal title={`Réinitialiser — ${showReset.username}`} onClose={() => setShowReset(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Définissez un nouveau mot de passe temporaire. L'utilisateur devra le changer à sa prochaine connexion.
            </p>
            <Field label="Nouveau mot de passe *" error={errors.password}>
              <input type="text" className={inputCls} value={resetPwd}
                onChange={e => setResetPwd(e.target.value)}
                placeholder="Min. 4 caractères" />
            </Field>
            <div className="flex gap-2 pt-2">
              <button onClick={handleResetPassword} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition">
                {saving ? "Enregistrement…" : "Réinitialiser"}
              </button>
              <button onClick={() => setShowReset(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

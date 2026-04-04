import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white transition";
const INP_SM = "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white transition";

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, ok = true }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm shadow-lg text-white font-medium transition ${ok ? "bg-emerald-600" : "bg-red-600"}`}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Password modal
// ─────────────────────────────────────────────────────────────────────────────
function PasswordModal({ admin, onClose, onSaved }) {
  const [pw, setPw]       = useState("");
  const [msg, setMsg]     = useState("");
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
    if (r.ok) { onSaved("Mot de passe mis à jour."); onClose(); }
    else setMsg(d.detail || "Erreur.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Réinitialiser le mot de passe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <p className="text-xs text-slate-500">Utilisateur : <strong>{admin.username}</strong></p>
        {msg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{msg}</p>}
        <input type="password" className={INPUT} placeholder="Nouveau mot de passe (≥ 6 car.)"
          value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} autoFocus />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "…" : "Enregistrer"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Residence modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateResidenceModal({ onClose, onCreated }) {
  const EMPTY = { nom_residence: "", ville_residence: "", username: "", password: "", email: "" };
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setErrors({});
    const r = await fetch("/api/setup/", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { onCreated(); onClose(); }
    else setErrors(typeof d === "object" ? d : { detail: JSON.stringify(d) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-slate-700">Nouvelle résidence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        {errors.detail && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{errors.detail}</p>}
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
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Administrateur initial</p>
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
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Création…" : "Créer"}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Residence Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
function ResidenceDrawer({ residenceId, onClose, onRefresh, showToast }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("info"); // info | admins | backup
  const [pwModal, setPwModal] = useState(null);
  const restoreRef            = useRef(null);

  // Edit form state
  const [editNom,  setEditNom]  = useState("");
  const [editVille, setEditVille] = useState("");
  const [saving,   setSaving]   = useState(false);

  // Add admin state
  const [addForm,    setAddForm]    = useState({ username: "", password: "", email: "" });
  const [addError,   setAddError]   = useState("");
  const [addSaving,  setAddSaving]  = useState(false);

  // Backup/restore state
  const [restoring, setRestoring]   = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/superuser/residences/${residenceId}/`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      setDetail(d);
      setEditNom(d.nom);
      setEditVille(d.ville);
    }
    setLoading(false);
  }, [residenceId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveInfo = async () => {
    setSaving(true);
    const r = await fetch(`/api/superuser/residences/${residenceId}/`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ nom_residence: editNom, ville_residence: editVille }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { showToast(d.detail); onRefresh(); load(); }
    else showToast(d.detail || "Erreur.", false);
  };

  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const r = await fetch(`/api/superuser/residences/${residenceId}/`, {
      method: "DELETE", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    const d = await r.json();
    setDeleting(false);
    if (r.ok) { showToast(d.detail); onRefresh(); onClose(); }
    else { showToast(d.detail || "Erreur.", false); setConfirmDel(false); }
  };

  const handleAddAdmin = async () => {
    setAddError("");
    if (!addForm.username.trim()) { setAddError("Nom d'utilisateur requis."); return; }
    if (addForm.password.length < 6) { setAddError("Mot de passe minimum 6 caractères."); return; }
    setAddSaving(true);
    const r = await fetch(`/api/superuser/residences/${residenceId}/add-admin/`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify(addForm),
    });
    const d = await r.json();
    setAddSaving(false);
    if (r.ok) {
      showToast(d.detail);
      setAddForm({ username: "", password: "", email: "" });
      load(); onRefresh();
    } else setAddError(d.detail || "Erreur.");
  };

  const handleToggleAdmin = async (userId) => {
    const r = await fetch(`/api/superuser/residences/${residenceId}/toggle-admin/${userId}/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (r.ok) { load(); onRefresh(); }
  };

  const handleBackup = () => {
    window.open(`/api/superuser/residences/${residenceId}/backup/`, "_blank");
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm(`⚠️ ATTENTION : Cette opération va supprimer TOUTES les données de la résidence « ${detail?.nom} » et les remplacer par celles du fichier.\n\nCette action est IRRÉVERSIBLE (sans un autre backup).\n\nConfirmer la restauration ?`)) {
      restoreRef.current.value = "";
      return;
    }
    setRestoring(true);
    setRestoreMsg(null);
    const fd = new FormData();
    fd.append("backup", file);
    const r = await fetch(`/api/superuser/residences/${residenceId}/restore/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
      body: fd,
    });
    const d = await r.json();
    setRestoring(false);
    restoreRef.current.value = "";
    setRestoreMsg({ ok: r.ok, text: d.detail || (r.ok ? "Restauration réussie." : "Erreur.") });
    if (r.ok) load();
  };

  const TABS = [
    { id: "info",   label: "Informations" },
    { id: "admins", label: `Administrateurs${detail ? ` (${detail.admins.length})` : ""}` },
    { id: "backup", label: "Backup / Restore" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-indigo-600 text-white">
          <div>
            <h2 className="text-sm font-bold">{detail?.nom || "Résidence"}</h2>
            <p className="text-[11px] text-indigo-200">{detail?.ville || ""}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>

        {/* Stats bar */}
        {detail && (
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
            <div className="px-4 py-2.5 text-center">
              <p className="text-base font-bold text-indigo-600">{detail.nb_lots}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">Lots</p>
            </div>
            <div className="px-4 py-2.5 text-center">
              <p className="text-base font-bold text-slate-700">{detail.nb_groupes}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">Groupes</p>
            </div>
            <div className="px-4 py-2.5 text-center">
              <p className={`text-base font-bold ${detail.solde_caisse >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {Number(detail.solde_caisse).toLocaleString("fr-MA", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">Solde MAD</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (

            /* ── Tab: Informations ── */
            tab === "info" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nom de la résidence</label>
                  <input className={INPUT} value={editNom} onChange={e => setEditNom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ville</label>
                  <input className={INPUT} value={editVille} onChange={e => setEditVille(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Créée le</p>
                    <p className="text-xs font-semibold text-slate-700">{detail?.created_at || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Paiements</p>
                    <p className="text-xs font-semibold text-slate-700">{detail?.nb_paiements}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Dépenses</p>
                    <p className="text-xs font-semibold text-slate-700">{detail?.nb_depenses}</p>
                  </div>
                </div>
                <button onClick={handleSaveInfo} disabled={saving}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                  {saving ? "Sauvegarde…" : "Enregistrer les modifications"}
                </button>

                {/* Zone danger — suppression */}
                <div className="mt-4 border border-red-200 rounded-2xl p-4 space-y-3 bg-red-50">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Zone de danger</p>
                  {!confirmDel ? (
                    <button onClick={() => setConfirmDel(true)}
                      className="w-full py-2 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition">
                      Supprimer cette résidence…
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-700 font-semibold">
                        ⚠️ Supprimer <strong>« {detail?.nom} »</strong> et toutes ses données ?<br/>
                        <span className="font-normal text-red-500">Cette action est irréversible.</span>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleDelete} disabled={deleting}
                          className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition">
                          {deleting ? "Suppression…" : "Confirmer la suppression"}
                        </button>
                        <button onClick={() => setConfirmDel(false)}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            /* ── Tab: Administrateurs ── */
            ) : tab === "admins" ? (
              <div className="space-y-4">
                {/* Existing admins */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Comptes administrateurs
                  </p>
                  {detail?.admins.length === 0 ? (
                    <p className="text-xs text-slate-300 py-4 text-center border-2 border-dashed border-slate-200 rounded-xl">
                      Aucun administrateur
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.admins.map(a => (
                        <div key={a.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border ${a.actif ? "bg-white border-slate-100" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{a.username}</p>
                            {a.email && <p className="text-[10px] text-slate-400 truncate">{a.email}</p>}
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full ${a.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                              {a.actif ? "Actif" : "Inactif"}
                            </span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => setPwModal(a)}
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                              🔑
                            </button>
                            <button onClick={() => handleToggleAdmin(a.id)}
                              className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition ${a.actif ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
                              {a.actif ? "Désactiver" : "Activer"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add admin */}
                <div className="bg-indigo-50 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Ajouter un administrateur</p>
                  {addError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{addError}</p>}
                  <input className={INP_SM} placeholder="Nom d'utilisateur *"
                    value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} />
                  <input type="password" className={INP_SM} placeholder="Mot de passe (≥ 6 car.) *"
                    value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
                  <input type="email" className={INP_SM} placeholder="Email (optionnel)"
                    value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                  <button onClick={handleAddAdmin} disabled={addSaving}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                    {addSaving ? "Création…" : "+ Ajouter"}
                  </button>
                </div>
              </div>

            /* ── Tab: Backup / Restore ── */
            ) : (
              <div className="space-y-5">
                {/* Backup */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💾</span>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Sauvegarder</p>
                      <p className="text-[11px] text-emerald-600">Télécharge un fichier JSON complet de toutes les données de la résidence.</p>
                    </div>
                  </div>
                  <button onClick={handleBackup}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                    ⬇ Télécharger le backup
                  </button>
                </div>

                {/* Restore */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">♻️</span>
                    <div>
                      <p className="text-sm font-bold text-red-800">Restaurer</p>
                      <p className="text-[11px] text-red-600">Remplace toutes les données actuelles par celles du fichier backup.</p>
                    </div>
                  </div>
                  <div className="bg-red-100 border border-red-300 rounded-xl px-3 py-2 text-[11px] text-red-700 font-medium">
                    ⚠️ ATTENTION : Cette opération est irréversible. Toutes les données actuelles seront supprimées.
                  </div>
                  {restoreMsg && (
                    <div className={`px-3 py-2 rounded-xl text-[11px] font-semibold ${restoreMsg.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {restoreMsg.text}
                    </div>
                  )}
                  {restoring ? (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-red-600 font-medium">Restauration en cours…</span>
                    </div>
                  ) : (
                    <label className="block w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition text-center cursor-pointer">
                      ⬆ Choisir un fichier backup…
                      <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    </label>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-600">Format du backup :</p>
                  <p>• Tous les lots, groupes, contacts, appels de charge/fond</p>
                  <p>• Paiements, dépenses, recettes, mouvements caisse</p>
                  <p>• Bureau syndical, assemblées, résolutions, passations</p>
                  <p>• Suivi recouvrement, archives comptables</p>
                </div>
              </div>
            )
          )}
        </div>

        {pwModal && (
          <PasswordModal
            admin={pwModal}
            onClose={() => setPwModal(null)}
            onSaved={msg => showToast(msg)}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Residence Kanban Card
// ─────────────────────────────────────────────────────────────────────────────
function ResidenceCard({ r, onOpen }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden group"
      onClick={() => onOpen(r.id)}
    >
      {/* Card top accent */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{r.nom}</h3>
            <p className="text-[11px] text-slate-400 truncate">{r.ville || "—"}</p>
          </div>
          <span className="shrink-0 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
            {r.created_at}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-indigo-50 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-indigo-600">{r.nb_lots}</p>
            <p className="text-[8px] text-indigo-400 uppercase tracking-wide">Lots</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-slate-600">{r.nb_groupes}</p>
            <p className="text-[8px] text-slate-400 uppercase tracking-wide">Groupes</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 text-center">
            <p className="text-sm font-bold text-emerald-600">{r.admins.length}</p>
            <p className="text-[8px] text-emerald-500 uppercase tracking-wide">Admins</p>
          </div>
        </div>

        {/* Admins preview */}
        {r.admins.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {r.admins.slice(0, 3).map(a => (
              <span key={a.id} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {a.username}
              </span>
            ))}
            {r.admins.length > 3 && (
              <span className="text-[10px] text-slate-400">+{r.admins.length - 3}</span>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-orange-500 bg-orange-50 rounded-lg px-2 py-1">⚠ Aucun administrateur actif</p>
        )}

        {/* Open button */}
        <div className="pt-1 border-t border-slate-50">
          <p className="text-[10px] text-indigo-500 font-semibold text-center group-hover:text-indigo-700 transition">
            Gérer cette résidence →
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Residences Tab
// ─────────────────────────────────────────────────────────────────────────────
function ResidencesTab({ showToast }) {
  const [residences,   setResidences]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [listMode,     setListMode]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [createModal,  setCreateModal]  = useState(false);
  const [drawerResId,  setDrawerResId]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/superuser/residences/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setResidences(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = residences.filter(r =>
    r.nom.toLowerCase().includes(search.toLowerCase()) ||
    r.ville.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="flex-1 min-w-40 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 transition"
          placeholder="Rechercher par nom ou ville…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={() => setListMode(false)}
            className={`px-3 py-2 text-sm transition ${!listMode ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            ▦
          </button>
          <button onClick={() => setListMode(true)}
            className={`px-3 py-2 text-sm transition ${listMode ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            ☰
          </button>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition whitespace-nowrap">
          + Nouvelle résidence
        </button>
      </div>

      {/* Summary */}
      <p className="text-[11px] text-slate-400">
        {filtered.length} résidence{filtered.length !== 1 ? "s" : ""} · {residences.reduce((s, r) => s + r.nb_lots, 0)} lots au total
      </p>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 text-sm">
          {search ? "Aucun résultat" : "Aucune résidence"}
        </div>
      ) : listMode ? (
        /* ── Liste ── */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_60px_60px_60px_100px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            {["Résidence", "Ville", "Lots", "Groupes", "Admins", "Créée le"].map(h => (
              <span key={h} className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.map(r => (
              <div key={r.id}
                className="grid grid-cols-[1fr_120px_60px_60px_60px_100px] gap-2 px-4 py-3 items-center hover:bg-slate-50 cursor-pointer transition"
                onClick={() => setDrawerResId(r.id)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{r.nom}</p>
                  {r.admins.length === 0 && (
                    <p className="text-[9px] text-orange-500">⚠ sans admin</p>
                  )}
                </div>
                <span className="text-xs text-slate-500 truncate">{r.ville || "—"}</span>
                <span className="text-xs font-semibold text-indigo-600 text-center">{r.nb_lots}</span>
                <span className="text-xs text-slate-500 text-center">{r.nb_groupes}</span>
                <span className="text-xs text-slate-500 text-center">{r.admins.length}</span>
                <span className="text-[10px] text-slate-400">{r.created_at}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Kanban ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResidenceCard key={r.id} r={r} onOpen={id => setDrawerResId(id)} />
          ))}
        </div>
      )}

      {createModal && (
        <CreateResidenceModal
          onClose={() => setCreateModal(false)}
          onCreated={() => { showToast("Résidence créée."); load(); }}
        />
      )}

      {drawerResId && (
        <ResidenceDrawer
          residenceId={drawerResId}
          onClose={() => setDrawerResId(null)}
          onRefresh={load}
          showToast={(msg, ok = true) => showToast(msg, ok)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Config Panel (unchanged logic, cleaner layout)
// ─────────────────────────────────────────────────────────────────────────────
const MODELS_GROQ = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

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
      const text = (d.detail || (r.ok ? "Chargé." : "Erreur.")) + (d.taille_texte ? ` (${Math.round(d.taille_texte / 1000)} k car.)` : "");
      setMsg({ ok: r.ok, text });
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
        {loading ? "Chargement…" : "⚡ Charger la doc de l'app"}
      </button>
      {msg && <span className={`text-[10px] font-medium ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</span>}
    </div>
  );
}

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
    await fetch("/api/ai/documents/", { method: "POST", credentials: "include", headers: { "X-CSRFToken": getCsrf() }, body: fd });
    setNomDoc(""); fileRef.current.value = "";
    await load(); setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    await fetch(`/api/ai/documents/${id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
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
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else { const d = await r.json().catch(() => ({})); setSaveError(d.detail || `Erreur ${r.status}`); setTimeout(() => setSaveError(null), 5000); }
  };

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* API Config */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration API</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <strong>Recommandé (gratuit) :</strong> Créez un compte sur <span className="font-mono">console.groq.com</span> → API Keys.
          Modèle suggéré : <span className="font-mono">llama-3.1-8b-instant</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">URL de l'API</label>
            <input className={INPUT} value={config.api_url} onChange={e => setConfig(c => ({ ...c, api_url: e.target.value }))} placeholder="https://api.groq.com/openai/v1/chat/completions" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Clé API</label>
            {config._key_saved && !config.api_key && (
              <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-600 text-sm">✓</span>
                <span className="text-xs text-emerald-700 font-semibold">Clé API enregistrée</span>
                <span className="text-xs text-emerald-500 ml-1">— laissez vide pour conserver</span>
              </div>
            )}
            <input type="password" className={INPUT} value={config.api_key}
              onChange={e => setConfig(c => ({ ...c, api_key: e.target.value }))}
              placeholder={config._key_saved ? "Laisser vide = conserver" : "gsk_…"} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Modèle</label>
            <div className="flex gap-2">
              <select className={INPUT} value={config.model_name} onChange={e => setConfig(c => ({ ...c, model_name: e.target.value }))}>
                {MODELS_GROQ.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className={INPUT + " w-64"} value={config.model_name} onChange={e => setConfig(c => ({ ...c, model_name: e.target.value }))} placeholder="ou saisir manuellement" />
            </div>
          </div>
        </div>
      </div>

      {/* System prompt */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instructions système</h2>
        <p className="text-xs text-slate-500">Définissez le comportement de l'IA : ton, règles, domaine d'expertise.</p>
        <textarea rows={7} className={INPUT + " resize-none font-mono text-xs"}
          value={config.system_prompt} onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
          placeholder="Tu es l'assistant IA de Syndic Pro…" />
      </div>

      {saveError && <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">✕ {saveError}</div>}
      <button onClick={handleSave} disabled={saving}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${saved ? "bg-emerald-500 text-white" : saveError ? "bg-red-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:opacity-50`}>
        {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Sauvegarder la configuration"}
      </button>

      {/* Documents PDF */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documents de référence (PDF)</h2>
          <AppDocsButton onLoaded={load} />
        </div>
        <p className="text-xs text-slate-500">Les documents actifs enrichissent les réponses de l'IA.</p>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 space-y-2">
          <input className={INPUT} placeholder="Nom du document (optionnel)" value={nomDoc} onChange={e => setNomDoc(e.target.value)} />
          <div className="flex gap-2 items-center">
            <input ref={fileRef} type="file" accept=".pdf"
              className="text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:font-semibold file:cursor-pointer"
              onChange={handleUpload} disabled={uploading} />
            {uploading && <span className="text-xs text-slate-400">Traitement…</span>}
          </div>
        </div>
        {docs.length === 0 ? (
          <div className="text-center py-8 text-slate-300 text-xs border border-dashed border-slate-200 rounded-xl">Aucun document uploadé</div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${doc.actif ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-red-400 shrink-0" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.nom}</p>
                  <p className="text-[10px] text-slate-400">{doc.date_upload} · {(doc.taille_texte / 1000).toFixed(1)} k car.</p>
                </div>
                <button onClick={() => handleToggle(doc)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${doc.actif ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}>
                  {doc.actif ? "Actif" : "Inactif"}
                </button>
                <button onClick={() => handleDelete(doc.id)} className="text-slate-300 hover:text-red-500 transition text-sm shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sécurité</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>✅ L'IA n'a aucun accès direct à la base de données</li>
          <li>✅ Seuls des résumés calculés sont envoyés au LLM</li>
          <li>✅ La clé API est stockée uniquement sur le serveur</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperuserDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("residences");
  const [toast,     setToast]     = useState({ msg: "", ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3000);
  };

  const logout = async () => {
    await fetch("/api/logout/", { method: "POST", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    localStorage.removeItem("syndic_user");
    navigate("/login");
  };

  const TABS = [
    { id: "residences", label: "Gestion des résidences", icon: "🏢" },
    { id: "ia",         label: "Configuration IA",        icon: "🤖" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast msg={toast.msg} ok={toast.ok} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">S</div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Syndic Pro</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Administration Système</p>
            </div>
          </div>
          <button onClick={logout}
            className="text-xs text-slate-500 hover:text-red-600 font-medium transition px-3 py-1.5 rounded-lg hover:bg-red-50">
            Déconnexion
          </button>
        </div>

        {/* Tab nav */}
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "residences" ? (
          <ResidencesTab showToast={showToast} />
        ) : (
          <AIConfigPanel />
        )}
      </div>
    </div>
  );
}

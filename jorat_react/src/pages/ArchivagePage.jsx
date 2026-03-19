import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Confirmer", danger = true }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArchivagePage() {
  const navigate = useNavigate();

  const [archives, setArchives]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ start_date: "", end_date: "", commentaire: "", archive_appels: false });
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null); // archive id
  const [restoring, setRestoring]         = useState(null);
  const [expanded, setExpanded]           = useState(null);

  const fetchArchives = () => {
    setLoading(true);
    fetch("/api/archives/", { credentials: "include" })
      .then(r => r.json())
      .then(data => setArchives(Array.isArray(data) ? data : []))
      .catch(() => setError("Erreur de chargement."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchArchives(); }, []);

  const handleCreate = async () => {
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/archives/create/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data?.detail || JSON.stringify(data));
        return;
      }
      setShowForm(false);
      setForm({ start_date: "", end_date: "", commentaire: "", archive_appels: false });
      fetchArchives();
    } catch {
      setSaveError("Erreur réseau.");
    } finally {
      setSaving(false);
      setConfirmArchive(false);
    }
  };

  const handleRestore = async (id) => {
    setRestoring(id);
    try {
      const res = await fetch(`/api/archives/${id}/restore/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.detail || "Erreur lors de la restauration.");
        return;
      }
      fetchArchives();
    } catch {
      alert("Erreur réseau.");
    } finally {
      setRestoring(null);
      setConfirmRestore(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Archivage comptable</h1>
          <p className="text-sm text-slate-500 mt-0.5">Archive les données financières d'une période tout en conservant le solde de caisse</p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setSaveError(""); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
        >
          + Nouvelle archive
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-700">Créer une archive</h3>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-sm">{saveError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date début *</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date fin *</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Commentaire</label>
            <input type="text" value={form.commentaire}
              onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
              placeholder="Optionnel — description de l'archive"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>

          {/* Option appels */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.archive_appels}
              onChange={e => setForm(f => ({ ...f, archive_appels: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">Archiver les appels de charge/fond totalement recouverts</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Les appels dont tous les lots ont le statut "Payé" seront masqués des vues actives et rattachés à cette archive.
              </span>
            </span>
          </label>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <strong>Attention :</strong> Cette opération déplace les dépenses, paiements et recettes de la période dans des tables d'archive et crée un ajustement de caisse. Elle est réversible via la restauration.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!form.start_date || !form.end_date) { setSaveError("Les deux dates sont obligatoires."); return; }
                setSaveError("");
                setConfirmArchive(true);
              }}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              Archiver la période
            </button>
          </div>
        </div>
      )}

      {/* Archives list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Chargement…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      ) : archives.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
          Aucune archive. Créez votre première archive ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {archives.map(a => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {a.start_date} → {a.end_date}
                    </span>
                    <span className="text-xs text-slate-400">créée le {a.created_at}</span>
                  </div>
                  {a.commentaire && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{a.commentaire}</p>
                  )}
                  <div className="flex gap-4 mt-1.5 text-xs">
                    <span className="text-emerald-600 font-medium">+{fmt(a.total_recettes)} recettes</span>
                    <span className="text-red-500 font-medium">−{fmt(a.total_depenses)} dépenses</span>
                    <span className={`font-semibold ${parseFloat(a.solde) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      Solde : {parseFloat(a.solde) >= 0 ? "+" : ""}{fmt(a.solde)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition"
                  >
                    {expanded === a.id ? "Masquer" : "Détails"}
                  </button>
                  <button
                    onClick={() => setConfirmRestore(a.id)}
                    disabled={restoring === a.id}
                    className="px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                  >
                    {restoring === a.id ? "…" : "Restaurer"}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expanded === a.id && (
                <div className={`border-t border-slate-100 px-5 py-4 grid gap-4 bg-slate-50 text-xs ${a.nb_appels > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
                  <div className="text-center">
                    <div className="text-slate-500 mb-0.5">Dépenses archivées</div>
                    <div className="text-lg font-bold text-red-500">{a.nb_depenses}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 mb-0.5">Paiements archivés</div>
                    <div className="text-lg font-bold text-blue-600">{a.nb_paiements}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 mb-0.5">Recettes archivées</div>
                    <div className="text-lg font-bold text-emerald-600">{a.nb_recettes}</div>
                  </div>
                  {a.nb_appels > 0 && (
                    <div className="text-center">
                      <div className="text-slate-500 mb-0.5">Appels archivés</div>
                      <div className="text-lg font-bold text-indigo-600">{a.nb_appels}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm archive modal */}
      {confirmArchive && (
        <ConfirmModal
          title="Confirmer l'archivage"
          message={`Archiver les mouvements du ${form.start_date} au ${form.end_date} ? Les enregistrements seront déplacés vers les tables d'archive et un ajustement de caisse sera créé.`}
          confirmLabel={saving ? "Archivage…" : "Archiver"}
          onConfirm={handleCreate}
          onCancel={() => setConfirmArchive(false)}
        />
      )}

      {/* Confirm restore modal */}
      {confirmRestore && (
        <ConfirmModal
          title="Confirmer la restauration"
          message="Restaurer cette archive ? Les enregistrements seront remis dans les tables opérationnelles et l'ajustement de caisse sera supprimé."
          confirmLabel="Restaurer"
          danger={false}
          onConfirm={() => handleRestore(confirmRestore)}
          onCancel={() => setConfirmRestore(null)}
        />
      )}

    </div>
  );
}

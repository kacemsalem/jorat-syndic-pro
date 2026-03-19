import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RecouvrementNav from "../components/RecouvrementNav";

const API = "/api";

const EMPTY_FORM = {
  type_charge: "CHARGE",
  exercice: new Date().getFullYear(),
  nom_fond: "",
  description_appel: "",
  date_emission: new Date().toISOString().split("T")[0],
};

export default function AppelsChargePage() {

  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const residenceId =
    searchParams.get("residence") ??
    localStorage.getItem("active_residence") ??
    null;

  const filtre = searchParams.get("filtre") || "CHARGE"; // CHARGE | FOND — fixed per page

  const [appels, setAppels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);


  const fetchJson = async (url) => {

    const r = await fetch(url, {
      credentials: "include"
    });

    if (!r.ok) return [];

    const d = await r.json();

    return Array.isArray(d) ? d : (d.results ?? []);
  };


  // ─────────────────────────────────────────────
  // Chargement appels
  // ─────────────────────────────────────────────

  const fetchAppels = () => {

    if (!residenceId) return;

    setLoading(true);

    fetchJson(`${API}/appels-charge/?residence=${residenceId}`)
      .then(data => setAppels(data))
      .finally(() => setLoading(false));

  };

  useEffect(() => { fetchAppels(); }, [residenceId]);


  // ─────────────────────────────────────────────
  // Filtrage
  // ─────────────────────────────────────────────

  const appelsFiltres = appels
    .filter((a) => filtre === "TOUT" || a.type_charge === filtre)
    .sort((a, b) => {
      if (b.exercice !== a.exercice) return b.exercice - a.exercice;
      if (a.type_charge === "FOND" && b.type_charge === "FOND")
        return (a.code_fond ?? "").localeCompare(b.code_fond ?? "", "fr", { numeric: true });
      return 0;
    });


  // ─────────────────────────────────────────────
  // Modal
  // ─────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      type_charge: filtre !== "FOND" ? "CHARGE" : "FOND",
    });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (appel) => {
    setEditing(appel.id);
    setForm({
      type_charge:       appel.type_charge,
      exercice:          appel.exercice,
      nom_fond:          appel.nom_fond ?? "",
      description_appel: appel.description_appel ?? "",
      date_emission:     appel.date_emission,
      _code_fond:        appel.code_fond ?? "",
    });
    setErrors({});
    setShowModal(true);
  };


  // ─────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────

  const handleSave = async () => {

    setSaving(true);
    setErrors({});

    const url = editing
      ? `${API}/appels-charge/${editing}/`
      : `${API}/appels-charge/`;

    const method = editing ? "PATCH" : "POST";

    // eslint-disable-next-line no-unused-vars
    const { _code_fond, ...formData } = form;
    const payload = {
      ...formData,
      periode: form.type_charge === "FOND" ? "FOND" : "ANNEE",
    };

    try {
      const csrfToken = document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1];

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken || "" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {

        setShowModal(false);
        fetchAppels();

      } else {

        try {
          const data = await res.json();
          setErrors(data);
        } catch {
          setErrors({ detail: `Erreur serveur (${res.status})` });
        }

      }

    } finally {

      setSaving(false);

    }

  };


  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  const handleDelete = async (id) => {

    if (!confirm("Supprimer cet appel de charge ?")) return;

    const csrfToken = document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1];
    await fetch(`${API}/appels-charge/${id}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": csrfToken || "" },
    });

    fetchAppels();
  };


  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  const TYPE_BADGE = {
    CHARGE: "bg-indigo-100 text-indigo-700",
    FOND:   "bg-amber-100 text-amber-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      <RecouvrementNav residenceId={residenceId} />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {filtre === "FOND" ? "Appels de fond" : "Appels de charge"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{appelsFiltres.length} appel{appelsFiltres.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!residenceId && (
            <span className="text-xs text-red-500 self-center">⚠️ Sélectionnez une résidence</span>
          )}
          <button
            onClick={openCreate}
            disabled={!residenceId}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-40"
          >
            + Nouvel appel
          </button>
        </div>
      </div>

      {/* ── Liste ── */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement…</div>
        ) : appelsFiltres.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Aucun appel trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Référence</th>
                <th className="px-5 py-3 text-left">Nom</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Exercice</th>
                <th className="px-5 py-3 text-left">Période</th>
                <th className="px-5 py-3 text-center">Lots</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appelsFiltres.map((a) => (
                <tr key={a.id} className="border-t hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{a.code_fond || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{a.nom_fond || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[a.type_charge]}`}>
                      {a.type_charge_label ?? a.type_charge}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{a.exercice}</td>
                  <td className="px-5 py-3 text-slate-600">{a.periode_label ?? a.periode}</td>
                  <td className="px-5 py-3 text-center font-bold text-indigo-600">{a.nombre_details ?? 0}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => navigate(`/details-appel?appel=${a.id}&residence=${residenceId}&filtre=${filtre}`)}
                        className="px-2.5 py-1 rounded-lg border border-emerald-500 bg-emerald-500 text-xs hover:bg-emerald-600 hover:border-emerald-600 transition text-white font-semibold"
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="px-2.5 py-1 rounded-lg border border-indigo-200 text-xs hover:bg-indigo-50 transition text-indigo-600"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-xs hover:bg-red-50 transition text-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Modal create/edit ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-base">
              {editing
                ? "✏️ Modifier l'appel"
                : filtre === "FOND" ? "➕ Nouvel appel de fond" : "➕ Nouvel appel de charge"}
            </h2>

            {/* Type — verrouillé selon la page */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
              <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium">
                {form.type_charge === "FOND" ? "Appel de fond" : "Appel de charge"}
              </div>
            </div>

            {/* Exercice */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Exercice *</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.exercice}
                onChange={(e) => setForm((p) => ({ ...p, exercice: parseInt(e.target.value) || p.exercice }))}
              />
              {errors.exercice && <p className="text-xs text-red-500 mt-1">{errors.exercice}</p>}
            </div>


            {/* Nom — CHARGE et FOND */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {form.type_charge === "FOND" ? "Nom du fond" : "Libellé de l'appel"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={form.type_charge === "FOND" ? "ex : Ravalement façade" : "ex : Charges communes janvier"}
                value={form.nom_fond}
                onChange={(e) => setForm((p) => ({ ...p, nom_fond: e.target.value }))}
              />
            </div>

            {/* Code fond — read-only, auto-generated */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Code référence <span className="text-slate-300 font-normal normal-case">(généré automatiquement)</span>
              </label>
              <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-500 tracking-wide">
                {editing && form._code_fond
                  ? form._code_fond
                  : form.type_charge === "FOND"
                    ? `AF_${form.exercice} …`
                    : `ANNEE_${form.exercice}`}
              </div>
            </div>

            {/* Date émission */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date d'émission</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.date_emission}
                onChange={(e) => setForm((p) => ({ ...p, date_emission: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={2}
                value={form.description_appel}
                onChange={(e) => setForm((p) => ({ ...p, description_appel: e.target.value }))}
              />
            </div>

            {/* Erreurs globales */}
            {Object.keys(errors).length > 0 && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200 space-y-1">
                {Object.entries(errors).map(([field, msg]) => (
                  <p key={field}>⚠️ <span className="font-medium">{field}:</span> {Array.isArray(msg) ? msg.join(" ") : String(msg)}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}
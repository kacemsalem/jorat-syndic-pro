import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = "/api";

const emptyLot = {
  numero_lot:    "",
  surface_lot:   "",
  etage_lot:     "",
  type_lot:      "APPARTEMENT",
  statut_lot:    "A_JOUR",
  montant_ref:   "",
  remarque_lot:  "",
  groupe:        "",
  representant:  "",
};

const inputCls  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white";
const selectCls = inputCls;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const STATUT_CONFIG = {
  A_JOUR:    { label: "À jour",    cls: "bg-emerald-100 text-emerald-700" },
  EN_RETARD: { label: "En retard", cls: "bg-amber-100 text-amber-700"    },
  REFUS:     { label: "Refus",     cls: "bg-red-100 text-red-600"        },
};

const TYPE_LOT_OPTIONS = [
  { value: "APPARTEMENT", label: "Appartement" },
  { value: "VILLA",       label: "Villa"        },
  { value: "MAISON",      label: "Maison"       },
  { value: "LOCAL",       label: "Local"        },
  { value: "COMMERCE",    label: "Commerce"     },
  { value: "BUREAU",      label: "Bureau"       },
  { value: "AUTRE",       label: "Autre"        },
];

export default function LotsPage() {
  const { id }            = useParams();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const isEdit            = Boolean(id);
  const residenceFromQuery = searchParams.get("residence");

  const [form, setForm]           = useState(emptyLot);
  const [residenceId, setResidenceId] = useState("");
  const [groupes, setGroupes]     = useState([]);
  const [personnes, setPersonnes] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit) loadLot();
    else if (residenceFromQuery) setResidenceId(residenceFromQuery);
  }, [id]);

  useEffect(() => {
    if (residenceId) { loadGroupes(); loadPersonnes(); }
  }, [residenceId]);

  // ── Chargement ────────────────────────────────────────────
  const loadLot = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE}/lots/${id}/`);
      const data = await res.json();
      setResidenceId(data.residence);
      setForm({
        numero_lot:   data.numero_lot   ?? "",
        surface_lot:  data.surface_lot  ?? "",
        etage_lot:    data.etage_lot    ?? "",
        type_lot:     data.type_lot     ?? "APPARTEMENT",
        statut_lot:   data.statut_lot   ?? "A_JOUR",
        montant_ref:  data.montant_ref  ?? "",
        remarque_lot: data.remarque_lot ?? "",
        groupe:       data.groupe       ?? "",
        representant: data.representant?.id ?? "",
      });
    } catch {
      setError("Erreur chargement du lot");
    } finally {
      setLoading(false);
    }
  };

  const loadGroupes = async () => {
    const res  = await fetch(`${API_BASE}/groupes/?residence=${residenceId}`);
    const data = await res.json();
    setGroupes(data.results ?? data);
  };

  const loadPersonnes = async () => {
    const res  = await fetch(`${API_BASE}/personnes/?residence=${residenceId}`);
    const data = await res.json();
    setPersonnes(data.results ?? data);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = {
      numero_lot:       form.numero_lot,
      surface_lot:      form.surface_lot  || null,
      etage_lot:        form.etage_lot    || "",
      type_lot:         form.type_lot,
      statut_lot:       form.statut_lot,
      montant_ref:      form.montant_ref  || 0,
      remarque_lot:     form.remarque_lot || "",
      groupe:           form.groupe       || null,
      residence:        residenceId,
      proprietaire_id:  null,
      occupant_id:      null,
      representant_id:  form.representant || null,
    };
    try {
      const method = isEdit ? "PATCH" : "POST";
      const url    = isEdit ? `${API_BASE}/lots/${id}/` : `${API_BASE}/lots/`;
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      navigate(`/kanban?residence=${residenceId}`);
    } catch {
      setError("Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce lot ?")) return;
    await fetch(`${API_BASE}/lots/${id}/`, { method: "DELETE" });
    navigate(`/kanban?residence=${residenceId}`);
  };

  // ── Guards ────────────────────────────────────────────────
  if (!isEdit && !residenceId) return (
    <div className="text-center mt-20">
      <p className="text-red-600 font-medium">Aucune résidence sélectionnée.</p>
    </div>
  );

  if (loading) return (
    <div className="text-center mt-10 text-slate-400 text-sm">Chargement…</div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? form.numero_lot : "Nouveau lot"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEdit ? "Modifier les informations du lot" : "Créer un nouveau lot"}
          </p>
        </div>
        {isEdit && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUT_CONFIG[form.statut_lot]?.cls}`}>
            {STATUT_CONFIG[form.statut_lot]?.label}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Bloc 1 : Identification ── */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Numéro du lot" required>
              <input
                className={inputCls}
                placeholder="ex : A-101"
                value={form.numero_lot}
                onChange={(e) => setForm({ ...form, numero_lot: e.target.value })}
                required
              />
            </Field>

            <Field label="Type de lot">
              <select
                className={selectCls}
                value={form.type_lot}
                onChange={(e) => setForm({ ...form, type_lot: e.target.value })}
              >
                {TYPE_LOT_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Surface (m²)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={form.surface_lot}
                onChange={(e) => setForm({ ...form, surface_lot: e.target.value })}
              />
            </Field>

            <Field label="Étage">
              <input
                className={inputCls}
                placeholder="ex : 2"
                value={form.etage_lot}
                onChange={(e) => setForm({ ...form, etage_lot: e.target.value })}
              />
            </Field>

            <Field label="Montant réf. (MAD)">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${inputCls} pr-14`}
                  placeholder="0.00"
                  value={form.montant_ref}
                  onChange={(e) => setForm({ ...form, montant_ref: e.target.value })}
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">MAD</span>
              </div>
            </Field>
          </div>

          <Field label="Groupe">
            <div className="flex gap-2">
              <select
                className={selectCls}
                value={form.groupe}
                onChange={(e) => setForm({ ...form, groupe: e.target.value })}
              >
                <option value="">— Sans groupe —</option>
                {groupes.map((g) => (
                  <option key={g.id} value={g.id}>{g.nom_groupe}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => navigate(`/groupes?residence=${residenceId}`)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition"
                title="Gérer les groupes"
              >
                +
              </button>
            </div>
          </Field>
        </div>

        {/* ── Bloc 2 : Contact ── */}
        {/* ── Bloc 2 : Contact + Remarque ── */}
<div className="bg-white rounded-2xl shadow p-5 space-y-4">
  
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

    {/* Contact */}
    <Field label="Représentant / Contact">
      <div className="flex gap-2">
        <select
          className={selectCls}
          value={form.representant}
          onChange={(e) => setForm({ ...form, representant: e.target.value })}
        >
          <option value="">— Aucun —</option>
          {personnes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom} {p.prenom || ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate(`/personnes?residence=${residenceId}`)}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition"
          title="Gérer les contacts"
        >
          +
        </button>
      </div>
    </Field>

    {/* Remarque */}
    <Field label="Remarque">
      <textarea
        className={`${inputCls} resize-none`}
        rows={3}
        placeholder="Observations, notes particulières…"
        value={form.remarque_lot}
        onChange={(e) => setForm({ ...form, remarque_lot: e.target.value })}
      />
    </Field>

        </div>
      </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm hover:bg-red-100 transition"
              >
                🗑️ Supprimer
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/kanban?residence=${residenceId}`)}
              className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le lot"}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
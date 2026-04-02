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
  tantiemes:     "",
  remarque_lot:  "",
  groupe:        "",
  representant:  "",
};

const inputCls  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition bg-white";
const selectCls = inputCls;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const STATUT_CONFIG = {
  A_JOUR:    { label: "À jour",    cls: "bg-blue-100 text-blue-700"   },
  EN_RETARD: { label: "En retard", cls: "bg-amber-100 text-amber-700" },
  REFUS:     { label: "Refus",     cls: "bg-red-100 text-red-600"     },
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
        tantiemes:    data.tantiemes    ?? "",
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
      tantiemes:        form.tantiemes !== "" ? parseFloat(form.tantiemes) : null,
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
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Lot</p>
            <h1 className="text-white font-bold text-lg leading-tight">
              {isEdit ? form.numero_lot || "Modifier le lot" : "Nouveau lot"}
            </h1>
          </div>
          {isEdit && (
            <span className={`ml-auto text-[10px] px-2.5 py-1 rounded-full font-semibold ${STATUT_CONFIG[form.statut_lot]?.cls}`}>
              {STATUT_CONFIG[form.statut_lot]?.label}
            </span>
          )}
        </div>
        <p className="text-white/50 text-[10px] mt-2">
          {isEdit ? "Modifier les informations du lot" : "Créer un nouveau lot"}
        </p>
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        {error && (
          <div className="text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Bloc 1 : Identification ── */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identification</p>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-3 gap-3">
              <Field label="Surface (m²)">
                <input
                  type="number" min={0} step="0.01"
                  className={inputCls} placeholder="0.00"
                  value={form.surface_lot}
                  onChange={(e) => setForm({ ...form, surface_lot: e.target.value })}
                />
              </Field>
              <Field label="Étage">
                <input
                  className={inputCls} placeholder="ex : 2"
                  value={form.etage_lot}
                  onChange={(e) => setForm({ ...form, etage_lot: e.target.value })}
                />
              </Field>
              <Field label="Montant réf. (MAD)">
                <div className="relative">
                  <input
                    type="number" min={0} step="0.01"
                    className={`${inputCls} pr-14`} placeholder="0.00"
                    value={form.montant_ref}
                    onChange={(e) => setForm({ ...form, montant_ref: e.target.value })}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">MAD</span>
                </div>
              </Field>
              <Field label="Tantième (‰)">
                <div className="relative">
                  <input
                    type="number" min={0} max={1000} step="0.01"
                    className={`${inputCls} pr-10`} placeholder="ex : 85.50"
                    value={form.tantiemes}
                    onChange={(e) => setForm({ ...form, tantiemes: e.target.value })}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">‰</span>
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
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition"
                  title="Gérer les groupes"
                >
                  +
                </button>
              </div>
            </Field>
          </div>

          {/* ── Bloc 2 : Contact + Remarque ── */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact &amp; Notes</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition"
                    title="Gérer les contacts"
                  >
                    +
                  </button>
                </div>
              </Field>

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
          <div className="flex items-center gap-3 pt-1">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm hover:bg-red-100 transition"
              >
                🗑️ Supprimer
              </button>
            )}
            <div className="flex-1" />
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
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le lot"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = "/api";

const STATUT_BADGE = {
  NON_PAYE: "bg-red-100 text-red-700",
  PARTIEL:  "bg-amber-100 text-amber-700",
  PAYE:     "bg-emerald-100 text-emerald-700",
};

export default function DetailsAppelPage() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const params      = new URLSearchParams(location.search);
  const appelId     = params.get("appel");
  const residenceId = params.get("residence") || localStorage.getItem("active_residence");
  const filtre      = params.get("filtre") || "CHARGE";

  const [appel, setAppel]                     = useState(null);
  const [details, setDetails]                 = useState([]);
  const [lots, setLots]                       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [form, setForm]                       = useState({ lot: "", montant: "" });
  const [errors, setErrors]                   = useState({});
  const [saving, setSaving]                   = useState(false);
  const [addingAll, setAddingAll]             = useState(false);
  const [showMontantFond, setShowMontantFond] = useState(false);
  const [montantFond, setMontantFond]         = useState("");
  const [sortDir, setSortDir]                 = useState("asc");

  const lotsDejaAjoutes = details.map((d) => d.lot);

  // ── Chargement appel ────────────────────────────────────
  useEffect(() => {
    if (!appelId) return;
    fetch(`${API}/appels-charge/${appelId}/`)
      .then((r) => r.json())
      .then(setAppel);
  }, [appelId]);

  // ── Chargement détails ──────────────────────────────────
  const fetchDetails = () => {
    if (!appelId) return;
    setLoading(true);
    fetch(`${API}/details-appel/?appel=${appelId}`)
      .then((r) => r.json())
      .then((data) => setDetails(Array.isArray(data) ? data : (data.results ?? [])))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDetails(); }, [appelId]);

  // ── Chargement lots ─────────────────────────────────────
  useEffect(() => {
    if (!residenceId) return;
    fetch(`${API}/lots/?residence=${residenceId}`)
      .then((r) => r.json())
      .then((data) => setLots(Array.isArray(data) ? data : (data.results ?? [])));
  }, [residenceId]);

  // ── Modal création/édition ──────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm({ lot: "", montant: "" });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (detail) => {
    setEditing(detail.id);
    setForm({ lot: detail.lot, montant: detail.montant });
    setErrors({});
    setShowModal(true);
  };

  // ── Sauvegarde ──────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setErrors({});
    const url    = editing ? `${API}/details-appel/${editing}/` : `${API}/details-appel/`;
    const method = editing ? "PATCH" : "POST";

    const payload = {
      appel:     parseInt(appelId),
      residence: parseInt(residenceId),
      lot:       parseInt(form.lot),
      montant:   parseFloat(form.montant),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowModal(false);
        fetchDetails();
      } else {
        const data = await res.json();
        console.error("Erreur API:", data);
        setErrors(data);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Suppression ─────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce détail ?")) return;
    await fetch(`${API}/details-appel/${id}/`, { method: "DELETE" });
    fetchDetails();
  };

  // ── Pré-remplir montant depuis lot ──────────────────────
  const handleLotChange = (lotId) => {
    const lot = lots.find((l) => l.id === parseInt(lotId));
    setForm({ lot: lotId, montant: lot?.montant_ref ?? "" });
  };

  // ── Ajout tous les lots ─────────────────────────────────
  const lotsNonAjoutes = lots.filter((l) => !lotsDejaAjoutes.includes(l.id));

  const handleAddAllLots = () => {
    if (lotsNonAjoutes.length === 0) { alert("Tous les lots sont déjà ajoutés."); return; }
    if (appel?.type_charge === "FOND") {
      setShowMontantFond(true);
    } else {
      executeAddAll(lotsNonAjoutes, null);
    }
  };

  const executeAddAll = async (lotsATraiter, montantFixe) => {
    setAddingAll(true);
    setShowMontantFond(false);
    try {
      for (const lot of lotsATraiter) {
        await fetch(`${API}/details-appel/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appel:     parseInt(appelId),
            residence: parseInt(residenceId),
            lot:       lot.id,
            montant:   montantFixe !== null ? parseFloat(montantFixe) : parseFloat(lot.montant_ref ?? 0),
          }),
        });
      }
      setMontantFond("");
      fetchDetails();
    } catch {
      alert("Erreur lors de l'ajout en masse.");
    } finally {
      setAddingAll(false);
    }
  };

  // ── Total ────────────────────────────────────────────────
  const total = details.reduce((sum, d) => sum + parseFloat(d.montant || 0), 0);

  // ── Lots disponibles dans le modal ──────────────────────
  const lotsDisponibles = lots.filter(
    (l) => !lotsDejaAjoutes.includes(l.id) || l.id === parseInt(form.lot)
  );

  // ── Détails triés ────────────────────────────────────────
  const detailsTries = [...details].sort((a, b) => {
    const gCmp = (a.lot_groupe_nom ?? "").localeCompare(b.lot_groupe_nom ?? "", "fr");
    if (gCmp !== 0) return sortDir === "asc" ? gCmp : -gCmp;
    const lCmp = (a.lot_numero ?? "").localeCompare(b.lot_numero ?? "", "fr", { numeric: true });
    return sortDir === "asc" ? lCmp : -lCmp;
  });

  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ── Render ───────────────────────────────────────────────
  return (
    <div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(`/appels-charge?residence=${residenceId}&filtre=${filtre}`)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
        >
          ← {filtre === "FOND" ? "Appels de fond" : "Appels de charge"}
        </button>
        {appel && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium text-sm">{appel.code_fond}</span>
          </>
        )}
      </div>

      {/* En-tête appel */}
      {appel && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Code</p>
            <p className="font-semibold text-indigo-700">{appel.code_fond}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Type</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              appel.type_charge === "FOND"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {appel.type_charge_label}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Exercice</p>
            <p className="font-medium">{appel.exercice}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Nom</p>
            <p className="font-medium">{appel.nom_fond || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Total</p>
            <p className="font-bold text-slate-800">
              {total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
            </p>
          </div>
        </div>
      )}

      {/* Titre + boutons */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-700">
          Détails — {details.length} lot{details.length > 1 ? "s" : ""}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={handleAddAllLots}
            disabled={addingAll || lotsNonAjoutes.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-40 flex items-center gap-2 transition"
          >
            {addingAll ? (
              <>⟳ Ajout en cours…</>
            ) : (
              <>
                ⊞ Tous les lots
                {lotsNonAjoutes.length > 0 && (
                  <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {lotsNonAjoutes.length}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={openCreate}
            disabled={lotsDisponibles.length === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-40 transition"
          >
            + Ajouter par lot
          </button>
        </div>
      </div>

      {/* Kanban par statut */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : details.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun détail pour cet appel.</p>
      ) : (
        <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: "NON_PAYE", label: "Non payé",  color: "bg-red-600",     light: "bg-red-50 border-red-100"         },
            { key: "PARTIEL",  label: "Partiel",   color: "bg-amber-500",   light: "bg-amber-50 border-amber-100"     },
            { key: "PAYE",     label: "Payé",      color: "bg-emerald-600", light: "bg-emerald-50 border-emerald-100" },
          ].map(({ key, label, color, light }) => {
            const cartes = detailsTries.filter(d => d.statut === key);
            const colTotal = cartes.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
            return (
              <div key={key}>
                {/* En-tête colonne */}
                <div className={`${color} text-white rounded-xl px-3 py-2 mb-2 flex items-center justify-between`}>
                  <span className="font-bold text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    {cartes.length > 0 && <span className="font-mono text-xs opacity-80">{colTotal.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD</span>}
                    <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{cartes.length}</span>
                  </div>
                </div>
                {/* Cartes */}
                <div className="space-y-2">
                  {cartes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-300">Aucun lot</div>
                  ) : cartes.map(d => (
                    <div key={d.id} className={`rounded-xl border ${light} px-3 py-2 shadow-sm hover:shadow-md transition-shadow`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-700 text-sm">{d.lot_numero}</span>
                            <span className="font-mono text-xs text-slate-500">{parseFloat(d.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</span>
                          </div>
                          {d.contact_nom ? (
                            <p className="text-xs text-slate-500 truncate">{d.contact_nom} {d.contact_prenom ?? ""}{d.contact_telephone ? ` · ${d.contact_telephone}` : ""}</p>
                          ) : (
                            <p className="text-xs text-slate-300 italic">Aucun contact</p>
                          )}
                        </div>
                        {/* Menu 3 points */}
                        <div className="relative ml-2 flex-shrink-0">
                          <button onClick={() => setOpenMenu(openMenu === d.id ? null : d.id)}
                            className="p-1 rounded-lg hover:bg-white/70 text-slate-400 hover:text-slate-600 transition">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                            </svg>
                          </button>
                          {openMenu === d.id && (
                            <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-32 py-1 text-xs">
                              <button onClick={() => { openEdit(d); setOpenMenu(null); }}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-indigo-600">
                                ✏️ Modifier
                              </button>
                              <button onClick={() => { handleDelete(d.id); setOpenMenu(null); }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-500">
                                🗑️ Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ajout/édition lot */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-700 mb-4">
              {editing ? "Modifier le détail" : "Ajouter un lot"}
            </h2>

            <div className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Lot <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.lot}
                  onChange={(e) => handleLotChange(e.target.value)}
                  disabled={!!editing}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">— Sélectionner un lot —</option>
                  {lotsDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.numero_lot}
                      {l.representant
                        ? ` — ${l.representant.nom} ${l.representant.prenom ?? ""}`
                        : ""}
                    </option>
                  ))}
                </select>
                {errors.lot && <p className="text-red-500 text-xs mt-1">{errors.lot}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Montant <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 text-sm">MAD</span>
                </div>
                {form.lot && lots.find((l) => l.id === parseInt(form.lot))?.montant_ref > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Montant de référence :{" "}
                    {parseFloat(lots.find((l) => l.id === parseInt(form.lot)).montant_ref)
                      .toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                    MAD
                  </p>
                )}
                {errors.montant && <p className="text-red-500 text-xs mt-1">{errors.montant}</p>}
              </div>

              {errors.non_field_errors && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-600 text-xs">
                    {Array.isArray(errors.non_field_errors)
                      ? errors.non_field_errors.join(" ")
                      : errors.non_field_errors}
                  </p>
                </div>
              )}
              {errors.detail && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-600 text-xs">{errors.detail}</p>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.lot || !form.montant}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal montant fond */}
      {showMontantFond && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-700 mb-1">Montant par lot</h2>
            <p className="text-xs text-slate-400 mb-4">
              Ce montant sera appliqué aux{" "}
              <span className="font-semibold text-slate-600">
                {lotsNonAjoutes.length} lot{lotsNonAjoutes.length > 1 ? "s" : ""}
              </span>{" "}
              non encore ajoutés.
            </p>

            <div className="relative mb-4">
              <input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                value={montantFond}
                onChange={(e) => setMontantFond(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="absolute right-3 top-2 text-slate-400 text-sm">MAD</span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowMontantFond(false); setMontantFond(""); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!montantFond || parseFloat(montantFond) < 0) {
                    alert("Veuillez saisir un montant valide.");
                    return;
                  }
                  executeAddAll(lotsNonAjoutes, parseFloat(montantFond));
                }}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
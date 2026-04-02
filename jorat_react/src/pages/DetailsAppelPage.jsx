import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = "/api";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

export default function DetailsAppelPage() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const params      = new URLSearchParams(location.search);
  const appelId     = params.get("appel");
  const residenceId = params.get("residence") || localStorage.getItem("active_residence");
  const filtre      = params.get("filtre") || "CHARGE";

  const modeHisto = params.get("mode") === "historique";

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

  // ── Récupérer historique (mode=historique uniquement) ───
  const [checkedIds,       setCheckedIds]       = useState(new Set());
  const [showHistoConfirm, setShowHistoConfirm] = useState(false);
  const [doingHisto,       setDoingHisto]       = useState(false);
  const [histoResult,      setHistoResult]      = useState(null);

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
      .then((data) => {
        setDetails(Array.isArray(data) ? data : (data.results ?? []));
        setCheckedIds(new Set());
      })
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

  // ── Checkboxes ───────────────────────────────────────────
  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const elegibles = detailsTries.filter(d => parseFloat(d.montant) - parseFloat(d.montant_recu || 0) > 0.001);
    const allChecked = elegibles.length > 0 && elegibles.every(d => checkedIds.has(d.id));
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(elegibles.map(d => d.id)));
    }
  };

  // ── Récupérer historique ────────────────────────────────
  const checkedWithSolde = details.filter(d => {
    if (!checkedIds.has(d.id)) return false;
    const solde = parseFloat(d.montant) - parseFloat(d.montant_recu || 0);
    return solde > 0.001;
  });

  const handleHistoConfirm = async () => {
    setDoingHisto(true);
    try {
      const res = await fetch(`${API}/details-appel/recuperer-historique/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ detail_ids: checkedWithSolde.map(d => d.id) }),
      });
      const data = await res.json();
      if (res.ok) {
        setHistoResult(data);
        setShowHistoConfirm(false);
        fetchDetails();
      } else {
        alert(data.detail || "Erreur lors de la récupération.");
        setShowHistoConfirm(false);
      }
    } finally {
      setDoingHisto(false);
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

  const elegibles = detailsTries.filter(d => parseFloat(d.montant) - parseFloat(d.montant_recu || 0) > 0.001);
  const allChecked = elegibles.length > 0 && elegibles.every(d => checkedIds.has(d.id));

  const totalHisto = checkedWithSolde.reduce((s, d) =>
    s + (parseFloat(d.montant) - parseFloat(d.montant_recu || 0)), 0);

  const fmt = (n) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header compact ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-6">
        <button
          onClick={() => navigate(`/appels-charge?residence=${residenceId}&filtre=${filtre}`)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium mb-3 transition"
        >
          ← {filtre === "FOND" ? "Appels de fond" : "Appels de charge"}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base leading-tight">
              {appel ? (appel.type_charge === "FOND" ? (appel.nom_fond || appel.code_fond) : appel.code_fond) : "Détail appel"}
            </h1>
            {appel && (
              <p className="text-white/60 text-[10px] mt-0.5">
                {appel.type_charge_label} · Exercice {appel.exercice}
                {appel.type_charge === "FOND" && appel.code_fond ? ` · ${appel.code_fond}` : ""}
                {" · "}
                <span className="font-semibold text-white/80">{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</span>
                {" · "}
                {details.length} lot{details.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 justify-end">
            {/* Récupérer historique — mode import uniquement */}
            {modeHisto && (
              <button
                onClick={() => { setHistoResult(null); setShowHistoConfirm(true); }}
                disabled={checkedWithSolde.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-40 transition"
              >
                ⟳ Historique ({checkedWithSolde.length})
              </button>
            )}
            <button
              onClick={handleAddAllLots}
              disabled={addingAll || lotsNonAjoutes.length === 0}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 disabled:opacity-40 transition"
            >
              {addingAll ? "Ajout…" : `⊞ ${lotsNonAjoutes.length}`}
            </button>
            <button
              onClick={openCreate}
              disabled={lotsDisponibles.length === 0}
              className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-40 transition"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Banner résultat historique — mode import uniquement */}
        {modeHisto && histoResult && (
          <div className="mt-3 bg-emerald-500/90 text-white text-xs rounded-xl px-3 py-2 flex items-center justify-between">
            <span>
              ✓ {histoResult.created} paiement{histoResult.created !== 1 ? "s" : ""} créé{histoResult.created !== 1 ? "s" : ""}
              {histoResult.skipped > 0 ? ` · ${histoResult.skipped} ignoré(s)` : ""}
            </span>
            <button onClick={() => setHistoResult(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* ── Liste lots (flat, triée par lot) ── */}
      <div className="px-4 -mt-4 pb-24 max-w-5xl mx-auto">
        {loading ? (
          <p className="text-slate-400 text-sm py-8 text-center">Chargement…</p>
        ) : details.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">Aucun détail pour cet appel.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header avec sélection globale — mode import uniquement */}
            {modeHisto && elegibles.length > 0 && (
              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Sélectionner les impayés ({elegibles.length})
                </span>
                {checkedIds.size > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-amber-600">
                    {checkedIds.size} sélectionné{checkedIds.size > 1 ? "s" : ""} · {fmt(totalHisto)} MAD
                  </span>
                )}
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {detailsTries.map(d => {
                const montant  = parseFloat(d.montant || 0);
                const recu     = parseFloat(d.montant_recu || 0);
                const solde    = montant - recu;
                const pct      = montant > 0 ? Math.min((recu / montant) * 100, 100) : 0;
                const dotColor = { NON_PAYE: "bg-red-500", PARTIEL: "bg-amber-400", PAYE: "bg-emerald-500" }[d.statut] ?? "bg-slate-300";
                const isElegible = solde > 0.001;
                const isChecked  = checkedIds.has(d.id);

                return (
                  <div key={d.id} className={`px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition ${modeHisto && isChecked ? "bg-amber-50" : ""}`}>
                    {/* Checkbox — mode import uniquement */}
                    {modeHisto && (
                      <div className="w-4 shrink-0 flex items-center justify-center">
                        {isElegible ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(d.id)}
                            className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                          />
                        ) : (
                          <div className="w-3.5 h-3.5" />
                        )}
                      </div>
                    )}
                    {/* Dot statut */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                    {/* Numéro lot */}
                    <span className="font-bold text-slate-700 text-sm w-10 shrink-0">{d.lot_numero}</span>
                    {/* Contact + progress */}
                    <div className="flex-1 min-w-0">
                      {d.contact_nom ? (
                        <p className="text-xs text-slate-500 truncate">{d.contact_nom} {d.contact_prenom ?? ""}</p>
                      ) : (
                        <p className="text-xs text-slate-300">—</p>
                      )}
                      {d.statut !== "NON_PAYE" && montant > 0 && (
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${pct}%`,
                            background: d.statut === "PAYE" ? "#10b981" : "#f59e0b",
                          }} />
                        </div>
                      )}
                    </div>
                    {/* Montants */}
                    <div className="text-right shrink-0 min-w-[80px]">
                      <p className="text-xs font-mono font-semibold text-slate-700">{montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</p>
                      {recu > 0 && <p className="text-[10px] font-mono text-emerald-600">+{recu.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</p>}
                      {solde > 0.01 && <p className="text-[10px] font-mono text-red-500">−{solde.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</p>}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => openEdit(d)} title="Modifier"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(d.id)} title="Supprimer"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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

      {/* Modal confirmation récupérer historique */}
      {showHistoConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            {/* Titre + icône */}
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg">⟳</div>
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-tight">Injection de l'historique des paiements</h2>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Exercice {appel?.exercice} — {appel?.type_charge_label}</p>
              </div>
            </div>

            {/* Explication principale */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-900 space-y-2 leading-relaxed">
              <p>
                <strong>Vous vous apprêtez à injecter dans la caisse les paiements historiques de l'exercice {appel?.exercice}.</strong>
              </p>
              <p>
                Cette opération suppose que les résidents sélectionnés ont <strong>déjà payé</strong> leurs charges
                dans le passé, mais que ces paiements n'ont pas encore été enregistrés dans le système.
              </p>
              <p>
                Pour chaque lot coché, un paiement de régularisation sera créé, daté du{" "}
                <strong>1er janvier {appel?.exercice}</strong>, couvrant l'intégralité du solde dû et
                affecté automatiquement à la dette correspondante.
              </p>
              <p className="text-amber-700">
                ⚠ Cette action <strong>solde définitivement</strong> les lots sélectionnés pour cet appel.
                Ne l'utilisez que si les paiements ont bien eu lieu dans la réalité.
              </p>
            </div>

            {/* Récap lots */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {checkedWithSolde.length} lot{checkedWithSolde.length > 1 ? "s" : ""} concerné{checkedWithSolde.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-1">
                {checkedWithSolde.map(d => {
                  const solde = parseFloat(d.montant) - parseFloat(d.montant_recu || 0);
                  return (
                    <div key={d.id} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">Lot {d.lot_numero}</span>
                      <span className="font-mono text-slate-600">{fmt(solde)} MAD</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-xs font-bold">
                <span className="text-slate-700">Total injecté</span>
                <span className="font-mono text-amber-700">{fmt(totalHisto)} MAD</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 mb-5">
              ℹ Les paiements seront référencés <em>"Régularisation historique"</em> et apparaîtront
              dans la caisse à la date du 1er janvier {appel?.exercice}.
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowHistoConfirm(false)}
                disabled={doingHisto}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200">
                Annuler
              </button>
              <button onClick={handleHistoConfirm}
                disabled={doingHisto}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold disabled:opacity-60">
                {doingHisto ? "Injection en cours…" : `Confirmer — ${fmt(totalHisto)} MAD`}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

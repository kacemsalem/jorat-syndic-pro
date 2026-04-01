import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import API, { fetchJson } from "../api";
import ChartPaiements from "../components/ChartPaiements";

// ── Constants ─────────────────────────────────────────────────
const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white";

const STATUT_BADGE = {
  NON_PAYE: "bg-red-100 text-red-700",
  PARTIEL:  "bg-amber-100 text-amber-700",
  PAYE:     "bg-emerald-100 text-emerald-700",
};

const MOIS_OPTIONS = [
  { value: "JAN", label: "Jan" }, { value: "FEV", label: "Fév" },
  { value: "MAR", label: "Mar" }, { value: "AVR", label: "Avr" },
  { value: "MAI", label: "Mai" }, { value: "JUN", label: "Jun" },
  { value: "JUL", label: "Jul" }, { value: "AOU", label: "Aoû" },
  { value: "SEP", label: "Sep" }, { value: "OCT", label: "Oct" },
  { value: "NOV", label: "Nov" }, { value: "DEC", label: "Déc" },
];

const MODE_OPTIONS = [
  { value: "ESPECES",  label: "Espèces"  },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE",   label: "Chèque"   },
];

const ORDRE_PERIODE = { ANNEE: 0, FOND: 1 };

// ── Helpers ────────────────────────────────────────────────────
const fmt = (v) => parseFloat(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Alert = ({ type, children }) => {
  const s = {
    error:   "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <div className={`text-xs rounded-xl border px-3 py-2 ${s[type]}`}>{children}</div>;
};

const Modal = ({ children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">{children}</div>
  </div>
);

// ── Lot list (step 1) ──────────────────────────────────────────
function LotPicker({ lots, groupes, onSelect }) {
  const [search, setSearch] = useState("");
  const [groupeFilter, setGroupeFilter] = useState("");

  const groupeMap = useMemo(() => {
    const m = {};
    groupes.forEach(g => { m[g.id] = g.nom_groupe; });
    return m;
  }, [groupes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = lots;
    if (q) result = result.filter(l => {
      const owner = l.representant ? `${l.representant.nom ?? ""} ${l.representant.prenom ?? ""}`.toLowerCase() : "";
      return l.numero_lot.toLowerCase().includes(q) || owner.includes(q);
    });
    if (groupeFilter) result = result.filter(l => String(l.groupe ?? "NONE") === groupeFilter);
    return result;
  }, [lots, search, groupeFilter]);

  // Group by groupe, sorted by groupe name then lot number
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(l => {
      const key = l.groupe ?? "NONE";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    });
    // Sort groups: named groups alphabetically, then "Sans groupe" last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "NONE") return 1;
      if (b === "NONE") return -1;
      return (groupeMap[a] ?? "").localeCompare(groupeMap[b] ?? "", "fr");
    });
  }, [filtered, groupeMap]);

  const LotCard = ({ l }) => {
    const owner = l.representant
      ? `${l.representant.nom ?? ""} ${l.representant.prenom ?? ""}`.trim()
      : null;
    return (
      <button
        onClick={() => onSelect(l)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition text-left group w-full"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-black text-indigo-600 leading-none">{l.numero_lot}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700">{l.numero_lot}</p>
          <p className="text-[10px] text-slate-400 truncate">{owner || "—"}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {groupes.length > 1 && (
        <select
          value={groupeFilter}
          onChange={e => setGroupeFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
        >
          <option value="">Tous les groupes</option>
          {[...groupes].sort((a,b) => a.nom_groupe.localeCompare(b.nom_groupe,"fr")).map(g => (
            <option key={g.id} value={String(g.id)}>{g.nom_groupe}</option>
          ))}
        </select>
      )}
      <div className="relative">
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Rechercher lot ou propriétaire…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">Aucun lot trouvé</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([groupeId, groupLots]) => (
            <div key={groupeId}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                {groupeId === "NONE" ? "Sans groupe" : (groupeMap[groupeId] ?? `Groupe #${groupeId}`)}
                <span className="ml-1.5 font-normal normal-case">({groupLots.length})</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                {groupLots.map(l => <LotCard key={l.id} l={l} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function PaiementPage() {
  const location    = useLocation();
  const params      = new URLSearchParams(location.search);
  const residenceId = params.get("residence") || localStorage.getItem("active_residence");
  const lotParam    = params.get("lot") || "";

  const [typeAppel, setTypeAppel]   = useState("CHARGE");
  const [lots, setLots]             = useState([]);
  const [groupes, setGroupes]       = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [allDetails, setAllDetails] = useState([]);
  const [paiements, setPaiements]   = useState([]);

  const [form, setForm] = useState({
    montant: "", date_paiement: new Date().toISOString().split("T")[0],
    reference: "", mois: "", mode_paiement: "",
  });
  const [editingPaiement, setEditingPaiement] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [ventilating, setVentilating] = useState(false);
  const [deleting, setDeleting]       = useState(null);
  const [error, setError]             = useState("");
  const [info, setInfo]               = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [paiementToVentile, setPaiementToVentile] = useState(null);
  const [resultVentilation, setResultVentilation] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paiementToDelete, setPaiementToDelete]   = useState(null);
  const [showSaveConfirm, setShowSaveConfirm]     = useState(false);
  const [chartYears, setChartYears] = useState([]);
  const [chartYear,  setChartYear]  = useState(new Date().getFullYear());

  // ── Chart years fetch ──────────────────────────────────────
  useEffect(() => {
    fetch("/api/situation-paiements/?type_charge=CHARGE", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const yrs = d.years || [];
        if (yrs.length > 0) {
          setChartYears(yrs);
          const cur = new Date().getFullYear();
          setChartYear(yrs.includes(cur) ? cur : yrs[yrs.length - 1]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Data fetching ──────────────────────────────────────────
  const fetchAllDetails = (lotId, type = typeAppel) => {
    fetchJson(`${API}/details-appel/?lot=${lotId}&type_charge=${type}`).then(({ data }) => {
      const all = Array.isArray(data) ? data : (data?.results ?? []);
      setAllDetails([...all].sort((a, b) => {
        const exoDiff = (a.appel_exercice ?? 0) - (b.appel_exercice ?? 0);
        if (exoDiff !== 0) return exoDiff;
        const pA = ORDRE_PERIODE[a.appel_periode] ?? 99;
        const pB = ORDRE_PERIODE[b.appel_periode] ?? 99;
        if (pA !== pB) return pA - pB;
        return (a.appel_code ?? "").localeCompare(b.appel_code ?? "", "fr", { numeric: true });
      }));
    });
  };

  const fetchPaiements = (lotId) => {
    fetchJson(`${API}/paiements/?lot=${lotId}`).then(({ data }) => {
      const rows = Array.isArray(data) ? data : (data?.results ?? []);
      setPaiements([...rows].sort((a, b) => (a.date_paiement ?? "").localeCompare(b.date_paiement ?? "")));
    });
  };

  useEffect(() => {
    if (!residenceId) return;
    Promise.all([
      fetchJson(`${API}/lots/?residence=${residenceId}`),
      fetchJson(`${API}/groupes/?residence=${residenceId}`),
    ]).then(([{ data: lotsData }, { data: groupesData }]) => {
      const list = Array.isArray(lotsData) ? lotsData : (lotsData?.results ?? []);
      setLots(list);
      setGroupes(Array.isArray(groupesData) ? groupesData : (groupesData?.results ?? []));
      if (lotParam) {
        const lot = list.find(l => String(l.id) === String(lotParam));
        if (lot) selectLot(lot);
      }
    });
  }, [residenceId]);

  useEffect(() => {
    if (selectedLot) fetchAllDetails(selectedLot.id, typeAppel);
  }, [typeAppel]);

  // ── Lot selection ──────────────────────────────────────────
  const selectLot = (lot) => {
    setSelectedLot(lot);
    setError(""); setInfo("");
    setAllDetails([]); setPaiements([]);
    setForm(f => ({ ...f, montant: "", reference: "", mois: "", mode_paiement: "" }));
    fetchAllDetails(lot.id, typeAppel);
    fetchPaiements(lot.id);
  };

  const clearLot = () => {
    setSelectedLot(null);
    setAllDetails([]); setPaiements([]);
    setError(""); setInfo("");
  };

  // ── Computed ───────────────────────────────────────────────
  const totalDu      = allDetails.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
  const totalAffecte = allDetails.reduce((s, d) => s + parseFloat(d.montant_recu ?? 0), 0);
  const soldeRestant = totalDu - totalAffecte;
  const detailsDus   = allDetails.filter(x => x.statut !== "PAYE");

  // ── Handlers ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedLot || !form.montant) { setError("Montant obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    try {
      const { ok, data } = await fetchJson(`${API}/paiements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot: selectedLot.id, montant: form.montant,
          date_paiement: form.date_paiement, reference: form.reference,
          mois: form.mois || null, mode_paiement: form.mode_paiement || null,
          residence: residenceId,
        }),
      });
      if (!ok) throw new Error(data?.detail || JSON.stringify(data));
      setInfo("Paiement enregistré ✅");
      setForm(f => ({ ...f, montant: "", reference: "", mois: "", mode_paiement: "" }));
      fetchPaiements(selectedLot.id);
      fetchAllDetails(selectedLot.id, typeAppel);
      setPaiementToVentile(data);
      setShowConfirm(true);
    } catch (e) {
      setError(e.message || "Erreur enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleVentiler = async (paiementId) => {
    setVentilating(true); setError(""); setResultVentilation(null);
    try {
      const { ok, data } = await fetchJson(`${API}/paiements/${paiementId}/ventiler/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type_charge: typeAppel }),
      });
      if (!ok) throw new Error(data?.detail || "Erreur ventilation");
      setResultVentilation(data);
      fetchAllDetails(selectedLot.id);
      fetchPaiements(selectedLot.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setVentilating(false); setShowConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!paiementToDelete) return;
    const id = paiementToDelete.id;
    setDeleting(id); setError("");
    try {
      const { ok, data } = await fetchJson(`${API}/paiements/${id}/`, { method: "DELETE" });
      if (!ok) throw new Error(data?.detail || "Erreur suppression");
      setInfo("Paiement supprimé — affectations annulées ✅");
      fetchPaiements(selectedLot.id);
      fetchAllDetails(selectedLot.id);
    } catch (e) {
      setError(e.message || "Erreur suppression.");
    } finally {
      setDeleting(null); setShowDeleteConfirm(false); setPaiementToDelete(null);
    }
  };

  const openConfirm       = (p) => { setPaiementToVentile(p); setShowConfirm(true); };
  const closeConfirm      = () => { setShowConfirm(false); setResultVentilation(null); };
  const openDeleteConfirm = (p) => { setPaiementToDelete(p); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setShowDeleteConfirm(false); setPaiementToDelete(null); };

  const startEdit = (p) => {
    setEditingPaiement(p);
    setForm({
      montant:        String(parseFloat(p.montant)),
      date_paiement:  p.date_paiement,
      reference:      p.reference || "",
      mois:           p.mois || "",
      mode_paiement:  p.mode_paiement || "",
    });
    setError(""); setInfo("");
  };

  const cancelEdit = () => {
    setEditingPaiement(null);
    setForm({ montant: "", date_paiement: new Date().toISOString().split("T")[0], reference: "", mois: "", mode_paiement: "" });
    setError(""); setInfo("");
  };

  const handleUpdate = async () => {
    if (!editingPaiement || !form.montant) { setError("Montant obligatoire."); return; }
    setSaving(true); setError(""); setInfo("");
    try {
      const { ok, data } = await fetchJson(`${API}/paiements/${editingPaiement.id}/modifier/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant:       form.montant,
          date_paiement: form.date_paiement,
          reference:     form.reference,
          mois:          form.mois || null,
          mode_paiement: form.mode_paiement || null,
          type_charge:   typeAppel,
        }),
      });
      if (!ok) throw new Error(data?.detail || JSON.stringify(data));
      setInfo("Paiement modifié ✅");
      cancelEdit();
      fetchPaiements(selectedLot.id);
      fetchAllDetails(selectedLot.id, typeAppel);
    } catch (e) {
      setError(e.message || "Erreur modification.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  const ownerName = selectedLot?.representant
    ? `${selectedLot.representant.nom ?? ""} ${selectedLot.representant.prenom ?? ""}`.trim()
    : null;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-4 pb-12">
        <h1 className="text-white font-bold text-lg">Saisie de paiement</h1>
        <p className="text-white/60 text-[11px] mt-0.5">Enregistrer et ventiler un paiement</p>
      </div>
      <div className="px-4 -mt-6 space-y-4 pb-24 max-w-5xl mx-auto">

      {/* ── Step 1 : lot picker ─────────────────────────────── */}
      {!selectedLot ? (
        <div className="space-y-4">
          {/* État des paiements — 2 donuts */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">État des paiements</p>
              {chartYears.length > 1 && (
                <div className="flex gap-1 flex-wrap">
                  {chartYears.map(y => (
                    <button key={y} onClick={() => setChartYear(y)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                        y === chartYear ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Charge</p>
                </div>
                <ChartPaiements typeCharge="CHARGE" year={chartYear} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fond</p>
                </div>
                <ChartPaiements typeCharge="FOND" year={chartYear} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choisir un lot</h2>
            <LotPicker lots={lots} groupes={groupes} onSelect={selectLot} />
          </div>
        </div>
      ) : (

        /* ── Step 2 : form + history ──────────────────────── */
        <div className="space-y-4">

          {/* Lot banner */}
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-indigo-600">{selectedLot.numero_lot}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-800">{selectedLot.numero_lot}</p>
              {ownerName && <p className="text-xs text-indigo-500">{ownerName}</p>}
            </div>
            <button
              onClick={clearLot}
              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-100 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              Retour liste lots
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">

            {/* ── Formulaire compact ── */}
            <div className="space-y-3">
              <div className={`bg-white rounded-2xl shadow-sm border p-4 space-y-3 ${editingPaiement ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-100"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {editingPaiement ? "Modifier le paiement" : "Nouveau paiement"}
                  </h2>
                  {editingPaiement && (
                    <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition">
                      Annuler
                    </button>
                  )}
                </div>

                {error && <Alert type="error">⚠️ {error}</Alert>}
                {info  && <Alert type="success">{info}</Alert>}

                {/* Type d'appel */}
                <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm">
                  {[{ value: "CHARGE", label: "Appel de charge" }, { value: "FOND", label: "Appel de fond" }].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setTypeAppel(value)}
                      className={`flex-1 py-1.5 text-xs font-medium transition ${typeAppel === value ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Row: montant + date */}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Montant *">
                    <div className="relative">
                      <input type="number" min={0} step="0.01" placeholder="0.00"
                        className={`${inputCls} pr-12 py-1.5`}
                        value={form.montant}
                        onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">MAD</span>
                    </div>
                  </Field>
                  <Field label="Date">
                    <input type="date" className={`${inputCls} py-1.5`}
                      value={form.date_paiement}
                      onChange={e => setForm(f => ({ ...f, date_paiement: e.target.value }))} />
                  </Field>
                </div>

                {/* Row: mode + référence */}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Mode">
                    <select className={`${inputCls} py-1.5`} value={form.mode_paiement}
                      onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                      <option value="">— Mode —</option>
                      {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Référence">
                    <input className={`${inputCls} py-1.5`} placeholder="N° chèque, virement…"
                      value={form.reference}
                      onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                  </Field>
                </div>

                {/* Période comptable */}
                <Field label="Période comptable">
                  <select className={`${inputCls} py-1.5`} value={form.mois}
                    onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}>
                    <option value="">— Aucune —</option>
                    {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>

                <button
                  onClick={editingPaiement ? handleUpdate : () => setShowSaveConfirm(true)}
                  disabled={saving || !form.montant}
                  className={`w-full py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
                    editingPaiement ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}>
                  {saving
                    ? (editingPaiement ? "Modification…" : "Enregistrement…")
                    : (editingPaiement ? "Enregistrer les modifications" : "Enregistrer le paiement")
                  }
                </button>
              </div>

              {/* ── Situation lot ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Situation du lot</h2>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-slate-400">Total dû</p>
                    <p className="font-bold text-sm text-red-600">{fmt(totalDu)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-slate-400">Réglé</p>
                    <p className="font-bold text-sm text-emerald-600">{fmt(totalAffecte)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-slate-400">Reste</p>
                    <p className="font-bold text-sm text-amber-600">{fmt(soldeRestant)}</p>
                  </div>
                </div>

                {allDetails.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {typeAppel === "FOND" ? "Détail fonds" : "Détail charges"}
                    </p>
                    {allDetails.map(d => {
                      const du   = parseFloat(d.montant || 0);
                      const recu = parseFloat(d.montant_recu ?? 0);
                      const pct  = du > 0 ? Math.min(100, Math.round((recu / du) * 100)) : 0;
                      return (
                        <div key={d.id} className="bg-slate-50 rounded-lg px-3 py-1.5 text-xs space-y-1" title={d.justificatif || undefined}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-600 font-medium truncate">{d.appel_code ?? d.appel}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-slate-500 font-mono tabular-nums text-[10px]">
                                {fmt(recu)}&nbsp;/&nbsp;{fmt(du)} MAD
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap ${STATUT_BADGE[d.statut]}`}>
                                {d.statut_label}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1">
                            <div className={`h-1 rounded-full transition-all duration-500 ${
                              d.statut === "PAYE" ? "bg-emerald-500" : d.statut === "PARTIEL" ? "bg-amber-400" : "bg-red-300"
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">Aucune charge pour ce lot</p>
                )}
              </div>
            </div>

            {/* ── Historique paiements ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Historique paiements
              </h2>

              {paiements.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Aucun paiement pour ce lot</p>
              ) : (
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {paiements.map(p => {
                    const affecte    = parseFloat(p.montant_affecte     ?? 0);
                    const nonAffecte = parseFloat(p.montant_non_affecte ?? 0);
                    const montant    = parseFloat(p.montant);
                    const pct        = montant > 0 ? Math.round((affecte / montant) * 100) : 0;
                    const isDeleting = deleting === p.id;
                    const isEditing = editingPaiement?.id === p.id;
                    return (
                      <div key={p.id} className={`rounded-xl border px-4 py-3 space-y-2 transition ${isEditing ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{fmt(montant)} MAD</p>
                            <p className="text-xs text-slate-400 truncate">
                              {p.date_paiement}{p.reference && ` · ${p.reference}`}
                              {p.mois && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">{p.mois}</span>}
                              {p.mode_paiement && <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {{ ESPECES: "Espèces", VIREMENT: "Virement", CHEQUE: "Chèque" }[p.mode_paiement] ?? p.mode_paiement}
                              </span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {nonAffecte > 0 && !isEditing && (
                              <button onClick={() => openConfirm(p)}
                                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                Ventiler
                              </button>
                            )}
                            <button
                              onClick={() => isEditing ? cancelEdit() : startEdit(p)}
                              title={isEditing ? "Annuler la modification" : "Modifier ce paiement"}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                                isEditing
                                  ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}>
                              {isEditing ? "✕" : "✏️"}
                            </button>
                            <button onClick={() => openDeleteConfirm(p)} disabled={isDeleting}
                              title="Supprimer ce paiement et annuler ses affectations"
                              className="text-xs px-2.5 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-40">
                              {isDeleting ? "…" : "🗑"}
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Affecté : {fmt(affecte)} MAD</span>
                          <span>Solde : {fmt(nonAffecte)} MAD</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>{/* end max-w-5xl */}

      {/* ── Modal confirmation enregistrement paiement ── */}
      {showSaveConfirm && (
        <Modal>
          <h2 className="text-base font-bold text-slate-800">Confirmer l'enregistrement</h2>
          <div className="bg-indigo-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Lot</span>
              <span className="font-semibold text-slate-800">{selectedLot?.numero_lot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant</span>
              <span className="font-bold text-indigo-700">{fmt(form.montant)} MAD</span>
            </div>
            {form.date_paiement && (
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-700">{form.date_paiement}</span>
              </div>
            )}
            {form.mode_paiement && (
              <div className="flex justify-between">
                <span className="text-slate-500">Mode</span>
                <span className="font-semibold text-slate-700">{form.mode_paiement}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSaveConfirm(false)}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button onClick={() => { setShowSaveConfirm(false); handleSave(); }}
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Confirmer
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal confirmation ventilation ── */}
      {showConfirm && paiementToVentile && (
        <Modal>
          <h2 className="text-lg font-bold text-slate-700">Confirmer la ventilation</h2>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Montant paiement</span>
              <span className="font-semibold">{fmt(paiementToVentile.montant)} MAD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solde disponible</span>
              <span className="font-semibold text-indigo-600">
                {fmt(paiementToVentile.montant_non_affecte ?? paiementToVentile.montant)} MAD
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Ce montant sera automatiquement ventilé sur les charges dues, en commençant par les plus anciennes.
          </p>
          {detailsDus.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500">Ordre de ventilation :</p>
              {detailsDus.map((d, i) => {
                const restant = parseFloat(d.montant || 0) - parseFloat(d.montant_recu ?? 0);
                return (
                  <div key={d.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">#{i + 1}</span>
                      <span className="text-slate-600 font-medium">{d.appel_code ?? d.appel}</span>
                    </div>
                    <span className="font-semibold text-slate-700">reste {fmt(restant)} MAD</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeConfirm} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button onClick={() => handleVentiler(paiementToVentile.id)} disabled={ventilating}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {ventilating ? "Ventilation…" : "Confirmer"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal résultat ventilation ── */}
      {resultVentilation && (
        <Modal>
          <h2 className="text-lg font-bold text-slate-700">✅ Ventilation effectuée</h2>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {resultVentilation.affectations.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-slate-600 font-medium">{a.detail_code}</span>
                <span className="font-bold text-emerald-700">{fmt(a.montant_affecte)} MAD</span>
              </div>
            ))}
          </div>
          {parseFloat(resultVentilation.solde_restant) > 0 && (
            <Alert type="warning">
              Solde non ventilé : <span className="font-bold">{fmt(resultVentilation.solde_restant)} MAD</span>
              {" "}— aucune charge en attente pour absorber ce montant.
            </Alert>
          )}
          <div className="flex justify-end">
            <button onClick={() => setResultVentilation(null)}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal confirmation suppression ── */}
      {showDeleteConfirm && paiementToDelete && (
        <Modal>
          <h2 className="text-lg font-bold text-red-600">⚠️ Supprimer ce paiement ?</h2>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Montant</span>
              <span className="font-semibold">{fmt(paiementToDelete.montant)} MAD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-semibold">{paiementToDelete.date_paiement}</span>
            </div>
            {paiementToDelete.reference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Référence</span>
                <span className="font-semibold">{paiementToDelete.reference}</span>
              </div>
            )}
            {parseFloat(paiementToDelete.montant_affecte ?? 0) > 0 && (
              <div className="flex justify-between border-t border-red-200 pt-1.5 mt-1">
                <span className="text-red-600 font-medium">Affectations à annuler</span>
                <span className="font-bold text-red-600">{fmt(paiementToDelete.montant_affecte)} MAD</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Cette action est irréversible. Le paiement sera supprimé et toutes ses affectations annulées.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeDeleteConfirm} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button onClick={handleDelete} disabled={!!deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {deleting ? "Suppression…" : "Confirmer la suppression"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

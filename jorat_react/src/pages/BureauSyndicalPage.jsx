import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const FONCTIONS = [
  { value: "PRESIDENT",      label: "Président" },
  { value: "VICE_PRESIDENT", label: "Vice-Président" },
  { value: "TRESORIER",      label: "Trésorier" },
  { value: "SECRETAIRE",     label: "Secrétaire" },
  { value: "MEMBRE",         label: "Membre" },
];

const FONCTION_ORDER = ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER", "SECRETAIRE", "MEMBRE"];
const FONCTION_LABEL = Object.fromEntries(FONCTIONS.map(f => [f.value, f.label]));

// ── Badge couleurs par fonction ─────────────────────────────
const FONCTION_STYLE = {
  PRESIDENT:      "bg-amber-100 text-amber-800",
  VICE_PRESIDENT: "bg-orange-100 text-orange-700",
  TRESORIER:      "bg-blue-100 text-blue-700",
  SECRETAIRE:     "bg-violet-100 text-violet-700",
  MEMBRE:         "bg-slate-100 text-slate-600",
};

// ── Active mandate card ─────────────────────────────────────
function ActiveMandatCard({ mandat, onEdit, onDelete }) {
  if (!mandat) return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
      <p className="text-slate-400 font-medium">Aucun mandat actif</p>
      <p className="text-slate-300 text-sm mt-1">Créez le premier mandat du Bureau Syndical.</p>
    </div>
  );

  const sorted = [...(mandat.membres || [])].sort(
    (a, b) => FONCTION_ORDER.indexOf(a.fonction) - FONCTION_ORDER.indexOf(b.fonction)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Mandat actif</span>
          </div>
          <h2 className="text-base font-bold text-slate-800">Bureau Syndical</h2>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
            <span>Depuis le {mandat.date_debut}</span>
            {mandat.date_fin && <span>jusqu'au {mandat.date_fin}</span>}
            {mandat.ag_date && (
              <span className="text-pink-600 font-medium">
                AG du {mandat.ag_date} ({mandat.ag_type})
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onDelete(mandat)}
            className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
            Clore
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="p-6">
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Aucun membre dans ce mandat.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sorted.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(m.personne_nom || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {m.personne_nom} {m.personne_prenom}
                  </div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${FONCTION_STYLE[m.fonction] || FONCTION_STYLE.MEMBRE}`}>
                    {FONCTION_LABEL[m.fonction] || m.fonction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Historical mandate row ──────────────────────────────────
function HistoricalMandat({ mandat }) {
  const [open, setOpen] = useState(false);
  const sorted = [...(mandat.membres || [])].sort(
    (a, b) => FONCTION_ORDER.indexOf(a.fonction) - FONCTION_ORDER.indexOf(b.fonction)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-slate-700">
              {mandat.date_debut} {mandat.date_fin ? `→ ${mandat.date_fin}` : ""}
            </span>
            {mandat.ag_date && (
              <span className="ml-2 text-xs text-slate-400">AG {mandat.ag_date}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{mandat.nb_membres} membre{mandat.nb_membres !== 1 ? "s" : ""}</span>
          <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && sorted.length > 0 && (
        <div className="border-t border-slate-50 px-5 pb-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {sorted.map(m => (
              <span key={m.id} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full text-slate-600">
                <span className={`font-semibold ${FONCTION_STYLE[m.fonction]?.split(" ")[1] || "text-slate-600"}`}>
                  {FONCTION_LABEL[m.fonction]}
                </span>
                <span className="text-slate-400">—</span>
                {m.personne_nom} {m.personne_prenom}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Mandate Form ────────────────────────────────────────
function NouveauMandatForm({ assemblees, personnes, allMandats, onSave, onCancel }) {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin,   setDateFin]   = useState("");
  const [agId,      setAgId]      = useState("");
  const [membres,   setMembres]   = useState([]);  // [{personne_id, fonction}]
  const [newP,      setNewP]      = useState("");
  const [newF,      setNewF]      = useState("MEMBRE");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const addMembre = () => {
    if (!newP) return;
    if (membres.find(m => m.personne_id === newP)) {
      setError("Cette personne est déjà dans le mandat."); return;
    }
    setMembres(prev => [...prev, { personne_id: newP, fonction: newF }]);
    setNewP(""); setNewF("MEMBRE"); setError("");
  };

  const removeMembre = idx => setMembres(prev => prev.filter((_, i) => i !== idx));

  const personneLabel = id => {
    const p = personnes.find(p => String(p.id) === String(id));
    return p ? `${p.nom} ${p.prenom}` : id;
  };

  const handleSave = async () => {
    if (!dateDebut) { setError("La date de début est obligatoire."); return; }
    if (membres.length === 0) { setError("Ajoutez au moins un membre."); return; }

    // Vérifier qu'aucun bureau n'est actif
    const active = allMandats.find(m => m.actif);
    if (active) {
      setError("Un bureau est déjà actif. Clôturez-le avant d'en créer un nouveau.");
      return;
    }

    // Vérifier les chevauchements de dates avec les mandats existants
    const debut = new Date(dateDebut);
    const fin   = dateFin ? new Date(dateFin) : null;
    for (const m of allMandats) {
      const mDebut = new Date(m.date_debut);
      const mFin   = m.date_fin ? new Date(m.date_fin) : null;
      // Chevauchement : nouveau debut < mFin ET (pas de fin nouveau OU fin nouveau > mDebut)
      const overlap = debut < (mFin || new Date("9999-12-31")) && (!fin || fin > mDebut);
      if (overlap) {
        const label = `${m.date_debut}${m.date_fin ? ` → ${m.date_fin}` : " (sans date de fin)"}`;
        setError(`Chevauchement avec le mandat du ${label}. Les mandats ne peuvent pas se chevaucher.`);
        return;
      }
    }

    setSaving(true); setError("");
    try {
      // 1) Create mandate
      const res = await fetch("/api/mandats-bureau/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({
          date_debut:         dateDebut,
          date_fin:           dateFin || null,
          assemblee_generale: agId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la création du mandat.");
        return;
      }
      const mandat = await res.json();

      // 2) Create each member
      for (const m of membres) {
        await fetch("/api/membres-bureau/", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ mandat: mandat.id, personne: m.personne_id, fonction: m.fonction }),
        });
      }
      onSave();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 space-y-5">
      <h2 className="text-base font-bold text-slate-800">Nouveau mandat</h2>

      {/* AG + Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Assemblée Générale</label>
          <select
            value={agId} onChange={e => setAgId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            <option value="">— Aucune —</option>
            {assemblees.map(ag => (
              <option key={ag.id} value={ag.id}>{ag.date_ag} — {ag.type_ag_label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date début *</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date fin</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
      </div>

      {/* Add member row */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-2">Membres</label>
        <div className="flex gap-2">
          <select value={newP} onChange={e => setNewP(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            <option value="">— Sélectionner une personne —</option>
            {personnes.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
          </select>
          <select value={newF} onChange={e => setNewF(e.target.value)}
            className="w-44 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400">
            {FONCTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button onClick={addMembre}
            className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition flex-shrink-0">
            + Ajouter
          </button>
        </div>

        {/* Member list */}
        {membres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {membres.map((m, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${FONCTION_STYLE[m.fonction] || "bg-slate-100 text-slate-600"} border-transparent`}>
                <span className="font-semibold">{FONCTION_LABEL[m.fonction]}</span>
                <span>—</span>
                <span>{personneLabel(m.personne_id)}</span>
                <button onClick={() => removeMembre(i)} className="ml-1 text-slate-400 hover:text-red-500 font-bold">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition shadow">
          {saving ? "Enregistrement…" : "Créer le mandat"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function BureauSyndicalPage() {
  const navigate = useNavigate();
  const [mandats,    setMandats]    = useState([]);
  const [personnes,  setPersonnes]  = useState([]);
  const [assemblees, setAssemblees] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [error,      setError]      = useState("");

  const fetchMandats = () => {
    setLoading(true);
    fetch("/api/mandats-bureau/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setMandats(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => {
    fetchMandats();
    fetch("/api/personnes/", { credentials: "include" })
      .then(r => r.json()).then(d => setPersonnes(Array.isArray(d) ? d : (d.results ?? [])));
    fetch("/api/assemblees/", { credentials: "include" })
      .then(r => r.json()).then(d => setAssemblees(Array.isArray(d) ? d : (d.results ?? [])));
  }, []);

  const activeMandat    = mandats.find(m => m.actif) || null;
  const historicalMandats = mandats.filter(m => !m.actif);

  const handleDelete = async mandat => {
    if (!window.confirm("Clore ce mandat ? Il passera en inactif.")) return;
    await fetch(`/api/mandats-bureau/${mandat.id}/`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ actif: false }),
    });
    fetchMandats();
  };

  const handleFormSave = () => { setShowForm(false); fetchMandats(); };

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Bureau Syndical</h1>
          </div>
          {!showForm && !activeMandat && (
            <button onClick={() => setShowForm(true)}
              className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
              + Nouveau mandat
            </button>
          )}
        </div>
        <p className="text-white/50 text-[10px] mt-1">Mandats élus en Assemblée Générale</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Active mandate + form */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
      ) : (
        <>
          <ActiveMandatCard
            mandat={activeMandat}
            onDelete={handleDelete}
          />

          {/* New mandate form — below active card */}
          {showForm && (
            <NouveauMandatForm
              assemblees={assemblees}
              personnes={personnes}
              allMandats={mandats}
              onSave={handleFormSave}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Historical mandates */}
          {historicalMandats.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Mandats précédents ({historicalMandats.length})
              </h3>
              <div className="space-y-2">
                {historicalMandats.map(m => (
                  <HistoricalMandat key={m.id} mandat={m} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

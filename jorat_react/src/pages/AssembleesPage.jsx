import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPES   = [{ value: "ORDINAIRE", label: "Ordinaire" }, { value: "EXTRAORDINAIRE", label: "Extraordinaire" }];
const STATUTS = [{ value: "PLANIFIEE", label: "Planifiée" }, { value: "TENUE", label: "Tenue" }, { value: "ANNULEE", label: "Annulée" }];

const STATUT_COLORS = {
  PLANIFIEE: "bg-blue-100 text-blue-700",
  TENUE:     "bg-green-100 text-green-700",
  ANNULEE:   "bg-red-100 text-red-700",
};

const FONCTIONS = [
  { value: "PRESIDENT",      label: "Président" },
  { value: "VICE_PRESIDENT", label: "Vice-Président" },
  { value: "TRESORIER",      label: "Trésorier" },
  { value: "SECRETAIRE",     label: "Secrétaire" },
  { value: "MEMBRE",         label: "Membre" },
];
const FONCTION_STYLE = {
  PRESIDENT:      "bg-amber-100 text-amber-800",
  VICE_PRESIDENT: "bg-orange-100 text-orange-700",
  TRESORIER:      "bg-blue-100 text-blue-700",
  SECRETAIRE:     "bg-violet-100 text-violet-700",
  MEMBRE:         "bg-slate-100 text-slate-600",
};
const FONCTION_LABEL = Object.fromEntries(FONCTIONS.map(f => [f.value, f.label]));
const FONCTION_ORDER = ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER", "SECRETAIRE", "MEMBRE"];

const EMPTY = { date_ag: "", type_ag: "ORDINAIRE", statut: "PLANIFIEE", ordre_du_jour: "" };

// ── Bureau Syndical modal ─────────────────────────────────────
function BureauModal({ ag, onClose }) {
  const [bureau,    setBureau]    = useState(null);   // mandat existant ou null
  const [personnes, setPersonnes] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);

  // form nouveau mandat
  const [dateDebut, setDateDebut] = useState(ag.date_ag || "");
  const [dateFin,   setDateFin]   = useState("");
  const [membres,   setMembres]   = useState([]);
  const [newP,      setNewP]      = useState("");
  const [newF,      setNewF]      = useState("MEMBRE");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const fetchBureau = () => {
    setLoading(true);
    fetch(`/api/mandats-bureau/?ag_id=${ag.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.results ?? []);
        setBureau(list[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBureau();
    fetch("/api/personnes/", { credentials: "include" })
      .then(r => r.json()).then(d => setPersonnes(Array.isArray(d) ? d : (d.results ?? [])));
  }, []);

  const personneLabel = id => {
    const p = personnes.find(p => String(p.id) === String(id));
    return p ? `${p.nom} ${p.prenom}` : id;
  };

  const addMembre = () => {
    if (!newP) return;
    if (membres.find(m => m.personne_id === newP)) { setError("Déjà dans le mandat."); return; }
    setMembres(prev => [...prev, { personne_id: newP, fonction: newF }]);
    setNewP(""); setNewF("MEMBRE"); setError("");
  };

  const handleSave = async () => {
    if (!dateDebut) { setError("La date de début est obligatoire."); return; }
    if (membres.length === 0) { setError("Ajoutez au moins un membre."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/mandats-bureau/", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify({ date_debut: dateDebut, date_fin: dateFin || null, assemblee_generale: ag.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur."); return;
      }
      const mandat = await res.json();
      for (const m of membres) {
        await fetch("/api/membres-bureau/", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ mandat: mandat.id, personne: m.personne_id, fonction: m.fonction }),
        });
      }
      setShowForm(false);
      fetchBureau();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const dateFormatted = ag.date_ag
    ? new Date(ag.date_ag).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : ag.date_ag;

  const sorted = bureau ? [...(bureau.membres || [])].sort(
    (a, b) => FONCTION_ORDER.indexOf(a.fonction) - FONCTION_ORDER.indexOf(b.fonction)
  ) : [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Bureau Syndical</h2>
            <p className="text-xs text-pink-600 font-medium mt-0.5">AG du {dateFormatted} — {ag.type_ag_label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2">×</button>
        </div>

        <div className="p-6 min-h-[320px]">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Chargement…</div>
          ) : bureau ? (
            /* Bureau existant */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Mandat du <strong>{bureau.date_debut}</strong>{bureau.date_fin ? ` au ${bureau.date_fin}` : ""}</span>
                {bureau.actif && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Actif</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sorted.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(m.personne_nom || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{m.personne_nom} {m.personne_prenom}</div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${FONCTION_STYLE[m.fonction] || FONCTION_STYLE.MEMBRE}`}>
                        {FONCTION_LABEL[m.fonction] || m.fonction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {sorted.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucun membre enregistré.</p>}
            </div>
          ) : showForm ? (
            /* Formulaire création */
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date début *</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date fin</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Ajouter un membre</label>
                <div className="flex flex-col gap-2">
                  <select value={newP} onChange={e => setNewP(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400">
                    <option value="">— Sélectionner une personne —</option>
                    {personnes.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <select value={newF} onChange={e => setNewF(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400">
                      {FONCTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <button onClick={addMembre}
                      className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition whitespace-nowrap">
                      + Ajouter
                    </button>
                  </div>
                </div>
                {membres.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {membres.map((m, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-transparent ${FONCTION_STYLE[m.fonction] || "bg-slate-100 text-slate-600"}`}>
                        <span className="font-semibold">{FONCTION_LABEL[m.fonction]}</span>
                        <span>—</span>
                        <span>{personneLabel(m.personne_id)}</span>
                        <button onClick={() => setMembres(prev => prev.filter((_, j) => j !== i))} className="ml-1 font-bold text-slate-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setShowForm(false); setError(""); setMembres([]); }}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">
                  ← Retour
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-5 py-2 rounded-xl bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 disabled:opacity-60 transition">
                  {saving ? "Enregistrement…" : "Créer le bureau"}
                </button>
              </div>
            </div>
          ) : (
            /* Aucun bureau — bouton création */
            <div className="text-center py-10 space-y-4">
              <p className="text-slate-400 text-sm">Aucun bureau syndical pour cette assemblée.</p>
              <button onClick={() => setShowForm(true)}
                className="px-5 py-2 rounded-xl bg-pink-500 text-white text-sm font-semibold hover:bg-pink-600 transition shadow">
                + Créer le Bureau Syndical
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssembleesPage() {
  const navigate = useNavigate();
  const [items,          setItems]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [showForm,       setShowForm]       = useState(false);
  const [editItem,       setEditItem]       = useState(null);
  const [form,           setForm]           = useState(EMPTY);
  const [pvFile,         setPvFile]         = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [openMenu,       setOpenMenu]       = useState(null);
  const [bureauAg,       setBureauAg]       = useState(null);
  const [sendingConvoc,  setSendingConvoc]  = useState(null); // ag.id en cours d'envoi
  const menuRef = useRef(null);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/assemblees/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCreate = () => { setForm(EMPTY); setPvFile(null); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit   = item => {
    setForm({ date_ag: item.date_ag, type_ag: item.type_ag, statut: item.statut, ordre_du_jour: item.ordre_du_jour || "" });
    setPvFile(null); setEditItem(item); setError(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); setError(""); };

  const handleSave = async () => {
    if (!form.date_ag) { setError("La date est obligatoire."); return; }
    setSaving(true); setError("");
    const url    = editItem ? `/api/assemblees/${editItem.id}/` : "/api/assemblees/";
    const method = editItem ? "PATCH" : "POST";
    try {
      let res;
      if (pvFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("pv_document", pvFile);
        res = await fetch(url, { method, credentials: "include", headers: { "X-CSRFToken": getCsrf() }, body: fd });
      } else {
        res = await fetch(url, {
          method, credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(Object.values(d).flat().join(" ") || "Erreur lors de la sauvegarde.");
        return;
      }
      closeForm(); fetchItems();
    } catch { setError("Erreur réseau."); }
    finally { setSaving(false); }
  };

  const handleDelete = async item => {
    if (!window.confirm(`Supprimer cette assemblée générale ?`)) return;
    await fetch(`/api/assemblees/${item.id}/`, { method: "DELETE", credentials: "include", headers: { "X-CSRFToken": getCsrf() } });
    fetchItems();
  };

  const handleConvocation = async (item) => {
    const dateFormatted = item.date_ag
      ? new Date(item.date_ag).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
      : item.date_ag;
    let msg = `Envoyer la convocation aux résidents pour :\n\nAG du ${dateFormatted}\n`;
    if (item.ordre_du_jour) msg += `\nOrdre du jour :\n${item.ordre_du_jour}\n`;
    if (item.convocation_envoyee_le) {
      const envDate = new Date(item.convocation_envoyee_le).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      msg += `\n⚠ Attention : une convocation a déjà été envoyée le ${envDate}.\nConfirmer l'envoi d'une nouvelle convocation ?`;
    } else {
      msg += "\nConfirmer l'envoi ?";
    }
    if (!window.confirm(msg)) return;
    setSendingConvoc(item.id);
    try {
      const res = await fetch(`/api/assemblees/${item.id}/envoyer-convocation/`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(Object.values(d).flat().join(" ") || "Erreur lors de l'envoi.");
      } else {
        fetchItems();
      }
    } catch { alert("Erreur réseau."); }
    finally { setSendingConvoc(null); }
  };

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Assemblées Générales</h1>
          </div>
          <button onClick={openCreate} className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition">
            + Nouvelle AG
          </button>
        </div>
        <p className="text-white/50 text-[10px] mt-1">{items.length} assemblée{items.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">Aucune assemblée générale</div>
      ) : (
        <div ref={menuRef} className="flex flex-col gap-3">
          {items.map(item => {
            const dateFormatted = item.date_ag
              ? new Date(item.date_ag).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
              : item.date_ag;
            return (
            <div key={item.id} className="bg-violet-50 rounded-xl border border-violet-200 shadow-sm px-4 py-3 flex flex-col gap-2 relative">
              {/* Ligne 1 : titre + statut + menu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-slate-800 text-sm">
                    Assemblée Générale du {dateFormatted}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUT_COLORS[item.statut] ?? "bg-slate-100 text-slate-500"}`}>
                    {item.statut_label}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className="p-0.5 rounded hover:bg-violet-100 text-slate-300 hover:text-slate-600 transition">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                    </svg>
                  </button>
                  {openMenu === item.id && (
                    <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                      <button onClick={() => { openEdit(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">Modifier</button>
                      <button onClick={() => { handleDelete(item); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50">Supprimer</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : session */}
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Session :</span> {item.type_ag_label}
              </div>

              {/* Ligne 3 : ordre du jour */}
              {item.ordre_du_jour && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Ordre du jour :</span>{" "}
                  <span className="line-clamp-2">{item.ordre_du_jour}</span>
                </div>
              )}

              {/* Ligne 4 : actions */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-violet-100">
                <button onClick={() => navigate(`/gouvernance/resolutions?ag_id=${item.id}`)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition">
                  Résolutions ({item.nb_resolutions ?? 0})
                </button>
                <button onClick={() => setBureauAg(item)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-pink-100 text-pink-700 text-xs font-semibold hover:bg-pink-200 transition">
                  Bureau Syndical
                </button>
                <button onClick={() => navigate(`/passation-consignes?assemblee=${item.id}`)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition">
                  Passation de consignes
                </button>
                {/* Convocation */}
                {item.statut === "PLANIFIEE" ? (
                  <button
                    onClick={() => handleConvocation(item)}
                    disabled={sendingConvoc === item.id}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-60 ${
                      item.convocation_envoyee_le
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                    }`}
                  >
                    {sendingConvoc === item.id ? "Envoi…" : (
                      item.convocation_envoyee_le
                        ? `✉ Convocation (renvoi)`
                        : "✉ Convoquer"
                    )}
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed" title="Disponible uniquement pour les assemblées planifiées">
                    ✉ Convoquer
                  </span>
                )}
                {item.convocation_envoyee_le && (
                  <span className="text-[9px] text-amber-600 font-medium">
                    envoyée le {new Date(item.convocation_envoyee_le).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {item.pv_document && (
                  <a href={item.pv_document} target="_blank" rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition">
                    📄 PV
                  </a>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal Bureau Syndical */}
      {bureauAg && (
        <BureauModal ag={bureauAg} onClose={() => setBureauAg(null)} />
      )}

      {/* Modal form AG */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">
              {editItem ? "Modifier l'assemblée" : "Nouvelle assemblée générale"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date *</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  value={form.date_ag} onChange={e => setForm(f => ({ ...f, date_ag: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Type</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.type_ag} onChange={e => setForm(f => ({ ...f, type_ag: e.target.value }))}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Statut</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Ordre du jour</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  placeholder="Points à l'ordre du jour…"
                  value={form.ordre_du_jour} onChange={e => setForm(f => ({ ...f, ordre_du_jour: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">PV (document)</label>
                <input type="file" accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-slate-600"
                  onChange={e => setPvFile(e.target.files[0] || null)} />
                {editItem?.pv_document && !pvFile && (
                  <p className="text-xs text-slate-400 mt-1">PV existant conservé si aucun fichier sélectionné.</p>
                )}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

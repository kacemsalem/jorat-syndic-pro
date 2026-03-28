import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const fmtDate    = (s) => s ? new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtMontant = (v) => v ? parseFloat(v).toLocaleString("fr-MA", { minimumFractionDigits: 2 }) + " MAD" : "—";

const TYPE_OPTS   = ["Tous", "SMS", "MESSAGE", "SYSTEM"];
const STATUT_OPTS = ["Tous", "ENVOYE", "LU", "NON_LU"];

const TYPE_BADGE = {
  SMS:     "bg-blue-100 text-blue-700",
  MESSAGE: "bg-indigo-100 text-indigo-700",
  SYSTEM:  "bg-slate-100 text-slate-600",
};
const STATUT_BADGE = {
  ENVOYE: "bg-amber-100 text-amber-700",
  LU:     "bg-emerald-100 text-emerald-700",
  NON_LU: "bg-red-100 text-red-700",
};
const STATUT_LABEL = { ENVOYE: "Envoyé", LU: "Lu", NON_LU: "Non lu" };
const TYPE_LABEL   = { SMS: "SMS", MESSAGE: "Message", SYSTEM: "Système" };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterType,    setFilterType]    = useState("Tous");
  const [filterStatut,  setFilterStatut]  = useState("Tous");
  const [search,        setSearch]        = useState("");
  const [deleting,      setDeleting]      = useState(null);

  // Selection mode
  const [selMode,   setSelMode]   = useState(false);
  const [selected,  setSelected]  = useState(new Set());
  const [bulkDel,   setBulkDel]   = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/notifications/", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setNotifications(Array.isArray(d) ? d : (d.results ?? [])); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = notifications;
    if (filterType   !== "Tous") rows = rows.filter(n => n.type_notification === filterType);
    if (filterStatut !== "Tous") rows = rows.filter(n => n.statut === filterStatut);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(n =>
        (n.lot_numero || "").toLowerCase().includes(q) ||
        (n.titre || "").toLowerCase().includes(q) ||
        (n.message || "").toLowerCase().includes(q) ||
        (n.personne_nom || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [notifications, filterType, filterStatut, search]);

  const kpis = useMemo(() => {
    const total   = notifications.length;
    const nonLus  = notifications.filter(n => n.statut === "NON_LU").length;
    const sms     = notifications.filter(n => n.type_notification === "SMS").length;
    const envoyes = notifications.filter(n => n.statut === "ENVOYE").length;
    return { total, nonLus, sms, envoyes };
  }, [notifications]);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette notification ?")) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/notifications/${id}/`, { method: "DELETE", credentials: "include" });
      if (r.ok || r.status === 204) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const toggleSel = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(n => selected.has(n.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.delete(n.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.add(n.id)); return next; });
    }
  };

  const exitSelMode = () => { setSelMode(false); setSelected(new Set()); };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Supprimer ${ids.length} notification${ids.length > 1 ? "s" : ""} ?`)) return;
    setBulkDel(true);
    try {
      for (const id of ids) {
        await fetch(`/api/notifications/${id}/`, {
          method: "DELETE", credentials: "include",
          headers: { "X-CSRFToken": getCsrf() },
        });
      }
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      exitSelMode();
    } finally {
      setBulkDel(false);
    }
  };

  const FilterBtn = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
        active ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-32">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Notifications</h1>
          </div>
          <div className="flex items-center gap-2">
            {!selMode ? (
              <>
                <button onClick={() => setSelMode(true)}
                  className="bg-white/20 border border-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-white/30 transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sélectionner
                </button>
                <button onClick={load}
                  className="bg-white/20 border border-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-white/30 transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1 0 4.582 9" />
                  </svg>
                  Actualiser
                </button>
              </>
            ) : (
              <button onClick={exitSelMode}
                className="bg-white/20 border border-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-white/30 transition">
                Annuler
              </button>
            )}
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-1">Historique des messages envoyés aux résidents</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total",      value: kpis.total,   cls: "bg-slate-50  border-slate-200 text-slate-700" },
          { label: "Non lus",    value: kpis.nonLus,  cls: kpis.nonLus > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-400" },
          { label: "SMS",        value: kpis.sms,     cls: "bg-blue-50   border-blue-200  text-blue-700" },
          { label: "En attente", value: kpis.envoyes, cls: "bg-amber-50  border-amber-200 text-amber-700" },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border px-3 py-2 flex items-center gap-3 ${k.cls}`}>
            <span className="text-xl font-bold leading-none">{k.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70 leading-tight">{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-10">Type</span>
          {TYPE_OPTS.map(t => (
            <FilterBtn key={t} label={t === "Tous" ? "Tous" : TYPE_LABEL[t] ?? t} active={filterType === t} onClick={() => setFilterType(t)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-10">Statut</span>
          {STATUT_OPTS.map(s => (
            <FilterBtn key={s} label={s === "Tous" ? "Tous" : STATUT_LABEL[s] ?? s} active={filterStatut === s} onClick={() => setFilterStatut(s)} />
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par lot, titre, message, propriétaire…"
          className="w-full rounded-xl border border-slate-200 text-xs px-3 py-2 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 uppercase tracking-widest">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {notifications.length === 0 ? "Aucune notification enregistrée." : "Aucun résultat pour ces filtres."}
          </div>
        ) : (
          <>
          {/* Selection toolbar */}
          {selMode && (
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <button onClick={toggleAll}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 ${
                  allFilteredSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                }`}>
                {allFilteredSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-slate-500 flex-1">
                {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}` : "Tout sélectionner"}
              </span>
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} disabled={bulkDel}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition">
                  {bulkDel ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                    </svg>
                  )}
                  Supprimer
                </button>
              )}
            </div>
          )}

          <div className="p-3 space-y-1.5">
            {filtered.map((n) => {
              const isSel = selected.has(n.id);
              return (
                <div key={n.id}
                  onClick={selMode ? () => toggleSel(n.id) : undefined}
                  className={`rounded-xl border px-3 py-2.5 flex items-start gap-3 transition ${
                    selMode ? "cursor-pointer" : ""
                  } ${
                    isSel ? "bg-indigo-50 border-indigo-200" :
                    n.statut === "NON_LU" ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100 hover:shadow-sm"
                  }`}>

                  {/* Checkbox (selection mode) */}
                  {selMode && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                      isSel ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                    }`}>
                      {isSel && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Date + badges */}
                  <div className="flex flex-col gap-1 flex-shrink-0 w-24">
                    <span className="text-[10px] font-mono text-slate-400 leading-tight">{fmtDate(n.date_notification)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-center ${TYPE_BADGE[n.type_notification] ?? "bg-slate-100 text-slate-600"}`}>
                      {n.type_label ?? TYPE_LABEL[n.type_notification] ?? n.type_notification}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-center ${STATUT_BADGE[n.statut] ?? "bg-slate-100 text-slate-600"}`}>
                      {n.statut_label ?? STATUT_LABEL[n.statut] ?? n.statut}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {n.lot_numero && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">Lot {n.lot_numero}</span>}
                      {n.personne_nom && <span className="text-[10px] text-slate-500">{n.personne_nom}</span>}
                      {n.montant_du && <span className="text-[10px] font-mono font-semibold text-red-500 ml-auto">{fmtMontant(n.montant_du)}</span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{n.titre}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{n.message}</p>
                  </div>

                  {/* Delete (normal mode only) */}
                  {!selMode && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={deleting === n.id}
                      title="Supprimer"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40 flex-shrink-0"
                    >
                      {deleting === n.id ? (
                        <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
            <span>{filtered.length} notification{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}</span>
            <span>{notifications.length} au total</span>
          </div>
          </>
        )}
      </div>
      </div>

      {/* Floating bulk action bar */}
      {selMode && selected.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">
              {selected.size}
            </div>
            <span className="text-sm font-semibold flex-1">
              {selected.size} notification{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <button onClick={exitSelMode} className="text-slate-400 hover:text-white text-xs font-medium transition px-2">
              Annuler
            </button>
            <button onClick={handleBulkDelete} disabled={bulkDel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition">
              {bulkDel ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                </svg>
              )}
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

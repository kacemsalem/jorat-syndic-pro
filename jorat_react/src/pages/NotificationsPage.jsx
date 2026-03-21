import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="space-y-4">
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Tableau de bord</button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-xs text-slate-400 mt-0.5">Historique des messages envoyés aux résidents</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1 0 4.582 9" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* KPIs — une seule ligne compacte */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-left">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Lot</th>
                  <th className="px-4 py-3 font-semibold">Propriétaire</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Titre</th>
                  <th className="px-4 py-3 font-semibold max-w-xs">Message</th>
                  <th className="px-4 py-3 font-semibold text-right">Montant dû</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n, i) => (
                  <tr
                    key={n.id}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/40"} ${n.statut === "NON_LU" ? "bg-amber-50/60" : ""}`}
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {fmtDate(n.date_notification)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {n.lot_numero || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {n.personne_nom || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[n.type_notification] ?? "bg-slate-100 text-slate-600"}`}>
                        {n.type_label ?? TYPE_LABEL[n.type_notification] ?? n.type_notification}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-[140px] truncate" title={n.titre}>
                      {n.titre}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs">
                      <span className="line-clamp-2 leading-relaxed" title={n.message}>{n.message}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-red-500 whitespace-nowrap">
                      {fmtMontant(n.montant_du)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUT_BADGE[n.statut] ?? "bg-slate-100 text-slate-600"}`}>
                        {n.statut_label ?? STATUT_LABEL[n.statut] ?? n.statut}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={deleting === n.id}
                        title="Supprimer"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                      >
                        {deleting === n.id ? (
                          <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5m14 0h-2" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
              <span>{filtered.length} notification{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}</span>
              <span>{notifications.length} au total</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

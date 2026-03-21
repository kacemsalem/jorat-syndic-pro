import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

async function fetchJson(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAll(url) {
  let next = url, all = [];
  while (next) {
    const data = await fetchJson(next);
    if (Array.isArray(data)) { all = data; break; }
    all = all.concat(data?.results ?? []);
    next = data?.next ?? null;
  }
  return all;
}

// ── Payment status helpers ──────────────────────────────────
function getStatus(lot) {
  const du   = parseFloat(lot.total_du   ?? 0);
  const recu = parseFloat(lot.total_recu ?? 0);
  if (du <= 0) return "À jour";
  if (recu > 0) return "Partiel";
  return "Impayé";
}

const STATUS_STYLES = {
  "À jour":  { card: "bg-green-50  border-green-200",  badge: "bg-green-100  text-green-700",  dot: "bg-green-500"  },
  "Partiel": { card: "bg-amber-50  border-amber-200",  badge: "bg-amber-100  text-amber-700",  dot: "bg-amber-500"  },
  "Impayé":  { card: "bg-red-50    border-red-200",    badge: "bg-red-100    text-red-600",    dot: "bg-red-500"    },
};

// ── Phone helpers ───────────────────────────────────────────
function cleanPhone(raw) {
  return (raw || "").replace(/\s+/g, "").replace(/^0/, "212");
}

// ── Card action menu ────────────────────────────────────────
function ActionsMenu({ lot, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const phone = lot.representant?.telephone || "";
  const waNum = cleanPhone(phone);

  const actions = [
    {
      label: "Voir fiche lot",
      icon: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      onClick: () => { onNavigate(`/lots/${lot.id}`); setOpen(false); },
    },
    {
      label: "Enregistrer paiement",
      icon: "M12 4v16m8-8H4",
      onClick: () => { onNavigate(`/paiements?lot=${lot.id}`); setOpen(false); },
    },
    ...(phone ? [{
      label: "Envoyer SMS",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      href: `sms:${phone}`,
    }] : []),
    ...(phone ? [{
      label: "Envoyer WhatsApp",
      icon: "M12 2C6.477 2 2 6.477 2 12c0 1.89.522 3.66 1.43 5.18L2 22l4.95-1.41A9.966 9.966 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z",
      href: `https://wa.me/${waNum}?text=${encodeURIComponent(`Cher(e) propriétaire du Lot ${lot.numero_lot}, un solde de ${fmt(Math.max(0, parseFloat(lot.total_du ?? 0) - parseFloat(lot.total_recu ?? 0)))} MAD est en attente de règlement. Merci de régulariser votre situation. — Syndic`)}`,
      target: "_blank",
    }] : []),
  ];

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded-lg hover:bg-white/80 text-slate-400 hover:text-slate-600 transition"
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5"  r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden">
          {actions.map((a, i) =>
            a.href ? (
              <a key={i} href={a.href} target={a.target} rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={a.icon}/>
                </svg>
                {a.label}
              </a>
            ) : (
              <button key={i} onClick={a.onClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition text-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={a.icon}/>
                </svg>
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Lot card ────────────────────────────────────────────────
function LotCard({ lot, onNavigate }) {
  const status = getStatus(lot);
  const st     = STATUS_STYLES[status];
  const du     = parseFloat(lot.total_du ?? 0);
  const rep    = lot.representant;
  const name   = rep ? `${rep.nom} ${rep.prenom ?? ""}`.trim() : null;
  const phone  = rep?.telephone || "";

  return (
    <div className={`rounded-lg border ${st.card} px-2.5 py-2 hover:shadow-sm transition-shadow cursor-pointer`}
      onClick={() => onNavigate(`/lots/${lot.id}`)}>

      {/* Single compact row */}
      <div className="flex items-center justify-between gap-1.5">

        {/* Left: number + owner */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-slate-800">{lot.numero_lot}</span>
            {lot.type_lot && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-px rounded font-medium uppercase tracking-wide leading-none">
                {lot.type_lot}
              </span>
            )}
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[10px] font-semibold ${st.badge}`}>
              <span className={`w-1 h-1 rounded-full ${st.dot}`}/>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {name ? (
              <span className="text-xs text-slate-600 truncate">{name}</span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">—</span>
            )}
            {phone && (
              <span className="text-[10px] text-slate-400 truncate">· {phone}</span>
            )}
          </div>
        </div>

        {/* Right: balance + menu */}
        <div className="flex items-center gap-1 shrink-0">
          {du > 0 ? (
            <span className="font-bold text-xs text-red-600 whitespace-nowrap">{fmt(du)}</span>
          ) : (
            <span className="text-[10px] font-semibold text-green-600">✓</span>
          )}
          <ActionsMenu lot={lot} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "balance_desc", label: "Solde restant ↓" },
  { value: "numero",       label: "N° de lot" },
  { value: "nom",          label: "Nom propriétaire" },
];

export default function LotsKanban() {
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const residenceFromQuery = searchParams.get("residence");

  const [residences,          setResidences]          = useState([]);
  const [selectedResidenceId, setSelectedResidenceId] = useState("");
  const [groupes,             setGroupes]             = useState([]);
  const [lots,                setLots]                = useState([]);
  const [loadingLots,         setLoadingLots]         = useState(false);
  const [error,               setError]               = useState("");
  const [search,              setSearch]              = useState("");
  const [sortBy,              setSortBy]              = useState("balance_desc");

  // ── Load ──────────────────────────────────────────────────
  const loadResidences = async () => {
    const all = await fetchAll("/api/residences/");
    setResidences(all);
    const id = residenceFromQuery || (all.length > 0 ? String(all[0].id) : "");
    setSelectedResidenceId(id);
  };

  const loadData = async (resId) => {
    if (!resId) return;
    setLoadingLots(true);
    setError("");
    try {
      const [allLots, allGroupes] = await Promise.all([
        fetchAll(`/api/lots/?residence=${resId}`),
        fetchAll(`/api/groupes/?residence=${resId}`),
      ]);
      setLots(allLots);
      setGroupes(allGroupes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLots(false);
    }
  };

  useEffect(() => { loadResidences(); }, []);
  useEffect(() => { if (selectedResidenceId) loadData(selectedResidenceId); }, [selectedResidenceId]);

  // ── Filter & sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter(l => {
      if (!q) return true;
      const rep  = l.representant;
      const name = rep ? `${rep.nom} ${rep.prenom ?? ""}`.toLowerCase() : "";
      const tel  = (rep?.telephone || "").toLowerCase();
      return (
        l.numero_lot.toLowerCase().includes(q) ||
        name.includes(q) ||
        tel.includes(q)
      );
    });
  }, [lots, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "balance_desc") {
        return parseFloat(b.total_du ?? 0) - parseFloat(a.total_du ?? 0);
      }
      if (sortBy === "nom") {
        const na = a.representant ? `${a.representant.nom} ${a.representant.prenom ?? ""}` : "zzz";
        const nb = b.representant ? `${b.representant.nom} ${b.representant.prenom ?? ""}` : "zzz";
        return na.localeCompare(nb, "fr");
      }
      // numero
      return (a.numero_lot ?? "").localeCompare(b.numero_lot ?? "", "fr", { numeric: true });
    });
  }, [filtered, sortBy]);

  // ── Group by groupe ───────────────────────────────────────
  const lotsByGroupe = useMemo(() => {
    const map = new Map();
    for (const l of sorted) {
      const key = l.groupe ?? "UNGROUPED";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    }
    return map;
  }, [sorted]);

  const groupeName = (id) => {
    if (id === "UNGROUPED") return "Sans groupe";
    return groupes.find(g => String(g.id) === String(id))?.nom_groupe ?? `Groupe #${id}`;
  };

  // ── Summary stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = lots.length;
    const ajour    = lots.filter(l => getStatus(l) === "À jour").length;
    const retard   = lots.filter(l => getStatus(l) !== "À jour").length;
    const restant  = lots.reduce((s, l) => s + Math.max(parseFloat(l.total_du ?? 0), 0), 0);
    return { total, ajour, retard, restant };
  }, [lots]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* ── Retour ── */}
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">
        ← Tableau de bord
      </button>

      {/* ── Summary header ── */}
      {lots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Total",    value: stats.total,                 color: "bg-slate-100 text-slate-700 border border-slate-200" },
            { label: "À jour",   value: stats.ajour,                 color: "bg-green-50  text-green-700  border border-green-200" },
            { label: "Retard",   value: stats.retard,                color: "bg-red-50    text-red-700    border border-red-200" },
            { label: "Reste",    value: `${fmt(stats.restant)} DH`,  color: "bg-amber-50  text-amber-700  border border-amber-200" },
          ].map((s, i) => (
            <div key={i} className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 ${s.color} shadow-sm`}>
              <span className="text-[10px] font-medium opacity-70 uppercase tracking-wide">{s.label}</span>
              <span className="text-sm font-bold mt-0.5 text-center break-all">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Control bar ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Lot, propriétaire, téléphone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Trier par</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">{filtered.length}/{lots.length} lot{lots.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => navigate(`/lots/new?residence=${selectedResidenceId}`)}
            disabled={!selectedResidenceId}
            className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 font-semibold"
          >
            + Nouveau lot
          </button>
        </div>
      </div>

      {/* ── Kanban ── */}
      {loadingLots ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-16 text-center text-slate-400 text-sm">
          Chargement…
        </div>
      ) : lotsByGroupe.size === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-16 text-center text-slate-400 text-sm">
          {search ? "Aucun lot ne correspond à la recherche." : "Aucun lot pour cette résidence."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from(lotsByGroupe.entries()).map(([groupeId, groupLots]) => {
            const groupDu = groupLots.reduce((s, l) => s + Math.max(parseFloat(l.total_du ?? 0), 0), 0);
            const nbRetard = groupLots.filter(l => getStatus(l) !== "À jour").length;
            return (
              <div key={groupeId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {/* Group header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-700 text-sm">{groupeName(groupeId)}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{groupLots.length} lot{groupLots.length > 1 ? "s" : ""}</span>
                      {nbRetard > 0 && (
                        <span className="text-xs text-red-500 font-medium">{nbRetard} en retard</span>
                      )}
                    </div>
                  </div>
                  {groupDu > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Reste dû</div>
                      <div className="text-sm font-bold text-red-600">{fmt(groupDu)}</div>
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {groupLots.map(lot => (
                    <LotCard key={lot.id} lot={lot} onNavigate={navigate} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

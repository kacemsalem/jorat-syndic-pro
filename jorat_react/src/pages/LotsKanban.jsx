import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

  const actions = [
    {
      label: "Modifier le lot",
      icon: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
      onClick: () => { onNavigate(`/lots/${lot.id}`); setOpen(false); },
    },
  ];

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
        title="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5"  r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden">
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
  const rep   = lot.representant;
  const name  = rep ? `${rep.nom} ${rep.prenom ?? ""}`.trim() : null;
  const phone = rep?.telephone || "";
  const email = rep?.email || "";

  return (
    <div className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onNavigate(`/lots/${lot.id}`)}>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Lot number + type */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-slate-800">{lot.numero_lot}</span>
            {lot.type_lot && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-px rounded font-medium uppercase tracking-wide">
                {lot.type_lot}
              </span>
            )}
          </div>
          {/* Contact info */}
          {name && (
            <p className="text-xs text-slate-600 mt-0.5 truncate">{name}</p>
          )}
          {(phone || email) && (
            <p className="text-[10px] text-slate-400 mt-px truncate">
              {phone}{phone && email ? " · " : ""}{email}
            </p>
          )}
          {!name && !phone && !email && (
            <p className="text-[10px] text-slate-400 italic mt-0.5">Aucun contact</p>
          )}
        </div>

        <ActionsMenu lot={lot} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
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
  const [groupeFilter,        setGroupeFilter]        = useState("");

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

  // ── Filter ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter(l => {
      if (groupeFilter && String(l.groupe ?? "UNGROUPED") !== groupeFilter) return false;
      if (!q) return true;
      const rep  = l.representant;
      const name = rep ? `${rep.nom} ${rep.prenom ?? ""}`.toLowerCase() : "";
      const tel  = (rep?.telephone || "").toLowerCase();
      const mail = (rep?.email || "").toLowerCase();
      return (
        l.numero_lot.toLowerCase().includes(q) ||
        name.includes(q) ||
        tel.includes(q) ||
        mail.includes(q)
      );
    });
  }, [lots, search, groupeFilter]);

  // Sort by groupe then lot number (default)
  const sorted = useMemo(() => (
    [...filtered].sort((a, b) =>
      (a.numero_lot ?? "").localeCompare(b.numero_lot ?? "", "fr", { numeric: true })
    )
  ), [filtered]);

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

  const resName = residences.find(r => String(r.id) === String(selectedResidenceId))?.nom_residence ?? "";

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-10">
        <div className="flex items-center justify-between gap-3">
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
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
              <h1 className="text-white font-bold text-lg leading-tight">Lots</h1>
            </div>
          </div>
          <button
            onClick={() => navigate(`/lots/new?residence=${selectedResidenceId}`)}
            disabled={!selectedResidenceId}
            className="bg-white text-blue-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-blue-50 transition disabled:opacity-50"
          >
            + Nouveau lot
          </button>
        </div>
        {resName && (
          <p className="text-white/50 text-[10px] mt-2">{resName} · {lots.length} lot{lots.length !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="px-4 -mt-5 space-y-4">

        {/* ── Barre de recherche ── */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Lot, nom, téléphone, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <select
            value={groupeFilter}
            onChange={e => setGroupeFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">Tous les groupes</option>
            {groupes.map(g => (
              <option key={g.id} value={String(g.id)}>{g.nom_groupe}</option>
            ))}
            <option value="UNGROUPED">Sans groupe</option>
          </select>
          <span className="text-xs text-slate-400 whitespace-nowrap">{filtered.length}/{lots.length}</span>
        </div>

        {/* ── Kanban ── */}
        {loadingLots ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-slate-400 text-sm">
            Chargement…
          </div>
        ) : lotsByGroupe.size === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-slate-400 text-sm">
            {search ? "Aucun lot ne correspond à la recherche." : "Aucun lot pour cette résidence."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from(lotsByGroupe.entries()).map(([groupeId, groupLots]) => (
              <div key={groupeId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{groupeName(groupeId)}</p>
                    <p className="text-[10px] text-slate-400 mt-px">{groupLots.length} lot{groupLots.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-2">
                  {groupLots.map(lot => (
                    <LotCard key={lot.id} lot={lot} onNavigate={navigate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}

      </div>
    </div>
  );
}

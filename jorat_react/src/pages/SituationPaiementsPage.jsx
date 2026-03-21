import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MONTHS = ["JAN","FÉV","MAR","AVR","MAI","JUN","JUL","AOÛ","SEP","OCT","NOV","DÉC"];

const SEG_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
];

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt = (v) => FMT.format(v);

// ── Payment timeline bar ──────────────────────────────────────
function PaymentBar({ totalDu, paiements }) {
  if (!totalDu || totalDu <= 0) {
    return (
      <div className="flex items-center h-10 text-xs text-slate-400 italic">
        Aucun appel de charge
      </div>
    );
  }

  const totalPaid = paiements.reduce((s, p) => s + p.montant, 0);

  let offsetPct = 0;
  const segments = paiements.map((p, i) => {
    const widthPct = Math.min((p.montant / totalDu) * 100, 100 - offsetPct);
    const seg = { ...p, offsetPct, widthPct, idx: i };
    offsetPct = Math.min(offsetPct + widthPct, 100);
    return seg;
  });

  const totalBarPct = Math.min((totalPaid / totalDu) * 100, 100);
  const monthsCovered = (totalPaid / totalDu) * 12;

  return (
    <div className="w-full overflow-hidden">
      {/* Month labels */}
      <div className="flex mb-0.5">
        {MONTHS.map((m, i) => (
          <div
            key={i}
            className="flex-1 text-center leading-none pb-0.5 border-l border-slate-200 first:border-l-0 overflow-hidden"
            style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 500, minWidth: 0 }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Track */}
      <div
        className="relative h-4 rounded overflow-hidden"
        style={{ background: "#f1f5f9" }}
        title={`${fmt(totalPaid)} / ${fmt(totalDu)} MAD — ${monthsCovered.toFixed(1)} mois couverts`}
      >
        {/* Month grid separators */}
        <div className="absolute inset-0 flex pointer-events-none">
          {MONTHS.map((_, i) => (
            <div key={i} className="flex-1 h-full border-l border-white/60 first:border-l-0" />
          ))}
        </div>

        {/* Payment segments */}
        {segments.map((seg) => (
          <div
            key={seg.idx}
            className="absolute inset-y-0 flex items-center justify-center overflow-hidden"
            style={{
              left:            `${seg.offsetPct}%`,
              width:           `${seg.widthPct}%`,
              backgroundColor: SEG_COLORS[seg.idx % SEG_COLORS.length],
              borderRight:     seg.idx < segments.length - 1 ? "1.5px solid rgba(255,255,255,0.75)" : "none",
            }}
          >
            {seg.widthPct > 12 && (
              <span style={{ fontSize: "8px", color: "white", fontWeight: 600, padding: "0 2px", lineHeight: 1, overflow: "hidden", maxWidth: "100%" }}>
                {fmt(seg.montant)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar + summary */}
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden min-w-0">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${totalBarPct}%`,
              background: totalBarPct >= 100 ? "#10b981" : totalBarPct > 50 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
        <span style={{ fontSize: "8px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
          {fmt(totalPaid)}/{fmt(totalDu)}
        </span>
      </div>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────
function StatusDot({ totalDu, paiements }) {
  if (!totalDu || totalDu <= 0) return null;
  const paid = paiements.reduce((s, p) => s + p.montant, 0);
  const color = paid >= totalDu ? "#10b981" : paid > 0 ? "#f59e0b" : "#ef4444";
  const label = paid >= totalDu ? "Soldé" : paid > 0 ? "Partiel" : "Impayé";
  return <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: color }} title={label} />;
}

// ── Main page ─────────────────────────────────────────────────
export default function SituationPaiementsPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [lots,        setLots]       = useState([]);
  const [yearOptions, setYearOptions] = useState([currentYear]);
  const [loading,    setLoading]    = useState(true);
  const [year,       setYear]       = useState(currentYear);
  const [filter,     setFilter]     = useState("TOUS");
  const [typeCharge, setTypeCharge] = useState("CHARGE");
  const [search,     setSearch]     = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/situation-paiements/?year=${year}&type_charge=${typeCharge}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { years: [], lots: [] }))
      .then((d) => {
        const availYears = d.years ?? [];
        setYearOptions(availYears.length > 0 ? availYears : [currentYear]);
        // Si l'année sélectionnée n'existe pas dans les données, passer à la première dispo
        if (availYears.length > 0 && !availYears.includes(year)) {
          setYear(availYears[0]);
        }
        setLots(d.lots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, typeCharge]);

  const rows = lots.filter((row) => {
    const q = search.toLowerCase().trim();
    if (q && !row.lot.toLowerCase().includes(q) && !row.nom.toLowerCase().includes(q)) return false;
    if (filter === "TOUS") return true;
    const paid = row.paiements.reduce((s, p) => s + p.montant, 0);
    if (filter === "SOLDES")  return row.total_du > 0 && paid >= row.total_du;
    if (filter === "IMPAYES") return row.total_du > 0 && paid < row.total_du;
    return true;
  });

  // Stats
  const stats = {
    soldes:   lots.filter((r) => r.total_du > 0 && r.paiements.reduce((s,p)=>s+p.montant,0) >= r.total_du).length,
    partiels: lots.filter((r) => { const p=r.paiements.reduce((s,p)=>s+p.montant,0); return r.total_du>0 && p>0 && p<r.total_du; }).length,
    impayes:  lots.filter((r) => r.total_du > 0 && r.paiements.reduce((s,p)=>s+p.montant,0) === 0).length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Tableau de bord</button>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Analyse des Paiements</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Couverture mensuelle par lot — exercice {year} —{" "}
            <span className={typeCharge === "CHARGE" ? "text-indigo-600 font-semibold" : "text-amber-600 font-semibold"}>
              {typeCharge === "CHARGE" ? "Appel de charge" : "Appel de fond"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Lot ou nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-36"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Type selector */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
            {[
              { key: "CHARGE", label: "Appel de charge" },
              { key: "FOND",   label: "Appel de fond"   },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeCharge(key)}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  typeCharge === key
                    ? key === "CHARGE"
                      ? "bg-indigo-600 text-white"
                      : "bg-amber-500 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {[
            { key: "TOUS",    label: "Tous"     },
            { key: "IMPAYES", label: "Impayés"  },
            { key: "SOLDES",  label: "Soldés"   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && lots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Soldés",   value: stats.soldes,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Partiels", value: stats.partiels, color: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "Impayés",  value: stats.impayes,  color: "text-red-600",     bg: "bg-red-50"     },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-white px-4 py-3 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-white rounded-xl border border-slate-100 px-4 py-2">
        <span className="font-semibold text-slate-600 mr-1">Segments :</span>
        {SEG_COLORS.slice(0, 4).map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-6 h-3 rounded inline-block" style={{ backgroundColor: c }} />
            {i + 1}ᵉ paiement
          </span>
        ))}
      </div>

      {/* ── Kanban ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400 text-sm">
          Aucun lot trouvé pour {year}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          {[
            { label: "Soldés",   dotColor: "#10b981", border: "border-emerald-300", header: "bg-emerald-500",
              bodyBg: "rgba(167,243,208,0.45)", cardBg: "bg-white border-emerald-200", amtColor: "text-emerald-600",
              items: rows.filter(r => r.total_du > 0 && r.paiements.reduce((s,p)=>s+p.montant,0) >= r.total_du) },
            { label: "Partiels", dotColor: "#f59e0b", border: "border-amber-300",   header: "bg-amber-400",
              bodyBg: "rgba(253,230,138,0.45)", cardBg: "bg-white border-amber-200", amtColor: "text-amber-600",
              items: rows.filter(r => { const p=r.paiements.reduce((s,p)=>s+p.montant,0); return r.total_du>0 && p>0 && p<r.total_du; }) },
            { label: "Impayés",  dotColor: "#ef4444", border: "border-rose-300",    header: "bg-rose-500",
              bodyBg: "rgba(254,205,211,0.5)",  cardBg: "bg-white border-rose-200",  amtColor: "text-rose-600",
              items: rows.filter(r => r.total_du > 0 && r.paiements.reduce((s,p)=>s+p.montant,0) === 0) },
          ].map(({ label, dotColor, border, header, bodyBg, cardBg, amtColor, items }) => (
            <div key={label} className={`rounded-2xl border ${border} overflow-hidden`}>
              <div className={`${header} px-3 py-2 flex items-center gap-2`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white/70 flex-shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">{label}</span>
                <span className="ml-auto text-xs font-semibold text-white/80">{items.length}</span>
              </div>
              <div className="p-2 space-y-2" style={{ backgroundColor: bodyBg }}>
                {items.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-4">Aucun lot</p>
                )}
                {items.map(row => {
                  return (
                    <div key={row.lot} className={`rounded-xl border p-3 space-y-2 hover:shadow-sm transition ${cardBg}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <StatusDot totalDu={row.total_du} paiements={row.paiements} />
                          <span className="font-bold text-slate-800 text-sm">{row.lot}</span>
                        </div>
                        {row.total_du > 0 && (
                          <span className={`text-xs font-mono font-semibold whitespace-nowrap ${amtColor}`}>
                            {fmt(row.total_du)} <span className="text-slate-400 font-normal">MAD</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{row.nom}</p>
                      <PaymentBar totalDu={row.total_du} paiements={row.paiements} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

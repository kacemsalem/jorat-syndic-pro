import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const ANNEE = new Date().getFullYear();
const MOIS_DEBUT = `${ANNEE}-01-01`;
const MOIS_FIN   = `${ANNEE}-12-31`;

function fmt(v) {
  return Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
}

function KPICard({ label, value, color, bg, sub }) {
  return (
    <div style={{
      background: bg || "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 3,
    }}>
      <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: color || "#0f172a", lineHeight: 1.1, wordBreak: "break-word" }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: "#64748b" }}>{sub}</span>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 28 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          marginBottom: open ? 14 : 0,
        }}
      >
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#64748b",
          textTransform: "uppercase", letterSpacing: 2,
          borderLeft: "3px solid #c9a84c", paddingLeft: 10,
        }}>{title}</div>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#94a3b8", userSelect: "none" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

function KanbanList({ items, emptyText = "Aucune donnée" }) {
  if (!items || items.length === 0) return (
    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">{emptyText}</div>
  );
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 flex items-center justify-between gap-3 hover:shadow-sm transition">
          {item}
        </div>
      ))}
    </div>
  );
}

const TYPE_LABELS = {
  SOLDE_INITIAL: "Solde initial",
  PAIEMENT:      "Paiement",
  DEPENSE:       "Dépense",
  AJUSTEMENT:    "Ajustement",
  RECETTE:       "Recette",
};

export default function RapportFinancierPage() {
  const navigate = useNavigate();

  const [dateDeb, setDateDeb] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const loadData = (deb = dateDeb, fin = dateFin) => {
    setLoading(true); setError("");
    const qs = new URLSearchParams();
    if (deb) qs.set("date_debut", deb);
    if (fin) qs.set("date_fin",   fin);
    fetch(`/api/rapport-financier/?${qs}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e?.detail || "Erreur de chargement"); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);   // charge au démarrage

  const exportUrl = (type) => {
    const qs = new URLSearchParams();
    if (dateDeb) qs.set("date_debut", dateDeb);
    if (dateFin) qs.set("date_fin",   dateFin);
    return `/api/rapport-financier/export/${type}/?${qs}`;
  };

  // Tableaux calculés
  const mvRows = useMemo(() => {
    if (!data) return [];
    return data.mouvements.map(m => [
      m.date,
      TYPE_LABELS[m.type_mouvement] || m.type_mouvement,
      m.libelle,
      parseFloat(m.debit)  > 0 ? `${fmt(m.debit)} MAD`  : "",
      parseFloat(m.credit) > 0 ? `${fmt(m.credit)} MAD` : "",
    ]);
  }, [data]);

  const situationLotsRows = useMemo(() => {
    if (!data?.situation_lots) return [];
    return data.situation_lots.map(lot => {
      const reste = parseFloat(lot.reste);
      const statutCell = lot.statut === "A_JOUR"
        ? <span style={{ color: "#059669", fontWeight: 600, fontSize: 11 }}>À jour</span>
        : <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 11 }}>En retard</span>;
      const resteCell = reste > 0
        ? <span style={{ color: "#dc2626", fontWeight: 700 }}>{fmt(lot.reste)} MAD</span>
        : <span style={{ color: "#059669" }}>{fmt(lot.reste)} MAD</span>;
      return [lot.lot, lot.proprietaire, `${fmt(lot.total_du)} MAD`, `${fmt(lot.total_paye)} MAD`, resteCell, statutCell];
    });
  }, [data]);

  const balance = data ? parseFloat(data.balance) : 0;

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Rapport financier</h1>
          </div>
          {/* Exports */}
          <div className="flex gap-2">
            <a href={exportUrl("excel")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 border border-white/30 text-white rounded-xl text-xs font-semibold hover:bg-white/30 transition no-underline"
            >↓ Excel</a>
            <a href={exportUrl("pdf")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 border border-white/30 text-white rounded-xl text-xs font-semibold hover:bg-white/30 transition no-underline"
            >↓ PDF</a>
          </div>
        </div>
        {/* Filtres dates + raccourcis */}
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dateDeb} onChange={e => setDateDeb(e.target.value)}
            className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none [color-scheme:dark]" />
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="text-xs border border-white/30 rounded-xl px-3 py-1.5 bg-white/20 text-white focus:outline-none [color-scheme:dark]" />
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/20 border border-white/30 hover:bg-white/30 transition disabled:opacity-50"
          >
            {loading ? "Chargement…" : "Actualiser"}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Tout",             d: "",                  f: "" },
              { label: "Cette année",      d: `${ANNEE}-01-01`,    f: `${ANNEE}-12-31` },
              { label: "Année passée",     d: `${ANNEE-1}-01-01`,  f: `${ANNEE-1}-12-31` },
              { label: "6 mois",           d: (() => { const dt = new Date(); dt.setMonth(dt.getMonth()-6); return dt.toISOString().slice(0,10); })(), f: new Date().toISOString().slice(0,10) },
            ].map(({ label, d, f }) => (
              <button key={label}
                onClick={() => { setDateDeb(d); setDateFin(f); loadData(d, f); }}
                className="px-2.5 py-1.5 border border-white/30 rounded-xl text-xs text-white/80 hover:bg-white/10 transition"
              >{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 -mt-5 pb-24 max-w-5xl mx-auto space-y-4">

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 20px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 15 }}>Chargement…</div>
      )}

      {data && (
        <>
          <Section title="Résumé financier">
            <div className="grid grid-cols-1 gap-3">
              <KPICard label="Balance période" value={`${fmt(data.balance)} MAD`}
                color={balance >= 0 ? "#059669" : "#dc2626"}
                bg={balance >= 0 ? "#f0fdf4" : "#fef2f2"}
                sub={balance >= 0 ? "Excédent" : "Déficit"} />
            </div>
          </Section>

          <Section title={`Mouvements de caisse (${data.mouvements.length})`}>
            <div className="space-y-1.5">
              {data.mouvements.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">Aucun mouvement</div>
              ) : data.mouvements.map((m, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 hover:shadow-sm transition min-h-[3rem]">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap w-20">{m.date}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                      m.type_mouvement === "PAIEMENT" ? "bg-emerald-100 text-emerald-700" :
                      m.type_mouvement === "DEPENSE"  ? "bg-red-100 text-red-700" :
                      m.type_mouvement === "RECETTE"  ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{TYPE_LABELS[m.type_mouvement] || m.type_mouvement}</span>
                  </div>
                  <span className="text-xs text-slate-700 flex-1 leading-snug">{m.libelle}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    {parseFloat(m.debit) > 0 && <span className="text-xs font-mono font-semibold text-red-600 whitespace-nowrap">{fmt(m.debit)} MAD</span>}
                    {parseFloat(m.credit) > 0 && <span className="text-xs font-mono font-semibold text-emerald-600 whitespace-nowrap">{fmt(m.credit)} MAD</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Situation des lots (${data.situation_lots?.length ?? 0})`} defaultOpen={false}>
            <div className="space-y-1.5">
              {(data.situation_lots ?? []).length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Aucun lot</div>
              )}
              {(data.situation_lots ?? []).map((lot, i) => {
                const reste = parseFloat(lot.reste);
                return (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5 flex items-center gap-3 hover:shadow-sm transition">
                    <span className="text-sm font-bold text-slate-800 w-16 shrink-0">{lot.lot}</span>
                    <span className="text-xs text-slate-500 flex-1 truncate">{lot.proprietaire}</span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">Dû : {fmt(lot.total_du)}</span>
                    <span className="text-[11px] font-mono text-emerald-600 shrink-0">Payé : {fmt(lot.total_paye)}</span>
                    <span className={`text-xs font-mono font-bold shrink-0 ${reste > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(reste)} MAD</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${lot.statut === "A_JOUR" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {lot.statut === "A_JOUR" ? "À jour" : "En retard"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      </div>
    </div>
  );
}

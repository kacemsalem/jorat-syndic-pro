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

  const depCompteRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.dep_par_compte)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([k, v]) => [k, `${fmt(v)} MAD`]);
  }, [data]);

  const depCatRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.dep_par_categorie)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([k, v]) => [k, `${fmt(v)} MAD`]);
  }, [data]);

  const recRows = useMemo(() => {
    if (!data) return [];
    const rows = [["Paiements copropriétaires", `${fmt(data.total_paiements)} MAD`]];
    Object.entries(data.rec_par_compte)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .forEach(([k, v]) => rows.push([k, `${fmt(v)} MAD`]));
    return rows;
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
    <div className="max-w-5xl mx-auto">

      <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium mb-4 transition">← Tableau de bord</button>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rapport Financier</h1>
            {data && <p className="text-xs text-slate-500 mt-0.5">{data.residence}</p>}
          </div>
        </div>

        {/* Exports */}
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl("excel")}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition no-underline"
          >
            ↓ Excel
          </a>
          <a href={exportUrl("pdf")}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition no-underline"
          >
            ↓ PDF
          </a>
        </div>
      </div>

      {/* ── Filtres ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Date début</label>
          <input type="date" value={dateDeb} onChange={e => setDateDeb(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Date fin</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700"}`}
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>

        {/* Raccourcis période */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Tout",           d: "",                  f: "" },
            { label: "Cette année",   d: `${ANNEE}-01-01`,    f: `${ANNEE}-12-31` },
            { label: "Année passée",  d: `${ANNEE-1}-01-01`,  f: `${ANNEE-1}-12-31` },
            { label: "6 derniers mois", d: (() => { const dt = new Date(); dt.setMonth(dt.getMonth()-6); return dt.toISOString().slice(0,10); })(), f: new Date().toISOString().slice(0,10) },
          ].map(({ label, d, f }) => (
            <button key={label}
              onClick={() => { setDateDeb(d); setDateFin(f); loadData(d, f); }}
              className="px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition"
            >{label}</button>
          ))}
        </div>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <KPICard label="Total entrées"    value={`${fmt(data.entrees)} MAD`}   color="#059669" bg="#f0fdf4" />
              <KPICard label="Total sorties"    value={`${fmt(data.sorties)} MAD`}   color="#dc2626" bg="#fef2f2" />
              <KPICard label="Balance période"  value={`${fmt(data.balance)} MAD`}
                color={balance >= 0 ? "#059669" : "#dc2626"}
                bg={balance >= 0 ? "#f0fdf4" : "#fef2f2"}
                sub={balance >= 0 ? "Excédent" : "Déficit"} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KPICard label="Paiements copropriétaires" value={`${fmt(data.total_paiements)} MAD`} color="#0369a1" bg="#f0f9ff" />
              <KPICard label="Recettes externes"          value={`${fmt(data.total_recettes)} MAD`}  color="#059669" bg="#f0fdf4" />
              <KPICard label="Dépenses"                   value={`${fmt(data.total_depenses)} MAD`}  color="#dc2626" bg="#fef2f2" />
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

          <Section title="Analyse des dépenses">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Par compte comptable</p>
                <div className="space-y-1.5">
                  {depCompteRows.length === 0 ? <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Aucune donnée</div>
                  : depCompteRows.map(([k, v], i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between gap-3 hover:shadow-sm transition">
                      <span className="text-xs text-slate-700 truncate">{k}</span>
                      <span className="text-xs font-mono font-semibold text-red-600 whitespace-nowrap flex-shrink-0">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Par catégorie</p>
                <div className="space-y-1.5">
                  {depCatRows.length === 0 ? <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Aucune donnée</div>
                  : depCatRows.map(([k, v], i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between gap-3 hover:shadow-sm transition">
                      <span className="text-xs text-slate-700 truncate">{k}</span>
                      <span className="text-xs font-mono font-semibold text-red-600 whitespace-nowrap flex-shrink-0">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Recettes & paiements">
            <div className="space-y-1.5">
              {recRows.length === 0 ? <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Aucune donnée</div>
              : recRows.map(([k, v], i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between gap-3 hover:shadow-sm transition">
                  <span className="text-xs text-slate-700 truncate">{k}</span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 whitespace-nowrap flex-shrink-0">{v}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Situation des lots (${data.situation_lots?.length ?? 0})`} defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {[
                { label: "À jour",    color: "border-emerald-100", header: "bg-emerald-50", textColor: "text-emerald-700",
                  items: (data.situation_lots ?? []).filter(l => l.statut === "A_JOUR") },
                { label: "En retard", color: "border-red-100",     header: "bg-red-50",     textColor: "text-red-700",
                  items: (data.situation_lots ?? []).filter(l => l.statut !== "A_JOUR") },
              ].map(({ label, color, header, textColor, items }) => (
                <div key={label} className={`rounded-2xl border ${color} overflow-hidden`}>
                  <div className={`${header} px-3 py-2 flex items-center justify-between`}>
                    <span className={`text-xs font-bold ${textColor} uppercase tracking-wide`}>{label}</span>
                    <span className="text-xs text-slate-400">{items.length}</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {items.length === 0 && <p className="text-xs text-slate-300 text-center py-3">Aucun lot</p>}
                    {items.map((lot, i) => {
                      const reste = parseFloat(lot.reste);
                      return (
                        <div key={i} className="bg-white rounded-xl border border-slate-100 px-3 py-2 space-y-1 hover:shadow-sm transition">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-800">{lot.lot}</span>
                            <span className={`text-xs font-mono font-bold ${reste > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(lot.reste)} MAD</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{lot.proprietaire}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Dû : {fmt(lot.total_du)} MAD</span>
                            <span>Payé : {fmt(lot.total_paye)} MAD</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

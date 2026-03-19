import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const ANNEE_COURANTE = new Date().getFullYear();

const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "—");

function KPI({ label, value, sub, color = "#0f172a", bg = "#f8fafc" }) {
  return (
    <div style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

export default function RapportsPage() {
  const navigate = useNavigate();
  const [annee, setAnnee] = useState(String(ANNEE_COURANTE));

  const [mouvements,    setMouvements]    = useState([]);
  const [depenses,      setDepenses]      = useState([]);
  const [recettes,      setRecettes]      = useState([]);
  const [appels,        setAppels]        = useState([]);
  const [details,       setDetails]       = useState([]);
  const [lots,          setLots]          = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/caisse-mouvements/",          { credentials: "include" }).then(r => r.json()),
      fetch(`/api/depenses/?annee=${annee}`,     { credentials: "include" }).then(r => r.json()),
      fetch(`/api/recettes/?annee=${annee}`,     { credentials: "include" }).then(r => r.json()),
      fetch(`/api/appels-charge/?exercice=${annee}`, { credentials: "include" }).then(r => r.json()),
      fetch("/api/details-appel/",              { credentials: "include" }).then(r => r.json()),
      fetch("/api/lots/",                       { credentials: "include" }).then(r => r.json()),
    ]).then(([mv, dep, rec, app, det, lt]) => {
      setMouvements(Array.isArray(mv)  ? mv  : (mv.results  ?? []));
      setDepenses(  Array.isArray(dep) ? dep : (dep.results ?? []));
      setRecettes(  Array.isArray(rec) ? rec : (rec.results ?? []));
      setAppels(    Array.isArray(app) ? app : (app.results ?? []));
      setDetails(   Array.isArray(det) ? det : (det.results ?? []));
      setLots(      Array.isArray(lt)  ? lt  : (lt.results  ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [annee]);

  // ── KPIs caisse ──────────────────────────────────────────
  const mvAnnee = useMemo(() =>
    mouvements.filter(m => m.date_mouvement?.startsWith(annee)),
    [mouvements, annee]);

  const solde = useMemo(() =>
    mouvements.reduce((acc, m) =>
      m.sens === "DEBIT" ? acc + parseFloat(m.montant || 0) : acc - parseFloat(m.montant || 0)
    , 0), [mouvements]);

  const entrees = useMemo(() =>
    mvAnnee.filter(m => m.sens === "DEBIT").reduce((s, m) => s + parseFloat(m.montant || 0), 0),
    [mvAnnee]);

  const sorties = useMemo(() =>
    mvAnnee.filter(m => m.sens === "CREDIT").reduce((s, m) => s + parseFloat(m.montant || 0), 0),
    [mvAnnee]);

  // ── KPIs dépenses ─────────────────────────────────────────
  const totalDepenses = useMemo(() =>
    depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0), [depenses]);

  const depParFamille = useMemo(() => {
    const map = {};
    depenses.forEach(d => {
      const k = d.categorie_famille || "DIVERS";
      map[k] = (map[k] || 0) + parseFloat(d.montant || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [depenses]);

  // ── KPIs recettes ─────────────────────────────────────────
  const totalRecettes = useMemo(() =>
    recettes.reduce((s, r) => s + parseFloat(r.montant || 0), 0), [recettes]);

  // ── KPIs recouvrement ─────────────────────────────────────
  const totalAppele = useMemo(() =>
    details.reduce((s, d) => s + parseFloat(d.montant || 0), 0), [details]);

  const totalRecouvre = useMemo(() =>
    details.reduce((s, d) => s + parseFloat(d.montant_recu || 0), 0), [details]);

  const totalImpaye = totalAppele - totalRecouvre;

  const detailsByLot = useMemo(() => {
    const map = {};
    details.forEach(d => {
      const lotId = d.lot;
      if (!map[lotId]) map[lotId] = { lot: lotId, numero: d.lot_numero || String(lotId), appele: 0, recu: 0 };
      map[lotId].appele += parseFloat(d.montant || 0);
      map[lotId].recu   += parseFloat(d.montant_recu || 0);
    });
    return Object.values(map)
      .map(r => ({ ...r, impaye: r.appele - r.recu }))
      .filter(r => r.impaye > 0)
      .sort((a, b) => b.impaye - a.impaye)
      .slice(0, 10);
  }, [details]);

  // ── Dépenses par mois ─────────────────────────────────────
  const depParMois = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 12; m++) map[String(m).padStart(2, "0")] = 0;
    depenses.forEach(d => {
      const m = d.date_depense?.slice(5, 7);
      if (m) map[m] = (map[m] || 0) + parseFloat(d.montant || 0);
    });
    const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
    return Object.entries(map).map(([k, v]) => ({ mois: MOIS[parseInt(k) - 1], val: v }));
  }, [depenses]);

  const maxDep = Math.max(...depParMois.map(m => m.val), 1);

  if (loading) return (
    <div className="max-w-5xl mx-auto py-20 text-center text-slate-400">Chargement des données…</div>
  );

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Rapports & Tableau de bord</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0" }}>Synthèse annuelle — exercice {annee}</p>
          </div>
        </div>
        <select
          value={annee}
          onChange={e => setAnnee(e.target.value)}
          style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, background: "#fff", cursor: "pointer" }}
        >
          {[ANNEE_COURANTE, ANNEE_COURANTE - 1, ANNEE_COURANTE - 2].map(a => (
            <option key={a} value={String(a)}>{a}</option>
          ))}
        </select>
      </div>

      {/* ── Trésorerie ─────────────────────────────────────── */}
      <Section title="Trésorerie">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KPI label="Solde caisse (cumul)" value={`${fmt(solde)} MAD`}
            color={solde >= 0 ? "#059669" : "#dc2626"}
            bg={solde >= 0 ? "#f0fdf4" : "#fef2f2"} />
          <KPI label={`Entrées ${annee}`}     value={`${fmt(entrees)} MAD`} color="#059669" bg="#f0fdf4" />
          <KPI label={`Sorties ${annee}`}     value={`${fmt(sorties)} MAD`} color="#dc2626" bg="#fef2f2" />
          <KPI label={`Résultat ${annee}`}    value={`${fmt(entrees - sorties)} MAD`}
            color={(entrees - sorties) >= 0 ? "#059669" : "#dc2626"}
            bg={(entrees - sorties) >= 0 ? "#f0fdf4" : "#fef2f2"} />
        </div>
      </Section>

      {/* ── Recouvrement ──────────────────────────────────── */}
      <Section title="Recouvrement">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          <KPI label="Total appelé"    value={`${fmt(totalAppele)} MAD`}    color="#0369a1" bg="#f0f9ff" />
          <KPI label="Total encaissé"  value={`${fmt(totalRecouvre)} MAD`}  color="#059669" bg="#f0fdf4" />
          <KPI label="Impayés"         value={`${fmt(totalImpaye)} MAD`}    color="#dc2626" bg="#fef2f2" />
          <KPI label="Taux recouvrement" value={`${pct(totalRecouvre, totalAppele)} %`}
            color="#7c3aed" bg="#faf5ff"
            sub={`${lots.length} lots`} />
        </div>

        {detailsByLot.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: 1 }}>
              Top impayés par lot
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Lot", "Appelé", "Encaissé", "Impayé", "Recouvrement"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailsByLot.map((r, i) => (
                  <tr key={r.lot} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0f172a" }}>{r.numero}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>{fmt(r.appele)}</td>
                    <td style={{ padding: "10px 16px", color: "#059669" }}>{fmt(r.recu)}</td>
                    <td style={{ padding: "10px 16px", color: "#dc2626", fontWeight: 700 }}>{fmt(r.impaye)}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "#fee2e2", borderRadius: 99, height: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct(r.recu, r.appele)}%`, background: "#10b981", height: "100%", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{pct(r.recu, r.appele)} %</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Dépenses ──────────────────────────────────────── */}
      <Section title={`Dépenses ${annee}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* KPIs + bar chart par mois */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <KPI label="Total dépenses" value={`${fmt(totalDepenses)} MAD`} color="#dc2626" bg="#fef2f2" />
              <KPI label="Total recettes" value={`${fmt(totalRecettes)} MAD`} color="#059669" bg="#f0fdf4"
                sub={`Résultat: ${fmt(totalRecettes - totalDepenses)} MAD`} />
            </div>

            {/* Bar chart mensuel */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Dépenses par mois</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                {depParMois.map(({ mois, val }) => (
                  <div key={mois} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div
                      title={`${mois}: ${fmt(val)} MAD`}
                      style={{ width: "100%", height: val ? `${(val / maxDep) * 70}px` : 2, background: val ? "#f59e0b" : "#e2e8f0", borderRadius: "3px 3px 0 0", minHeight: 2, transition: "height 0.3s" }}
                    />
                    <span style={{ fontSize: 9, color: "#94a3b8" }}>{mois}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dépenses par famille */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>
              Par famille
            </div>
            {depParFamille.length === 0 ? (
              <div style={{ padding: 24, color: "#94a3b8", fontSize: 13, textAlign: "center" }}>Aucune dépense</div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {depParFamille.slice(0, 8).map(([famille, montant]) => (
                  <div key={famille} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px" }}>
                    <span style={{ fontSize: 12, color: "#475569", width: 120, flexShrink: 0 }}>{famille}</span>
                    <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 99, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct(montant, totalDepenses)}%`, background: "#f59e0b", height: "100%", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", minWidth: 80, textAlign: "right" }}>
                      {fmt(montant)} MAD
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Liens rapides ─────────────────────────────────── */}
      <Section title="Accès rapides">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Rapport financier ↗", path: "/rapport-financier", color: "#ec4899" },
            { label: "Caisse",       path: "/caisse",    color: "#0ea5e9" },
            { label: "Dépenses",  path: "/depenses",  color: "#f59e0b" },
            { label: "Recettes",  path: "/recettes",  color: "#10b981" },
            { label: "Recouvrement", path: "/synthese", color: "#8b5cf6" },
          ].map(({ label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: "10px 22px", borderRadius: 10, border: `1px solid ${color}40`,
                background: `${color}10`, color, fontSize: 13, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${color}10`; }}
            >
              {label} →
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RecouvrementNav from "../components/RecouvrementNav";
import { useToast } from "../components/Toast";
import { postJson } from "../api";

const API = "/api";

const fetchJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : (d.results ?? []);
};

const ORDRE_PERIODE = { ANNEE: 0, FOND: 1 };

const fmt = (v) => Math.round(parseFloat(v ?? 0)).toLocaleString("fr-FR");
const fmtDec = (v) => parseFloat(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

const cellStyle = (recu, montant) => {
  if (!montant) return { bg: "", text: "text-slate-300", dot: "bg-slate-200" };
  const r = parseFloat(recu ?? 0) / parseFloat(montant);
  if (r >= 1)  return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" };
  if (r > 0)   return { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   };
  return              { bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-400"     };
};

// ── PDF builder ─────────────────────────────────────────────────────────────
function buildSynthesePdf({ residence, exercice, colonnesCharge, colonnesFond, lotsParGroupe, detailMap, phoneMap }) {
  const logoUrl = residence?.logo
    ? (residence.logo.startsWith("http") ? residence.logo : `${window.location.origin}${residence.logo}`)
    : null;

  // ── Helper: compute totaux for a set of colonnes ─────────────
  const computeTotaux = (colonnes) => {
    const t = {};
    let gM = 0, gR = 0;
    colonnes.forEach(col => {
      let sM = 0, sR = 0;
      lotsParGroupe.forEach(({ lots }) => lots.forEach(lot => {
        const d = detailMap[lot.id]?.[col.id];
        if (d) { sM += parseFloat(d.montant ?? 0); sR += parseFloat(d.montant_recu ?? 0); }
      }));
      t[col.id] = { montant: sM, recu: sR };
      gM += sM; gR += sR;
    });
    return { byCol: t, montant: gM, recu: gR };
  };

  // ── Helper: build one section table ──────────────────────────
  const buildTable = (colonnes, totaux, headerColor, sectionTitle) => {
    if (colonnes.length === 0) return "";

    const colHeaders = colonnes.map(col =>
      `<th style="padding:5px 6px;text-align:center;white-space:nowrap;font-size:9px;min-width:80px">${col.code_fond ?? col.periode}</th>`
    ).join("");

    const totauxRow = colonnes.map(col => {
      const t = totaux.byCol[col.id] ?? { montant: 0, recu: 0 };
      if (!t.montant) return `<td style="padding:4px 6px;text-align:center;color:#94a3b8;font-size:10px">—</td>`;
      const r2 = t.recu / t.montant;
      const bg = r2 >= 1 ? "#d1fae5" : r2 > 0 ? "#fef3c7" : "#fee2e2";
      const color = r2 >= 1 ? "#059669" : r2 > 0 ? "#d97706" : "#dc2626";
      return `<td style="padding:4px 6px;text-align:center">
        <div style="display:inline-flex;flex-direction:column;align-items:center;background:${bg};border-radius:6px;padding:3px 6px">
          <span style="font-family:monospace;font-weight:700;color:${color};font-size:10px">${fmt(t.recu)}</span>
          <span style="font-family:monospace;color:#94a3b8;font-size:9px">${fmt(t.montant)}</span>
        </div>
      </td>`;
    }).join("");

    const groupRows = lotsParGroupe.map(({ groupe, lots }) => {
      const headerRow = `<tr style="background:#f8fafc">
        <td colspan="${colonnes.length + 3}" style="padding:4px 10px;font-size:10px;font-weight:700;color:${headerColor};text-transform:uppercase;letter-spacing:0.05em">${groupe}</td>
      </tr>`;

      const lotRows = lots.map((lot, li) => {
        let lotM = 0, lotR = 0;
        colonnes.forEach(col => {
          const d = detailMap[lot.id]?.[col.id];
          if (d) { lotM += parseFloat(d.montant ?? 0); lotR += parseFloat(d.montant_recu ?? 0); }
        });
        const rowBg = li % 2 === 0 ? "#fff" : "#f8fafc";
        const residentNom = lot.representant
          ? `${lot.representant.nom ?? ""} ${lot.representant.prenom ?? ""}`.trim()
          : "—";
        const tel = phoneMap[lot.id] ? `<br/><span style="color:#94a3b8;font-size:9px">📞 ${phoneMap[lot.id]}</span>` : "";

        const cellsHtml = colonnes.map(col => {
          const d = detailMap[lot.id]?.[col.id];
          if (!d) return `<td style="padding:4px 6px;text-align:center;color:#e2e8f0;font-size:10px">—</td>`;
          const recu = parseFloat(d.montant_recu ?? 0);
          const mont = parseFloat(d.montant ?? 0);
          const r2 = mont > 0 ? recu / mont : 0;
          const bg = r2 >= 1 ? "#d1fae5" : r2 > 0 ? "#fef3c7" : "#fee2e2";
          const color = r2 >= 1 ? "#059669" : r2 > 0 ? "#d97706" : "#dc2626";
          return `<td style="padding:3px 4px;text-align:center">
            <div style="display:inline-flex;flex-direction:column;align-items:center;background:${bg};border-radius:5px;padding:2px 5px">
              <span style="font-family:monospace;font-weight:600;color:${color};font-size:10px">${fmt(recu)}</span>
              <span style="font-family:monospace;color:#94a3b8;font-size:9px">${fmt(mont)}</span>
            </div>
          </td>`;
        }).join("");

        const totalCell = lotM > 0
          ? (() => {
              const r2 = lotR / lotM;
              const bg = r2 >= 1 ? "#d1fae5" : r2 > 0 ? "#fef3c7" : "#fee2e2";
              const color = r2 >= 1 ? "#059669" : r2 > 0 ? "#d97706" : "#dc2626";
              return `<td style="padding:3px 6px;text-align:center;background:#f8fafc">
                <div style="display:inline-flex;flex-direction:column;align-items:center;background:${bg};border-radius:5px;padding:2px 6px">
                  <span style="font-family:monospace;font-weight:700;color:${color};font-size:10px">${fmt(lotR)}</span>
                  <span style="font-family:monospace;color:#94a3b8;font-size:9px">${fmt(lotM)}</span>
                </div>
              </td>`;
            })()
          : `<td style="padding:3px 6px;text-align:center;color:#e2e8f0">—</td>`;

        return `<tr style="background:${rowBg};border-bottom:1px solid #f1f5f9">
          <td style="padding:5px 8px;font-weight:700;color:${headerColor};font-size:11px;white-space:nowrap">${lot.numero_lot}</td>
          <td style="padding:5px 8px;font-size:10px;white-space:nowrap">${residentNom}${tel}</td>
          ${cellsHtml}${totalCell}
        </tr>`;
      }).join("");

      return headerRow + lotRows;
    }).join("");

    const pct = totaux.montant > 0 ? Math.round((totaux.recu / totaux.montant) * 100) : 0;

    return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:${headerColor};border-left:4px solid ${headerColor};padding-left:8px;text-transform:uppercase;letter-spacing:0.06em">${sectionTitle}</div>
          <div style="display:flex;gap:10px;font-size:10px">
            <span>Appelé : <strong>${fmtDec(totaux.montant)} MAD</strong></span>
            <span style="color:#059669">Encaissé : <strong>${fmtDec(totaux.recu)} MAD</strong></span>
            <span style="color:${totaux.montant - totaux.recu > 0 ? "#ef4444" : "#059669"}">Reste : <strong>${fmtDec(totaux.montant - totaux.recu)} MAD</strong></span>
            <span>Taux : <strong style="color:${pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#ef4444"}">${pct}%</strong></span>
          </div>
        </div>
        <table style="font-size:10px;border:1px solid #e2e8f0;width:100%">
          <thead>
            <tr style="background:#1e293b;color:#fff">
              <th style="padding:6px 8px;text-align:left;white-space:nowrap;min-width:70px;font-size:10px">Lot</th>
              <th style="padding:6px 8px;text-align:left;white-space:nowrap;min-width:140px;font-size:10px">Résident</th>
              ${colHeaders}
              <th style="padding:6px 8px;text-align:center;white-space:nowrap;background:#0f172a;font-size:10px">Total</th>
            </tr>
            <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1">
              <td colspan="2" style="padding:5px 8px;font-weight:700;font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:0.05em">Totaux</td>
              ${totauxRow}
              <td style="padding:4px 6px;text-align:center;background:#e2e8f0">
                <div style="display:inline-flex;flex-direction:column;align-items:center">
                  <span style="font-family:monospace;font-weight:700;color:#059669;font-size:11px">${fmt(totaux.recu)}</span>
                  <span style="font-family:monospace;color:#475569;font-size:9px">${fmt(totaux.montant)}</span>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>${groupRows}</tbody>
        </table>
      </div>`;
  };

  const totauxCharge = computeTotaux(colonnesCharge);
  const totauxFond   = computeTotaux(colonnesFond);
  const totalGlobal  = { montant: totauxCharge.montant + totauxFond.montant, recu: totauxCharge.recu + totauxFond.recu };
  const pctGlobal    = totalGlobal.montant > 0 ? Math.round((totalGlobal.recu / totalGlobal.montant) * 100) : 0;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Synthèse globale — Exercice ${exercice}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 16px 20px; }
    @page { size: A4 landscape; margin: 10mm 12mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #e2e8f0">
    <div style="display:flex;align-items:center;gap:12px">
      ${logoUrl
        ? `<img src="${logoUrl}" style="width:60px;height:60px;object-fit:contain;border-radius:8px" alt="Logo"/>`
        : `<div style="width:60px;height:60px;background:#e0e7ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#6366f1">${(residence?.nom_residence ?? "R")[0].toUpperCase()}</div>`
      }
      <div>
        <div style="font-size:17px;font-weight:900;color:#1e293b">${residence?.nom_residence ?? "Résidence"}</div>
        ${residence?.adresse_residence ? `<div style="font-size:10px;color:#64748b;margin-top:2px">${residence.adresse_residence}</div>` : ""}
        ${(residence?.ville_residence || residence?.code_postal_residence)
          ? `<div style="font-size:10px;color:#64748b">${[residence?.code_postal_residence, residence?.ville_residence].filter(Boolean).join(" ")}</div>`
          : ""}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:800;color:#4f46e5">Synthèse globale des charges et fonds</div>
      <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px">Exercice ${exercice}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px">Généré le ${new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}</div>
    </div>
  </div>

  <!-- KPI globaux -->
  <div style="display:flex;gap:10px;margin-bottom:14px">
    ${colonnesCharge.length > 0 ? `
    <div style="flex:1;border:1px solid #c7d2fe;border-radius:8px;padding:8px 12px;background:#f5f3ff">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#818cf8;margin-bottom:2px">Total charges appelées</div>
      <div style="font-size:13px;font-weight:800;color:#4f46e5">${fmtDec(totauxCharge.montant)} MAD</div>
      <div style="font-size:10px;color:#059669;margin-top:1px">Encaissé : ${fmtDec(totauxCharge.recu)} MAD</div>
    </div>` : ""}
    ${colonnesFond.length > 0 ? `
    <div style="flex:1;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;background:#fffbeb">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#d97706;margin-bottom:2px">Total fonds appelés</div>
      <div style="font-size:13px;font-weight:800;color:#b45309">${fmtDec(totauxFond.montant)} MAD</div>
      <div style="font-size:10px;color:#059669;margin-top:1px">Encaissé : ${fmtDec(totauxFond.recu)} MAD</div>
    </div>` : ""}
    <div style="flex:1;border:1px solid #d1fae5;border-radius:8px;padding:8px 12px;background:#f0fdf4">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#059669;margin-bottom:2px">Total encaissé</div>
      <div style="font-size:13px;font-weight:800;color:#059669">${fmtDec(totalGlobal.recu)} MAD</div>
    </div>
    <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:2px">Reste à recouvrer</div>
      <div style="font-size:13px;font-weight:800;color:${totalGlobal.montant - totalGlobal.recu > 0 ? "#ef4444" : "#059669"}">${fmtDec(totalGlobal.montant - totalGlobal.recu)} MAD</div>
      <div style="margin-top:4px;background:#e2e8f0;border-radius:99px;height:4px">
        <div style="background:${pctGlobal >= 80 ? "#10b981" : pctGlobal >= 50 ? "#f59e0b" : "#ef4444"};height:4px;border-radius:99px;width:${pctGlobal}%"></div>
      </div>
      <div style="font-size:9px;color:#64748b;margin-top:2px">Taux : ${pctGlobal}%</div>
    </div>
  </div>

  <!-- Légende -->
  <div style="display:flex;gap:12px;font-size:9px;color:#64748b;margin-bottom:10px;align-items:center">
    <span style="font-weight:600">Légende :</span>
    <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:4px"></span>Payé</span>
    <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:4px"></span>Partiel</span>
    <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:4px"></span>Non payé</span>
    <span style="color:#94a3b8;margin-left:8px">Cellules : <strong>reçu</strong> / dû (MAD)</span>
  </div>

  ${buildTable(colonnesCharge, totauxCharge, "#4f46e5", "Appels de charge")}
  ${buildTable(colonnesFond,   totauxFond,   "#d97706", "Appels de fond")}

  <!-- Footer -->
  <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between">
    <span>JORAT · ${residence?.nom_residence ?? ""} · Exercice ${exercice}</span>
    <span>${new Date().toLocaleDateString("fr-FR")}</span>
  </div>

</body>
</html>`;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SynthesePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const residenceId =
    new URLSearchParams(location.search).get("residence") ||
    localStorage.getItem("active_residence");

  const [appels,      setAppels]      = useState([]);
  const [details,     setDetails]     = useState([]);
  const [lots,        setLots]        = useState([]);
  const [groupes,     setGroupes]     = useState([]);
  const [residence,   setResidence]   = useState(null);
  const [typeAppel,   setTypeAppel]   = useState("CHARGE");
  const [loading,     setLoading]     = useState(true);
  const [pdfLoading,  setPdfLoading]  = useState(false);

  // ── Chargement unique : appels + lots + groupes + résidence + détails ──
  useEffect(() => {
    if (!residenceId) { setLoading(false); return; }
    Promise.all([
      fetchJson(`${API}/appels-charge/?residence=${residenceId}`),
      fetchJson(`${API}/lots/?residence=${residenceId}`),
      fetchJson(`${API}/groupes/?residence=${residenceId}`),
      fetch(`${API}/residences/${residenceId}/`).then(r => r.ok ? r.json() : null),
      fetchJson(`${API}/details-appel/?residence=${residenceId}`),
    ]).then(([a, l, g, res, d]) => {
      setAppels(a);
      setLots(l);
      setGroupes(g);
      setResidence(res);
      setDetails(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Colonnes du type sélectionné, toutes années, triées exercice desc puis période ──
  const colonnes = useMemo(() =>
    appels
      .filter(a => a.type_charge === typeAppel)
      .sort((a, b) => {
        if (b.exercice !== a.exercice) return parseInt(b.exercice) - parseInt(a.exercice);
        return (ORDRE_PERIODE[a.periode] ?? 99) - (ORDRE_PERIODE[b.periode] ?? 99);
      }),
  [appels, typeAppel]);

  const detailMap = useMemo(() => {
    const m = {};
    details.forEach(d => {
      const lotId   = typeof d.lot   === "object" ? d.lot.id   : d.lot;
      const appelId = typeof d.appel === "object" ? d.appel.id : d.appel;
      if (!m[lotId]) m[lotId] = {};
      m[lotId][appelId] = d;
    });
    return m;
  }, [details]);

  const phoneMap = useMemo(() => {
    const m = {};
    details.forEach(d => {
      const lotId = typeof d.lot === "object" ? d.lot.id : d.lot;
      if (d.contact_telephone && !m[lotId]) m[lotId] = d.contact_telephone;
    });
    return m;
  }, [details]);

  const emailMap = useMemo(() => {
    const m = {};
    lots.forEach(lot => {
      if (lot.representant?.email) m[lot.id] = lot.representant.email;
    });
    return m;
  }, [lots]);

  const groupeMap = useMemo(() => {
    const m = {};
    groupes.forEach(g => { m[g.id] = g.nom_groupe; });
    return m;
  }, [groupes]);

  const lotsTriés = useMemo(() =>
    [...lots].sort((a, b) => {
      const gA = groupeMap[a.groupe] ?? "zzz";
      const gB = groupeMap[b.groupe] ?? "zzz";
      if (gA !== gB) return gA.localeCompare(gB);
      return a.numero_lot.localeCompare(b.numero_lot, undefined, { numeric: true });
    }),
  [lots, groupeMap]);

  const lotsParGroupe = useMemo(() => {
    const ordre = [], map = {};
    lotsTriés.forEach(lot => {
      const g = lot.groupe ? (groupeMap[lot.groupe] ?? "Sans groupe") : "Sans groupe";
      if (!map[g]) { map[g] = []; ordre.push(g); }
      map[g].push(lot);
    });
    return ordre.map(g => ({ groupe: g, lots: map[g] }));
  }, [lotsTriés, groupeMap]);

  const totauxColonne = useMemo(() => {
    const t = {};
    colonnes.forEach(col => {
      let sumM = 0, sumR = 0;
      lots.forEach(lot => {
        const d = detailMap[lot.id]?.[col.id];
        if (d) { sumM += parseFloat(d.montant ?? 0); sumR += parseFloat(d.montant_recu ?? 0); }
      });
      t[col.id] = { montant: sumM, recu: sumR };
    });
    return t;
  }, [colonnes, lots, detailMap]);

  const totalGlobal = useMemo(() => {
    let montant = 0, recu = 0;
    Object.values(totauxColonne).forEach(t => { montant += t.montant; recu += t.recu; });
    return { montant, recu };
  }, [totauxColonne]);

  // ── Pour le PDF : colonnes selon type actif ───────────────────
  const colonnesFond = typeAppel === "FOND" ? colonnes : [];

  // ── Générer PDF ──────────────────────────────────────────────
  const handleGeneratePdf = () => {
    setPdfLoading(true);
    try {
      const html = buildSynthesePdf({
        residence,
        exercice: "Toutes périodes",
        colonnesCharge: typeAppel === "CHARGE" ? colonnes : [],
        colonnesFond,
        lotsParGroupe,
        detailMap,
        phoneMap,
      });
      const blob = new Blob([html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, "_blank");
      win.onload = () => { win.focus(); win.print(); URL.revokeObjectURL(url); };
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 tracking-widest uppercase">Chargement…</p>
      </div>
    </div>
  );

  if (!residenceId) return (
    <div className="text-center text-slate-400 py-16">Sélectionnez une résidence.</div>
  );

  return (
    <div className="space-y-2">
      <RecouvrementNav residenceId={residenceId} />

      {/* En-tête + PDF */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-bold text-slate-800">Synthèse des charges</h1>
          <p className="text-xs text-slate-400">
            {typeAppel === "FOND" ? "Appels de fond" : "Appels de charge"} — toutes périodes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle CHARGE / FOND */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs">
            {[
              { value: "CHARGE", label: "Appel de charge" },
              { value: "FOND",   label: "Appel de fond"   },
            ].map(({ value, label }) => (
              <button key={value} onClick={() => setTypeAppel(value)}
                className={`px-3 py-1.5 font-semibold transition ${
                  typeAppel === value ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGeneratePdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 whitespace-nowrap"
          >
            {pdfLoading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Génération…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Cartes résumé */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">Appelé</p>
          <p className="text-sm font-bold text-slate-800">{fmt(totalGlobal.montant)} <span className="text-xs font-normal text-slate-400">MAD</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">Encaissé</p>
          <p className="text-sm font-bold text-emerald-600">{fmt(totalGlobal.recu)} <span className="text-xs font-normal text-slate-400">MAD</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">Reste</p>
          <p className="text-sm font-bold text-red-500">{fmt(totalGlobal.montant - totalGlobal.recu)} <span className="text-xs font-normal text-slate-400">MAD</span></p>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        {[["bg-emerald-400","Payé"],["bg-amber-400","Partiel"],["bg-red-400","Non payé"],["bg-slate-200","Non appelé"]].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${c} inline-block`} /> {l}
          </span>
        ))}
        <span className="text-slate-400">reçu / dû</span>
      </div>

      {/* Tableau */}
      {false ? (
        <div className="bg-white rounded-2xl p-12 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 uppercase tracking-widest">Chargement détails…</span>
        </div>
      ) : colonnes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400">
          Aucun appel de charge disponible.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-20 bg-slate-800 text-left px-3 py-2 font-semibold whitespace-nowrap min-w-[100px]">Lot</th>
                  <th className="sticky z-20 bg-slate-800 text-left px-3 py-2 font-semibold whitespace-nowrap min-w-[160px]" style={{left:"100px"}}>Résident</th>
                  {colonnes.map(col => (
                    <th key={col.id} className="px-2 py-2 text-center font-semibold whitespace-nowrap min-w-[90px]">
                      <div>{col.code_fond ?? col.periode}</div>
                      <div className="text-[10px] font-normal text-slate-400">{col.exercice}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap min-w-[100px] bg-slate-700">Total</th>
                </tr>

                {/* Ligne totaux */}
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <td className="sticky left-0 z-20 bg-slate-100 px-3 py-1.5 font-bold text-slate-600 text-[11px] uppercase tracking-widest" colSpan={2}>
                    Totaux
                  </td>
                  {colonnes.map(col => {
                    const t = totauxColonne[col.id] ?? { montant: 0, recu: 0 };
                    const s = cellStyle(t.recu, t.montant);
                    return (
                      <td key={col.id} className="px-2 py-1.5 text-center">
                        <div className={`inline-flex flex-col items-center rounded-lg px-2 py-0.5 ${s.bg}`}>
                          <span className={`font-mono font-bold ${s.text}`}>{fmt(t.recu)}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{fmt(t.montant)}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center bg-slate-200">
                    <div className="inline-flex flex-col items-center rounded-lg px-2 py-0.5">
                      <span className="font-mono font-bold text-emerald-700">{fmt(totalGlobal.recu)}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{fmt(totalGlobal.montant)}</span>
                    </div>
                  </td>
                </tr>
              </thead>

              <tbody>
                {lotsParGroupe.map(({ groupe, lots: lotsGrp }, gi) => (
                  <>
                    <tr key={`g-${gi}`} className="bg-indigo-50 border-t border-indigo-100">
                      <td colSpan={colonnes.length + 3}
                        className="px-3 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        {groupe}
                      </td>
                    </tr>

                    {lotsGrp.map((lot, li) => {
                      let lotM = 0, lotR = 0;
                      colonnes.forEach(col => {
                        const d = detailMap[lot.id]?.[col.id];
                        if (d) {
                          lotM += parseFloat(d.montant ?? 0);
                          lotR += parseFloat(d.montant_recu ?? 0);
                        }
                      });
                      const tc = cellStyle(lotR, lotM);
                      const isEven = li % 2 === 0;

                      return (
                        <tr key={lot.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isEven ? "bg-white" : "bg-slate-50/40"}`}>

                          <td className={`sticky left-0 z-10 px-3 py-1.5 font-bold whitespace-nowrap ${isEven ? "bg-white" : "bg-slate-50"}`}>
                            <button
                              onClick={() => navigate(`/fiche-lot?lot=${lot.id}${residenceId ? `&residence=${residenceId}` : ""}`)}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline transition"
                            >
                              {lot.numero_lot}
                            </button>
                          </td>

                          <td className={`sticky z-10 px-3 py-1.5 whitespace-nowrap ${isEven ? "bg-white" : "bg-slate-50"}`}
                            style={{left:"100px"}}>
                            {lot.representant ? (
                              <div>
                                <p className="font-medium text-slate-700 leading-tight">
                                  {lot.representant.nom} {lot.representant.prenom ?? ""}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  {phoneMap[lot.id] && (
                                    <span className="text-xs text-slate-400">📞 {phoneMap[lot.id]}</span>
                                  )}
                                  {emailMap[lot.id] && (
                                    <button
                                      title={`Envoyer email à ${emailMap[lot.id]}`}
                                      className="text-slate-400 hover:text-blue-600 transition"
                                      onClick={async e => {
                                        e.stopPropagation();
                                        const email = emailMap[lot.id];
                                        const subject = `Rappel de paiement — Lot ${lot.numero_lot}`;
                                        const body = `Cher(e) propriétaire du Lot ${lot.numero_lot},\n\nMerci de régulariser votre situation.\n\nCordialement,\nLe Syndic`;
                                        try {
                                          const r = await postJson("/api/send-email/", { to: email, subject, body });
                                          const data = await r.json();
                                          if (r.ok) {
                                            toast.success(`Email envoyé à ${email}`);
                                          } else {
                                            toast.error(data.error || "Échec envoi email");
                                          }
                                        } catch {
                                          toast.error("Erreur réseau — email non envoyé");
                                        }
                                      }}
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>

                          {colonnes.map(col => {
                            const d = detailMap[lot.id]?.[col.id];
                            if (!d) return (
                              <td key={col.id} className="px-2 py-1.5 text-center text-slate-200">—</td>
                            );
                            const recu = parseFloat(d.montant_recu ?? 0);
                            const mont = parseFloat(d.montant ?? 0);
                            const s = cellStyle(recu, mont);
                            return (
                              <td key={col.id} className="px-2 py-1 text-center">
                                <div className={`inline-flex flex-col items-center rounded-md px-2 py-0.5 ${s.bg}`}>
                                  <span className={`font-mono font-semibold ${s.text}`}>{fmt(recu)}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">{fmt(mont)}</span>
                                </div>
                              </td>
                            );
                          })}

                          <td className="px-2 py-1 text-center">
                            {lotM > 0 ? (
                              <div className={`inline-flex flex-col items-center rounded-md px-2 py-0.5 ${tc.bg}`}>
                                <span className={`font-mono font-bold ${tc.text}`}>{fmt(lotR)}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{fmt(lotM)}</span>
                              </div>
                            ) : <span className="text-slate-200">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}

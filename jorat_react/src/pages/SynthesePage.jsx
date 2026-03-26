import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

  const buildTable = (colonnes, totaux, headerColor, sectionTitle) => {
    if (colonnes.length === 0) return "";

    const colHeaders = colonnes.map(col =>
      `<th style="padding:4px 5px;text-align:center;white-space:nowrap;font-size:8px;border:1px solid #94a3b8;min-width:70px">${col.code_fond ?? col.periode}<br/><span style="font-weight:400;color:#94a3b8">${col.exercice}</span></th>`
    ).join("");

    const totauxRow = colonnes.map(col => {
      const t = totaux.byCol[col.id] ?? { montant: 0, recu: 0 };
      if (!t.montant) return `<td style="padding:3px 4px;text-align:center;color:#94a3b8;font-size:8px;border:1px solid #cbd5e1">—</td>`;
      const r2 = t.recu / t.montant;
      const color = r2 >= 1 ? "#059669" : r2 > 0 ? "#d97706" : "#dc2626";
      return `<td style="padding:3px 4px;text-align:center;font-family:monospace;font-size:8px;border:1px solid #cbd5e1;font-weight:700;color:${color}">${fmt(t.recu)}<br/><span style="color:#6b7280;font-weight:400">${fmt(t.montant)}</span></td>`;
    }).join("");

    const groupRows = lotsParGroupe.map(({ groupe, lots }) => {
      const headerRow = `<tr><td colspan="${colonnes.length + 3}" style="padding:3px 6px;font-size:8px;font-weight:700;color:${headerColor};background:#f8fafc;border:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:0.05em">${groupe}</td></tr>`;
      const lotRows = lots.map((lot, li) => {
        let lotM = 0, lotR = 0;
        colonnes.forEach(col => {
          const d = detailMap[lot.id]?.[col.id];
          if (d) { lotM += parseFloat(d.montant ?? 0); lotR += parseFloat(d.montant_recu ?? 0); }
        });
        const rowBg = li % 2 === 0 ? "#fff" : "#f9fafb";
        const residentNom = lot.representant ? `${lot.representant.nom ?? ""} ${lot.representant.prenom ?? ""}`.trim() : "—";
        const cellsHtml = colonnes.map(col => {
          const d = detailMap[lot.id]?.[col.id];
          if (!d) return `<td style="padding:3px 4px;text-align:center;color:#d1d5db;font-size:8px;border:1px solid #e5e7eb">—</td>`;
          const recu = parseFloat(d.montant_recu ?? 0);
          const mont = parseFloat(d.montant ?? 0);
          const r2 = mont > 0 ? recu / mont : 0;
          const color = r2 >= 1 ? "#059669" : r2 > 0 ? "#d97706" : "#dc2626";
          return `<td style="padding:3px 4px;text-align:center;font-family:monospace;font-size:8px;border:1px solid #e5e7eb;color:${color}">${fmt(recu)}<br/><span style="color:#9ca3af;font-size:7px">${fmt(mont)}</span></td>`;
        }).join("");
        const totColor = lotM > 0 ? (lotR >= lotM ? "#059669" : lotR > 0 ? "#d97706" : "#dc2626") : "#9ca3af";
        const totalCell = `<td style="padding:3px 5px;text-align:center;font-family:monospace;font-size:8px;border:1px solid #e5e7eb;font-weight:700;background:#f8fafc;color:${totColor}">${lotM > 0 ? `${fmt(lotR)}<br/><span style="color:#9ca3af;font-weight:400;font-size:7px">${fmt(lotM)}</span>` : "—"}</td>`;
        return `<tr style="background:${rowBg}">
          <td style="padding:4px 5px;font-weight:700;color:#374151;font-size:9px;border:1px solid #e5e7eb;white-space:nowrap">${lot.numero_lot}</td>
          <td style="padding:4px 5px;font-size:8px;border:1px solid #e5e7eb;white-space:nowrap">${residentNom}</td>
          ${cellsHtml}${totalCell}
        </tr>`;
      }).join("");
      return headerRow + lotRows;
    }).join("");

    const pct = totaux.montant > 0 ? Math.round((totaux.recu / totaux.montant) * 100) : 0;
    return `
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid ${headerColor}">
          <div style="font-size:10px;font-weight:700;color:${headerColor};text-transform:uppercase;letter-spacing:0.06em">${sectionTitle}</div>
          <div style="display:flex;gap:14px;font-size:8px;color:#374151">
            <span>Appelé : <strong>${fmtDec(totaux.montant)} MAD</strong></span>
            <span style="color:#059669">Encaissé : <strong>${fmtDec(totaux.recu)} MAD</strong></span>
            <span style="color:${totaux.montant - totaux.recu > 0 ? "#ef4444" : "#059669"}">Reste : <strong>${fmtDec(totaux.montant - totaux.recu)} MAD</strong></span>
            <span>Taux : <strong style="color:${pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#ef4444"}">${pct}%</strong></span>
          </div>
        </div>
        <table style="font-size:8px;width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#1e293b;color:#fff">
              <th style="padding:4px 5px;text-align:left;white-space:nowrap;font-size:8px;border:1px solid #334155;min-width:50px">Lot</th>
              <th style="padding:4px 5px;text-align:left;white-space:nowrap;font-size:8px;border:1px solid #334155;min-width:110px">Résident</th>
              ${colHeaders}
              <th style="padding:4px 5px;text-align:center;white-space:nowrap;font-size:8px;border:1px solid #334155;background:#0f172a">Total</th>
            </tr>
            <tr style="background:#f1f5f9">
              <td colspan="2" style="padding:3px 5px;font-weight:700;font-size:8px;color:#475569;border:1px solid #cbd5e1">TOTAUX</td>
              ${totauxRow}
              <td style="padding:3px 4px;text-align:center;font-family:monospace;font-size:8px;border:1px solid #cbd5e1;font-weight:700;color:#059669">${fmt(totaux.recu)}<br/><span style="color:#6b7280;font-weight:400">${fmt(totaux.montant)}</span></td>
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
  <title>Synthèse des charges — ${residence?.nom_residence ?? ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b; background: #fff; padding: 12px 16px; }
    @page { size: A4 landscape; margin: 8mm 10mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #cbd5e1">
    <div style="display:flex;align-items:center;gap:10px">
      ${logoUrl ? `<img src="${logoUrl}" style="width:40px;height:40px;object-fit:contain;border-radius:4px" alt="Logo"/>` : ""}
      <div>
        <div style="font-size:13px;font-weight:800;color:#1e293b">${residence?.nom_residence ?? "Résidence"}</div>
        ${residence?.ville_residence ? `<div style="font-size:8px;color:#64748b">${[residence.code_postal_residence, residence.ville_residence].filter(Boolean).join(" ")}</div>` : ""}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;font-weight:700;color:#1e293b">Synthèse des charges et fonds</div>
      <div style="font-size:8px;color:#64748b;margin-top:2px">Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <!-- KPI ligne -->
  <div style="display:flex;gap:6px;margin-bottom:10px;font-size:8px">
    ${colonnesCharge.length > 0 ? `<div style="flex:1;border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px"><div style="color:#64748b;margin-bottom:1px">Charges appelées</div><div style="font-weight:700;font-size:10px">${fmtDec(totauxCharge.montant)} MAD</div><div style="color:#059669">Encaissé : ${fmtDec(totauxCharge.recu)} MAD</div></div>` : ""}
    ${colonnesFond.length > 0 ? `<div style="flex:1;border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px"><div style="color:#64748b;margin-bottom:1px">Fonds appelés</div><div style="font-weight:700;font-size:10px">${fmtDec(totauxFond.montant)} MAD</div><div style="color:#059669">Encaissé : ${fmtDec(totauxFond.recu)} MAD</div></div>` : ""}
    <div style="flex:1;border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px"><div style="color:#64748b;margin-bottom:1px">Total encaissé</div><div style="font-weight:700;font-size:10px;color:#059669">${fmtDec(totalGlobal.recu)} MAD</div></div>
    <div style="flex:1;border:1px solid #e2e8f0;border-radius:3px;padding:5px 8px"><div style="color:#64748b;margin-bottom:1px">Reste à recouvrer</div><div style="font-weight:700;font-size:10px;color:${totalGlobal.montant - totalGlobal.recu > 0 ? "#dc2626" : "#059669"}">${fmtDec(totalGlobal.montant - totalGlobal.recu)} MAD</div><div style="color:#64748b">Taux : <strong style="color:${pctGlobal >= 80 ? "#059669" : pctGlobal >= 50 ? "#d97706" : "#dc2626"}">${pctGlobal}%</strong></div></div>
  </div>

  <!-- Légende -->
  <div style="display:flex;gap:10px;font-size:7px;color:#64748b;margin-bottom:8px">
    <span>Légende :</span>
    <span style="color:#059669">■ Payé</span>
    <span style="color:#d97706">■ Partiel</span>
    <span style="color:#dc2626">■ Non payé</span>
    <span style="color:#94a3b8">Cellules : reçu / dû (MAD)</span>
  </div>

  ${buildTable(colonnesCharge, totauxCharge, "#4f46e5", "Appels de charge")}
  ${buildTable(colonnesFond,   totauxFond,   "#d97706", "Appels de fond")}

  <!-- Footer -->
  <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:7px;color:#94a3b8;display:flex;justify-content:space-between">
    <span>${residence?.nom_residence ?? ""} · Synthèse des charges</span>
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

  // ── Liste plate lots avec statut ──────────────────────────────
  const [filtreSt, setFiltreSt] = useState("TOUS");
  const [notifLoading, setNotifLoading] = useState({});

  const lotsFlat = useMemo(() => {
    const list = [];
    lotsTriés.forEach(lot => {
      let lotM = 0, lotR = 0;
      colonnes.forEach(col => {
        const d = detailMap[lot.id]?.[col.id];
        if (d) { lotM += parseFloat(d.montant ?? 0); lotR += parseFloat(d.montant_recu ?? 0); }
      });
      if (lotM === 0) return;
      const statut = lotR >= lotM ? "SOLDE" : lotR > 0 ? "PARTIEL" : "NON_PAYE";
      const groupe = lot.groupe ? (groupeMap[lot.groupe] ?? "Sans groupe") : "Sans groupe";
      list.push({ lot, groupe, lotM, lotR, statut });
    });
    return list;
  }, [lotsTriés, colonnes, detailMap, groupeMap]);

  const lotsFlatFiltered = useMemo(() =>
    filtreSt === "TOUS" ? lotsFlat : lotsFlat.filter(i => i.statut === filtreSt),
  [lotsFlat, filtreSt]);

  const handleNotif = async (lotId, lotNum) => {
    setNotifLoading(p => ({ ...p, [lotId]: true }));
    try {
      const r = await postJson("/api/notification-send/", {
        lot_id: lotId, type_notification: "SMS", titre: "Rappel de paiement",
      });
      if (r.ok) toast.success(`Notification enregistrée — Lot ${lotNum}`);
      else toast.error("Erreur notification");
    } catch { toast.error("Erreur réseau"); }
    finally { setNotifLoading(p => ({ ...p, [lotId]: false })); }
  };

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
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gestion</p>
            <h1 className="text-white font-bold text-lg leading-tight">Suivi des paiements</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle CHARGE / FOND */}
            <div className="flex rounded-xl overflow-hidden border border-white/30 text-xs">
              {[
                { value: "CHARGE", label: "Charge" },
                { value: "FOND",   label: "Fond"   },
              ].map(({ value, label }) => (
                <button key={value} onClick={() => setTypeAppel(value)}
                  className={`px-3 py-1.5 font-semibold transition ${
                    typeAppel === value ? "bg-white text-blue-700" : "text-white/80 hover:bg-white/10"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleGeneratePdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 active:scale-95 transition-all disabled:opacity-60 whitespace-nowrap border border-white/30"
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
        <p className="text-white/50 text-[10px] mt-1">Situation par lot — charges et fonds</p>
      </div>
      <div className="px-4 -mt-5 pb-6 max-w-5xl mx-auto space-y-4">

      {/* Cartes résumé */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Appelé",   value: fmt(totalGlobal.montant),               cls: "text-slate-800"   },
          { label: "Encaissé", value: fmt(totalGlobal.recu),                  cls: "text-emerald-600" },
          { label: "Reste",    value: fmt(totalGlobal.montant - totalGlobal.recu), cls: "text-red-500" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{k.label}</p>
            <p className={`text-sm font-bold leading-tight ${k.cls}`}>{k.value}</p>
            <p className="text-[10px] text-slate-300">MAD</p>
          </div>
        ))}
      </div>

      {/* Filtres statut + légende */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "TOUS",     label: "Tous",      count: lotsFlat.length,                              cls: "bg-slate-600 text-white",   inactive: "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50" },
            { key: "NON_PAYE", label: "Non payé",  count: lotsFlat.filter(i=>i.statut==="NON_PAYE").length, cls: "bg-red-500 text-white",     inactive: "bg-white border border-slate-200 text-slate-500 hover:bg-red-50"   },
            { key: "PARTIEL",  label: "Partiel",   count: lotsFlat.filter(i=>i.statut==="PARTIEL").length,  cls: "bg-amber-500 text-white",   inactive: "bg-white border border-slate-200 text-slate-500 hover:bg-amber-50" },
            { key: "SOLDE",    label: "Soldé",     count: lotsFlat.filter(i=>i.statut==="SOLDE").length,    cls: "bg-emerald-500 text-white", inactive: "bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50"},
          ].map(f => (
            <button key={f.key} onClick={() => setFiltreSt(f.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${filtreSt === f.key ? f.cls : f.inactive}`}>
              {f.label}
              <span className={`text-[10px] px-1 rounded-full ${filtreSt === f.key ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {[["bg-emerald-400","Soldé"],["bg-amber-400","Partiel"],["bg-red-400","Non payé"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${c}`} />{l}</span>
          ))}
        </div>
      </div>

      {/* Liste plate triée par lot */}
      {colonnes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400">Aucun appel disponible.</div>
      ) : lotsFlatFiltered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm">Aucun lot pour ce filtre.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lotsFlatFiltered.map(({ lot, groupe, lotM, lotR, statut }) => {
            const pct   = lotM > 0 ? Math.min(100, Math.round((lotR / lotM) * 100)) : 0;
            const reste = lotM - lotR;
            const phone = lot.representant?.telephone || null;
            const email = lot.representant?.email || null;
            const waMsg = `Bonjour,\nNous vous rappelons que votre situation de paiement pour le Lot ${lot.numero_lot} nécessite votre attention.\nMontant appelé : ${fmt(lotM)} MAD\nReçu : ${fmt(lotR)} MAD\nReste : ${fmt(lotM - lotR)} MAD\nMerci de régulariser.\n${residence?.nom_residence ?? "Le Syndic"}`;
            const waUrl = phone ? `https://wa.me/${phone.replace(/^0/, "212").replace(/\s/g, "")}?text=${encodeURIComponent(waMsg)}` : null;
            const borderCls = statut === "SOLDE" ? "border-emerald-200" : statut === "PARTIEL" ? "border-amber-200" : "border-red-200";
            const barCls    = statut === "SOLDE" ? "bg-emerald-500"     : statut === "PARTIEL" ? "bg-amber-400"     : "bg-red-400";
            const statBg    = statut === "SOLDE" ? "bg-emerald-100 text-emerald-700" : statut === "PARTIEL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
            return (
              <div key={lot.id} className={`bg-white rounded-xl border ${borderCls} shadow-sm p-3 space-y-2.5 hover:shadow-md transition`}>

                {/* Ligne 1 : lot + groupe + badge + boutons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate(`/fiche-lot?lot=${lot.id}${residenceId ? `&residence=${residenceId}` : ""}`)}
                    className="font-bold text-indigo-600 hover:underline text-sm shrink-0">
                    {lot.numero_lot}
                  </button>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[70px] shrink-0">{groupe}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statBg}`}>
                    {statut === "SOLDE" ? "Soldé" : statut === "PARTIEL" ? "Partiel" : "Non payé"}
                  </span>
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {/* Notification SMS */}
                    <button
                      onClick={() => handleNotif(lot.id, lot.numero_lot)}
                      disabled={notifLoading[lot.id]}
                      title="Notification SMS"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition disabled:opacity-50">
                      {notifLoading[lot.id]
                        ? <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>}
                    </button>
                    {/* WhatsApp */}
                    <button
                      onClick={() => { if (waUrl) window.open(waUrl, "whatsapp_jorat", "width=800,height=600"); }}
                      title={phone ? `WhatsApp ${phone}` : "Pas de téléphone"}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${waUrl ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-300 cursor-not-allowed"}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                    </button>
                    {/* Email */}
                    <button
                      onClick={async () => {
                        if (!email) { toast.error("Pas d'email pour ce lot"); return; }
                        try {
                          const r = await postJson("/api/send-email/", {
                            to: email,
                            from: residence?.email || undefined,
                            subject: `Rappel de paiement — Lot ${lot.numero_lot}`,
                            body: `Cher(e) propriétaire du Lot ${lot.numero_lot},\n\nNous vous rappelons que votre situation de paiement nécessite votre attention.\n\nMontant appelé : ${fmt(lotM)} MAD\nMontant reçu : ${fmt(lotR)} MAD\nReste à payer : ${fmt(reste)} MAD\n\nMerci de régulariser votre situation dans les meilleurs délais.\n\nCordialement,\nLe Syndic — ${residence?.nom_residence ?? ""}`,
                          });
                          if (r.ok) toast.success(`Email envoyé à ${email}`);
                          else { const d = await r.json(); toast.error(d.error || "Échec envoi email"); }
                        } catch { toast.error("Erreur réseau — email non envoyé"); }
                      }}
                      title={email ? `Email ${email}` : "Pas d'email"}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${email ? "bg-sky-50 hover:bg-sky-100 text-sky-600" : "bg-slate-50 text-slate-300 cursor-not-allowed"}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Ligne 2 : propriétaire + contact */}
                {lot.representant && (
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {lot.representant.nom} {lot.representant.prenom ?? ""}
                    {phone && <span className="text-slate-400 font-normal ml-1.5">{phone}</span>}
                    {email && <span className="text-slate-400 font-normal ml-1.5">{email}</span>}
                  </p>
                )}

                {/* Ligne 3 : montants */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">Appelé</p>
                    <p className="text-xs font-bold font-mono text-slate-700 mt-0.5">{fmt(lotM)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[9px] text-emerald-500 uppercase tracking-wider">Reçu</p>
                    <p className="text-xs font-bold font-mono text-emerald-700 mt-0.5">{fmt(lotR)}</p>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 text-center ${reste > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                    <p className={`text-[9px] uppercase tracking-wider ${reste > 0 ? "text-red-400" : "text-emerald-500"}`}>Reste</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${reste > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(reste)}</p>
                  </div>
                </div>

                {/* Barre progression */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 w-8 text-right">{pct}%</span>
                </div>

                {/* Détail périodes */}
                <div className="space-y-1 border-t border-slate-100 pt-2">
                  {colonnes.map(col => {
                    const d = detailMap[lot.id]?.[col.id];
                    if (!d) return null;
                    const recu = parseFloat(d.montant_recu ?? 0);
                    const mont = parseFloat(d.montant ?? 0);
                    if (mont === 0) return null;
                    const s = cellStyle(recu, mont);
                    return (
                      <div key={col.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-500 truncate">{col.code_fond ?? col.periode} {col.exercice}</span>
                        <div className={`flex items-center gap-1 font-mono rounded-md px-1.5 py-0.5 ${s.bg} shrink-0`}>
                          <span className={`font-semibold ${s.text}`}>{fmt(recu)}</span>
                          <span className="text-slate-400 text-[10px]">/{fmt(mont)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>
    </div>
  );
}

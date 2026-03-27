import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

const API = "/api";

const fetchJson = async (url) => {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) return null;
  const d = await r.json();
  return Array.isArray(d) ? d : (d.results ?? d);
};

const fmt = (v) =>
  parseFloat(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

const fmtDate = (s) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR");
};

// ── Status helpers ────────────────────────────────────────────────────────────
const getStatut = (du, recu) => {
  const reste = du - recu;
  if (recu > 0 && reste < 0) return "TROP_PAYE";
  if (reste <= 0 && recu > 0) return "A_JOUR";
  if (recu === 0 && du > 0)   return "IMPAYE";
  return "PARTIEL";
};

const STATUT_STYLES = {
  A_JOUR:    { label: "À jour",     cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  PARTIEL:   { label: "Partiel",    cls: "bg-amber-100  text-amber-700  border border-amber-200"  },
  IMPAYE:    { label: "Impayé",     cls: "bg-red-100    text-red-700    border border-red-200"    },
  TROP_PAYE: { label: "Trop payé",  cls: "bg-blue-100   text-blue-700   border border-blue-200"  },
};

const DETAIL_STATUT_CLS = {
  NON_PAYE: "bg-red-100 text-red-700",
  PARTIEL:  "bg-amber-100 text-amber-700",
  PAYE:     "bg-emerald-100 text-emerald-700",
};
const DETAIL_STATUT_LABEL = { NON_PAYE: "Non payé", PARTIEL: "Partiel", PAYE: "Payé" };

// ── Phone helpers ─────────────────────────────────────────────────────────────
const toWa  = (t, msg) => {
  const num = (t || "").replace(/^0/, "212").replace(/\s/g, "");
  return msg ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/${num}`;
};
const toSms = (t) => `sms:${t}`;

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ statut }) {
  const s = STATUT_STYLES[statut] ?? STATUT_STYLES.IMPAYE;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── PDF generation ────────────────────────────────────────────────────────────
function buildPdfHtml({ lot, residence, detailsCharge, detailsFond, paiements }) {
  const residentName = lot?.representant
    ? `${lot.representant.nom ?? ""} ${lot.representant.prenom ?? ""}`.trim()
    : null;
  const telephone = lot?.representant?.telephone || null;

  const logoUrl = residence?.logo
    ? (residence.logo.startsWith("http") ? residence.logo : `${window.location.origin}${residence.logo}`)
    : null;

  const fmtN = (v) => parseFloat(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
  const fmtD = (s) => s ? new Date(s).toLocaleDateString("fr-FR") : "—";

  const groupByExercice = (details) => {
    const map = {};
    details.forEach(d => {
      const exo = d.appel_exercice ?? "?";
      if (!map[exo]) map[exo] = [];
      map[exo].push(d);
    });
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([exo, items]) => ({ exo, items }));
  };

  const totalPaiements = paiements.reduce((s, p) => s + parseFloat(p.montant ?? 0), 0);

  const sectionHtml = (title, details, color) => {
    const groups = groupByExercice(details);
    const totalM = details.reduce((s, d) => s + parseFloat(d.montant ?? 0), 0);
    const totalR = details.reduce((s, d) => s + parseFloat(d.montant_recu ?? 0), 0);

    if (details.length === 0) return `
      <div class="section">
        <h2 class="section-title" style="border-left:4px solid ${color}">${title}</h2>
        <p class="empty">Aucun appel enregistré.</p>
      </div>`;

    const rows = groups.map(({ exo, items }) => {
      const exoM = items.reduce((s, d) => s + parseFloat(d.montant ?? 0), 0);
      const exoR = items.reduce((s, d) => s + parseFloat(d.montant_recu ?? 0), 0);
      const pct  = exoM > 0 ? Math.round((exoR / exoM) * 100) : 0;

      const detailRows = items.map(d => {
        const m = parseFloat(d.montant ?? 0);
        const r = parseFloat(d.montant_recu ?? 0);
        const s = m - r;
        const statut = d.statut ?? "NON_PAYE";
        const statutLabel = { NON_PAYE: "Non payé", PARTIEL: "Partiel", PAYE: "Payé" }[statut] ?? statut;
        const statutColor = { NON_PAYE: "#ef4444", PARTIEL: "#f59e0b", PAYE: "#10b981" }[statut] ?? "#94a3b8";
        return `
          <tr>
            <td style="padding:4px 8px">${d.appel_code ?? d.appel_periode ?? "—"}</td>
            <td style="padding:4px 8px;text-align:right;font-family:monospace">${fmtN(m)}</td>
            <td style="padding:4px 8px;text-align:right;font-family:monospace;color:#059669">${fmtN(r)}</td>
            <td style="padding:4px 8px;text-align:right;font-family:monospace;color:${s > 0 ? "#ef4444" : "#059669"};font-weight:600">${fmtN(s)}</td>
            <td style="padding:4px 8px;text-align:center">
              <span style="background:${statutColor}1a;color:${statutColor};padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600">${statutLabel}</span>
            </td>
          </tr>`;
      }).join("");

      return `
        <div style="margin-bottom:12px">
          <div style="background:#1e293b;color:#fff;padding:6px 10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;border-radius:4px 4px 0 0">
            <span style="font-weight:700">Exercice ${exo}</span>
            <span>
              Appelé&nbsp;<strong>${fmtN(exoM)}</strong>&nbsp;·&nbsp;
              Reçu&nbsp;<strong style="color:#6ee7b7">${fmtN(exoR)}</strong>&nbsp;·&nbsp;
              Solde&nbsp;<strong style="color:${exoM - exoR > 0 ? "#fca5a5" : "#6ee7b7"}">${fmtN(exoM - exoR)}</strong>&nbsp;
              (${pct}%)
            </span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;border-top:none">
            <thead>
              <tr style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase">
                <th style="padding:5px 8px;text-align:left">Période / Référence</th>
                <th style="padding:5px 8px;text-align:right">Appelé (MAD)</th>
                <th style="padding:5px 8px;text-align:right">Reçu (MAD)</th>
                <th style="padding:5px 8px;text-align:right">Solde (MAD)</th>
                <th style="padding:5px 8px;text-align:center">Statut</th>
              </tr>
            </thead>
            <tbody>${detailRows}</tbody>
          </table>
        </div>`;
    }).join("");

    return `
      <div class="section">
        <h2 class="section-title" style="border-left:4px solid ${color}">${title}</h2>
        ${rows}
        <div style="display:flex;gap:16px;margin-top:8px;font-size:11px">
          <div class="kpi" style="border-color:${color}">
            <span class="kpi-label">Total appelé</span>
            <span class="kpi-value">${fmtN(totalM)} MAD</span>
          </div>
          <div class="kpi" style="border-color:#10b981">
            <span class="kpi-label">Total encaissé</span>
            <span class="kpi-value" style="color:#059669">${fmtN(totalR)} MAD</span>
          </div>
          <div class="kpi" style="border-color:${totalM - totalR > 0 ? "#ef4444" : "#10b981"}">
            <span class="kpi-label">Reste dû</span>
            <span class="kpi-value" style="color:${totalM - totalR > 0 ? "#ef4444" : "#059669"}">${fmtN(totalM - totalR)} MAD</span>
          </div>
        </div>
      </div>`;
  };

  const paiementsHtml = paiements.length === 0
    ? `<div class="section"><h2 class="section-title" style="border-left:4px solid #6366f1">Historique des paiements</h2><p class="empty">Aucun paiement enregistré.</p></div>`
    : `
    <div class="section">
      <h2 class="section-title" style="border-left:4px solid #6366f1">Historique des paiements</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0">
        <thead>
          <tr style="background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase">
            <th style="padding:5px 8px;text-align:left">Date</th>
            <th style="padding:5px 8px;text-align:left">Référence</th>
            <th style="padding:5px 8px;text-align:left">Mode</th>
            <th style="padding:5px 8px;text-align:right">Montant (MAD)</th>
          </tr>
        </thead>
        <tbody>
          ${[...paiements].sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement)).map((p, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
            <td style="padding:4px 8px">${fmtD(p.date_paiement)}</td>
            <td style="padding:4px 8px;font-family:monospace;color:#64748b">${p.reference || "—"}</td>
            <td style="padding:4px 8px;color:#64748b">${p.mode_paiement || "—"}</td>
            <td style="padding:4px 8px;text-align:right;font-family:monospace;font-weight:700;color:#4f46e5">${fmtN(p.montant)}</td>
          </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr style="background:#eef2ff;border-top:2px solid #c7d2fe">
            <td colspan="3" style="padding:6px 8px;font-weight:700;color:#4338ca;font-size:11px">Total paiements</td>
            <td style="padding:6px 8px;text-align:right;font-family:monospace;font-weight:700;color:#4338ca">${fmtN(totalPaiements)} MAD</td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Fiche lot ${lot?.numero_lot ?? ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; padding: 20px 30px; }
    @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
    @media print { body { padding: 0; } }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
    .header-logo { width: 72px; height: 72px; object-fit: contain; border-radius: 8px; }
    .header-logo-placeholder { width: 72px; height: 72px; background: #e0e7ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #6366f1; }
    .header-res { flex: 1; padding: 0 16px; }
    .header-res h1 { font-size: 16px; font-weight: 800; color: #1e293b; }
    .header-res p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .header-lot { text-align: right; min-width: 180px; }
    .header-lot .lot-num { font-size: 28px; font-weight: 900; color: #4f46e5; }
    .header-lot .lot-type { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .header-lot .lot-name { font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px; }
    .header-lot .lot-tel { font-size: 11px; color: #64748b; }
    .print-date { font-size: 10px; color: #94a3b8; margin-bottom: 16px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #475569; padding-left: 8px; margin-bottom: 10px; }
    .empty { color: #94a3b8; font-size: 11px; font-style: italic; padding: 8px 0; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; flex: 1; }
    .kpi-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 2px; }
    .kpi-value { display: block; font-size: 14px; font-weight: 700; color: #1e293b; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoUrl
        ? `<img class="header-logo" src="${logoUrl}" alt="Logo" />`
        : `<div class="header-logo-placeholder">${(residence?.nom_residence ?? "R")[0].toUpperCase()}</div>`}
    </div>
    <div class="header-res">
      <h1>${residence?.nom_residence ?? "Résidence"}</h1>
      ${residence?.adresse_residence ? `<p>${residence.adresse_residence}</p>` : ""}
      ${(residence?.ville_residence || residence?.code_postal_residence)
          ? `<p>${[residence.code_postal_residence, residence.ville_residence].filter(Boolean).join(" ")}</p>`
          : ""}
    </div>
    <div class="header-lot">
      <div class="lot-num">Lot ${lot?.numero_lot ?? "—"}</div>
      ${lot?.type_lot ? `<div class="lot-type">${lot.type_lot}</div>` : ""}
      ${residentName ? `<div class="lot-name">${residentName}</div>` : ""}
      ${telephone ? `<div class="lot-tel">📞 ${telephone}</div>` : ""}
    </div>
  </div>
  <div class="print-date">Document généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  ${sectionHtml("Appels de charge", detailsCharge, "#6366f1")}
  ${sectionHtml("Appels de fond", detailsFond, "#f59e0b")}
  ${paiementsHtml}
  <div class="footer">Fiche générée par JORAT · ${residence?.nom_residence ?? ""} · ${new Date().toLocaleDateString("fr-FR")}</div>
</body>
</html>`;
}

// ── Charges section ───────────────────────────────────────────────────────────
function ChargesSection({ details, typeLabel, accent = "indigo" }) {
  const sortedDetails = useMemo(() =>
    [...details].sort((a, b) => parseInt(b.appel_exercice ?? 0) - parseInt(a.appel_exercice ?? 0)),
  [details]);

  if (details.length === 0) return (
    <p className="text-xs text-slate-400 text-center py-4">Aucun appel de {typeLabel} enregistré.</p>
  );

  const trackCls = accent === "amber" ? "bg-amber-100" : "bg-indigo-100";
  const isFond = accent === "amber";

  return (
    <div className="space-y-1.5">
      {sortedDetails.map(d => {
        const m      = parseFloat(d.montant ?? 0);
        const r      = parseFloat(d.montant_recu ?? 0);
        const s      = m - r;
        const p      = m > 0 ? Math.min(100, Math.round((r / m) * 100)) : 0;
        const statut = d.statut ?? "NON_PAYE";
        return (
          <div key={d.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 hover:shadow-sm transition">
            <div className="w-28 shrink-0">
              <span className="text-xs font-semibold text-slate-700 block">{d.appel_exercice ?? "—"}</span>
              {isFond && (d.appel_libelle || d.appel_code) && (
                <span className="text-[10px] text-slate-400 block leading-tight">{d.appel_libelle || d.appel_code}</span>
              )}
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${trackCls}`}>
                <div className={`h-full rounded-full ${p >= 100 ? "bg-emerald-500" : p > 0 ? "bg-amber-400" : "bg-red-300"}`}
                  style={{ width: `${p}%` }} />
              </div>
              <span className="text-[11px] text-slate-400 w-8 shrink-0 text-right">{p}%</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 w-20 text-right shrink-0">{fmt(m)}</span>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 w-20 text-right shrink-0">{fmt(r)}</span>
            <span className={`text-[11px] font-mono font-bold w-20 text-right shrink-0 ${s > 0 ? "text-red-500" : "text-emerald-600"}`}>{fmt(s)}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${DETAIL_STATUT_CLS[statut] ?? ""}`}>
              {DETAIL_STATUT_LABEL[statut] ?? statut}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Grand Livre section ───────────────────────────────────────────────────────
function GrandLivreSection({ detailsCharge, detailsFond, paiements }) {
  const lines = useMemo(() => {
    const rows = [];

    // Debit lines from charge details
    detailsCharge.forEach(d => {
      rows.push({
        date: d.appel_date ?? d.created_at ?? null,
        operation: `Appel charge — ${d.appel_code ?? d.appel_periode ?? "—"}`,
        debit: parseFloat(d.montant ?? 0),
        credit: 0,
        type: "charge",
      });
    });

    // Debit lines from fond details
    detailsFond.forEach(d => {
      rows.push({
        date: d.appel_date ?? d.created_at ?? null,
        operation: `Appel fond — ${d.appel_code ?? d.appel_periode ?? "—"}`,
        debit: parseFloat(d.montant ?? 0),
        credit: 0,
        type: "fond",
      });
    });

    // Credit lines from paiements
    paiements.forEach(p => {
      rows.push({
        date: p.date_paiement,
        operation: `Paiement${p.reference ? ` — ${p.reference}` : ""}${p.mode_paiement ? ` (${p.mode_paiement})` : ""}`,
        debit: 0,
        credit: parseFloat(p.montant ?? 0),
        type: "paiement",
      });
    });

    // Sort by date ascending (nulls last)
    rows.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    // Compute running balance (cumulative debit - cumulative credit)
    let solde = 0;
    return rows.map((r, i) => {
      solde += r.debit - r.credit;
      return { ...r, solde, index: i };
    });
  }, [detailsCharge, detailsFond, paiements]);

  const totDebit  = lines.reduce((s, l) => s + l.debit, 0);
  const totCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (lines.length === 0) return (
    <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm">
      Aucune opération enregistrée.
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">Date</th>
            <th className="px-4 py-3 text-left font-semibold">Opération</th>
            <th className="px-4 py-3 text-right font-semibold">Débit (MAD)</th>
            <th className="px-4 py-3 text-right font-semibold">Crédit (MAD)</th>
            <th className="px-4 py-3 text-right font-semibold">Solde (MAD)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.index} className={`border-b border-slate-50 hover:bg-slate-50/60 ${
              l.type === "paiement" ? "bg-emerald-50/30" : ""
            }`}>
              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(l.date)}</td>
              <td className="px-4 py-2.5 text-slate-700 font-medium">{l.operation}</td>
              <td className="px-4 py-2.5 text-right font-mono text-red-600">
                {l.debit > 0 ? fmt(l.debit) : <span className="text-slate-200">—</span>}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-semibold">
                {l.credit > 0 ? fmt(l.credit) : <span className="text-slate-200">—</span>}
              </td>
              <td className={`px-4 py-2.5 text-right font-mono font-bold ${l.solde > 0 ? "text-red-600" : l.solde < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                {fmt(Math.abs(l.solde))}
                {l.solde > 0 && <span className="ml-1 text-[10px] text-red-400 font-normal">D</span>}
                {l.solde < 0 && <span className="ml-1 text-[10px] text-emerald-400 font-normal">C</span>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
            <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Totaux</td>
            <td className="px-4 py-3 text-right font-mono text-red-600">{fmt(totDebit)}</td>
            <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(totCredit)}</td>
            <td className={`px-4 py-3 text-right font-mono font-bold ${totDebit - totCredit > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmt(Math.abs(totDebit - totCredit))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── NotificationsSection ──────────────────────────────────────────────────────
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

function NotificationsSection({ notifications, lot, summary, telephone, onSend }) {
  const [form, setForm]       = useState({ type_notification: "SMS", titre: "Rappel de paiement", message: "" });
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const toast = useToast();

  const handleSend = async () => {
    setSending(true);
    try {
      const body = {
        lot_id:            lot.id,
        type_notification: form.type_notification,
        titre:             form.titre,
      };
      if (form.message.trim()) body.message = form.message.trim();
      const r = await fetch("/api/notification-send/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        toast.error("Erreur lors de l'enregistrement de la notification.");
        return;
      }
      const data = await r.json();
      const montant = data.montant_du
        ? ` — Solde : ${parseFloat(data.montant_du).toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD`
        : "";
      toast.success(`Notification ${form.type_notification} enregistrée${montant}`);
      setSent(true);
      setForm(f => ({ ...f, message: "" }));
      onSend && onSend();
      setTimeout(() => setSent(false), 4000);
      if (form.type_notification === "SMS" && telephone) {
        window.open(`sms:${telephone}`);
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Send form */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nouvelle notification</p>
        <div className="flex gap-2 flex-wrap">
          <select
            value={form.type_notification}
            onChange={e => setForm(f => ({ ...f, type_notification: e.target.value }))}
            className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700"
          >
            <option value="SMS">SMS</option>
            <option value="MESSAGE">Message</option>
            <option value="SYSTEM">Système</option>
          </select>
          <input
            value={form.titre}
            onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
            placeholder="Titre"
            className="flex-1 min-w-[160px] text-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700"
          />
        </div>
        <textarea
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Message personnalisé (optionnel — message auto-généré si vide)"
          rows={3}
          className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !form.titre.trim()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${sent ? "bg-green-100 text-green-700" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:opacity-50`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {sent ? "Enregistré ✓" : sending ? "Envoi…" : "Envoyer & enregistrer"}
        </button>
      </div>

      {/* History */}
      {notifications.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">Aucune notification enregistrée pour ce lot.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-slate-100 p-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[n.type_notification] ?? "bg-slate-100 text-slate-600"}`}>
                    {n.type_label}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUT_BADGE[n.statut] ?? "bg-slate-100 text-slate-600"}`}>
                    {n.statut_label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(n.date_notification).toLocaleString("fr-FR")}
                  </span>
                  {n.montant_du && (
                    <span className="text-[10px] text-red-500 font-semibold">{fmt(n.montant_du)} MAD</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-700 truncate">{n.titre}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FicheLotPage() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const params      = new URLSearchParams(location.search);
  const lotId       = params.get("lot");
  const residenceId = params.get("residence") || localStorage.getItem("active_residence");

  const [lot,            setLot]            = useState(null);
  const [residence,      setResidence]      = useState(null);
  const [detailsCharge,  setDetailsCharge]  = useState([]);
  const [detailsFond,    setDetailsFond]    = useState([]);
  const [paiements,      setPaiements]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [notifications,  setNotifications]  = useState([]);
  const [smsSending,     setSmsSending]     = useState(false);
  const [smsSent,        setSmsSent]        = useState(false);
  const toast = useToast();

  const loadNotifications = useCallback(() => {
    if (!lotId) return;
    fetchJson(`${API}/notifications/?lot=${lotId}`).then(data => {
      setNotifications(Array.isArray(data) ? data : []);
    });
  }, [lotId]);

  // Load lot + residence
  useEffect(() => {
    if (!lotId) return;
    fetchJson(`${API}/lots/${lotId}/`).then(setLot);
  }, [lotId]);

  useEffect(() => {
    if (!residenceId) return;
    fetchJson(`${API}/residences/${residenceId}/`).then(setResidence);
  }, [residenceId]);

  // Load all data at once
  useEffect(() => {
    if (!lotId) return;
    setLoading(true);
    Promise.all([
      fetchJson(`${API}/details-appel/?lot=${lotId}&type_charge=CHARGE&page_size=500`),
      fetchJson(`${API}/details-appel/?lot=${lotId}&type_charge=FOND&page_size=500`),
      fetchJson(`${API}/paiements/?lot=${lotId}&page_size=500`),
    ]).then(([charge, fond, paie]) => {
      setDetailsCharge(Array.isArray(charge) ? charge : []);
      setDetailsFond(Array.isArray(fond) ? fond   : []);
      setPaiements(Array.isArray(paie)   ? paie   : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [lotId]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Summary across all details
  const summary = useMemo(() => {
    const allDetails = [...detailsCharge, ...detailsFond];
    let totalDu = 0, totalRecu = 0;
    allDetails.forEach(d => {
      totalDu   += parseFloat(d.montant      ?? 0);
      totalRecu += parseFloat(d.montant_recu ?? 0);
    });
    const totalPaiements = paiements.reduce((s, p) => s + parseFloat(p.montant ?? 0), 0);
    const reste  = totalDu - totalRecu;
    const pct    = totalDu > 0 ? Math.min(100, Math.round((totalRecu / totalDu) * 100)) : 0;
    const statut = getStatut(totalDu, totalRecu);
    return { totalDu, totalRecu, totalPaiements, reste, pct, statut };
  }, [detailsCharge, detailsFond, paiements]);

  // Payments with running balance
  const paiementsWithBalance = useMemo(() => {
    const sorted = [...paiements].sort((a, b) => new Date(a.date_paiement) - new Date(b.date_paiement));
    let running = summary.totalDu;
    return sorted.map(p => {
      running -= parseFloat(p.montant ?? 0);
      return { ...p, soldeApres: running };
    }).reverse(); // show newest first
  }, [paiements, summary.totalDu]);

  // Generate PDF
  const handleGeneratePdf = async () => {
    setPdfLoading(true);
    try {
      const html = buildPdfHtml({ lot, residence, detailsCharge, detailsFond, paiements });
      const blob = new Blob([html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, "_blank");
      win.onload = () => { win.focus(); win.print(); URL.revokeObjectURL(url); };
    } finally {
      setPdfLoading(false);
    }
  };

  const sendSmsNotif = useCallback(async (e) => {
    e.preventDefault();
    if (!lotId) return;
    setSmsSending(true);
    try {
      const r = await fetch(`${API}/notification-send/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_id:            parseInt(lotId),
          type_notification: "SMS",
          titre:             "Rappel de paiement",
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const montant = data.montant_du
          ? ` — Solde : ${parseFloat(data.montant_du).toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD`
          : "";
        toast.success(`Notification SMS enregistrée${montant}`);
        setSmsSent(true);
        loadNotifications();
        setTimeout(() => setSmsSent(false), 4000);
      } else {
        toast.error("Erreur lors de l'enregistrement de la notification.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSmsSending(false);
    }
    const phone = lot?.representant?.telephone;
    if (phone) window.open(`sms:${phone}`);
  }, [lotId, lot, loadNotifications, toast]);

  if (!lotId) return (
    <div className="text-center text-slate-400 py-16">Lot non spécifié.</div>
  );

  const resident     = lot?.representant;
  const residentName = resident ? `${resident.nom ?? ""} ${resident.prenom ?? ""}`.trim() : null;
  const telephone    = resident?.telephone || null;

  return (
    <div className="space-y-4">

      <button onClick={() => navigate("/kanban")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition">← Retour Lots</button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">

          {/* Left: lot info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-indigo-600">{lot?.numero_lot ?? "…"}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800">{lot?.numero_lot ?? "…"}</h1>
                {lot?.type_lot && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    {lot.type_lot}
                  </span>
                )}
              </div>
              {residentName && (
                <p className="text-sm text-slate-700 font-semibold mt-0.5">{residentName}</p>
              )}
              {telephone && (
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{telephone}</p>
              )}
              {lot?.groupe_nom && (
                <p className="text-xs text-slate-400 mt-0.5">Groupe: {lot.groupe_nom}</p>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start">
            {telephone && (
              <>
                <button
                  onClick={sendSmsNotif}
                  disabled={smsSending}
                  title={smsSent ? "SMS enregistré ✓" : "Envoyer SMS + enregistrer notification"}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${smsSent ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {smsSent ? "Envoyé ✓" : "SMS"}
                </button>
                <a
                  href={toWa(telephone, `Cher(e) propriétaire du Lot ${lot?.numero_lot}, un solde de ${fmt(Math.max(0, summary.reste))} MAD est en attente de règlement. Merci de régulariser votre situation. — Syndic`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition"
                  title="WhatsApp"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L0 24l6.335-1.61A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.846 0-3.574-.484-5.072-1.331l-.361-.214-3.763.957.998-3.649-.237-.378A9.967 9.967 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  WhatsApp
                </a>
              </>
            )}
            {lot?.representant?.email && (
              <button
                onClick={() => {
                  const email = lot.representant.email;
                  const subject = encodeURIComponent(`Rappel de paiement — Lot ${lot?.numero_lot}`);
                  const body = encodeURIComponent(`Cher(e) propriétaire du Lot ${lot?.numero_lot},\n\nUn solde de ${fmt(Math.max(0, summary.reste))} MAD est en attente de règlement.\nMerci de régulariser votre situation.\n\nCordialement,\nLe Syndic`);
                  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
                  navigator.clipboard.writeText(email).then(() => {
                    toast.success(`Email copié : ${email}`);
                  }).catch(() => {
                    toast.success(`Email : ${email}`);
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition"
                title={lot.representant.email}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
              </button>
            )}
            <button
              onClick={() => navigate(`/paiements?lot=${lotId}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Paiement
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={pdfLoading || !lot}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition disabled:opacity-50"
            >
              {pdfLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              )}
              {pdfLoading ? "Génération…" : "PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Financial summary ── */}
      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center flex-wrap gap-4 justify-between">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Appelé</span>
              <p className="text-base font-bold text-slate-800 font-mono">{fmt(summary.totalDu)} <span className="text-xs text-slate-400 font-normal">MAD</span></p>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 uppercase tracking-wide block">Encaissé</span>
              <p className="text-base font-bold text-emerald-700 font-mono">{fmt(summary.totalRecu)} <span className="text-xs text-emerald-400 font-normal">MAD</span></p>
            </div>
            <div>
              <span className={`text-[10px] uppercase tracking-wide block ${summary.reste > 0 ? "text-red-500" : "text-emerald-600"}`}>Reste</span>
              <p className={`text-base font-bold font-mono ${summary.reste > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(Math.abs(summary.reste))} <span className="text-xs font-normal">MAD</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge statut={summary.statut} />
            {summary.totalDu > 0 && (
              <div className="w-24">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${summary.pct >= 100 ? "bg-emerald-500" : summary.pct > 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${summary.pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-0.5">{summary.pct}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">

          {/* Appels de charge */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-100">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Appels de charge ({detailsCharge.length})</span>
            </div>
            <div className="p-4">
              <ChargesSection details={detailsCharge} typeLabel="charge" />
            </div>
          </div>

          {/* Appels de fond */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Appels de fond ({detailsFond.length})</span>
            </div>
            <div className="p-4">
              <ChargesSection details={detailsFond} typeLabel="fond" accent="amber" />
            </div>
          </div>

          {/* Paiements */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Paiements ({paiements.length})</span>
            </div>
            <div className="p-3">
              {paiementsWithBalance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucun paiement enregistré.</p>
              ) : (
                <div className="space-y-1.5">
                  {paiementsWithBalance.map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 hover:shadow-sm transition">
                      <span className="text-[11px] font-mono text-slate-500 w-20 shrink-0">{fmtDate(p.date_paiement)}</span>
                      <span className="text-[11px] font-mono text-slate-400 w-24 shrink-0 truncate">{p.reference || "—"}</span>
                      <span className="text-[11px] text-slate-400 w-20 shrink-0 truncate">{p.mode_paiement || "—"}</span>
                      <span className="flex-1 text-[11px] text-slate-400 truncate">{p.notes || ""}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 w-24 text-right shrink-0">{fmt(p.montant)}</span>
                      <span className={`text-[11px] font-mono font-semibold w-24 text-right shrink-0 ${p.soldeApres > 0 ? "text-red-500" : p.soldeApres < 0 ? "text-blue-500" : "text-emerald-600"}`}>
                        {fmt(Math.abs(p.soldeApres))}
                        {p.soldeApres < 0 && <span className="ml-1 text-[9px] text-blue-400 font-normal">avance</span>}
                      </span>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex justify-end px-3 pt-1">
                    <span className="text-[11px] font-bold text-emerald-700">
                      Total : {fmt(paiements.reduce((s, p) => s + parseFloat(p.montant ?? 0), 0))} MAD
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notifications ({notifications.length})</span>
            </div>
            <div className="p-4">
              <NotificationsSection
                notifications={notifications}
                lot={lot}
                summary={summary}
                telephone={telephone}
                onSend={loadNotifications}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

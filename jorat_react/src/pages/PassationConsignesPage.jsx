import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
const fmt = v => Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";
const SELECT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";

function parseJustifs(raw) {
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; }
  catch { return raw ? [{ libelle: raw, montant: "" }] : []; }
}

// Convert ISO datetime string (UTC) to local datetime-local input value
function toLocalInput(iso) {
  if (!iso) return new Date().toISOString().slice(0, 16);
  const d = new Date(iso);
  if (isNaN(d)) return iso.slice(0, 16);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PassationConsignesPage() {
  const [params] = useSearchParams();
  const assembleeId = params.get("assemblee");
  const navigate = useNavigate();

  const [passation,  setPassation]  = useState(null);
  const [situation,  setSituation]  = useState([]);
  const [personnes,  setPersonnes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error,      setError]      = useState("");

  const [form, setForm] = useState({
    date_passation:        toLocalInput(null),
    solde_banque:          "",
    notes:                 "",
    nom_syndic:            "",
    nom_tresorier:         "",
    nom_syndic_entrant:    "",
    nom_tresorier_entrant: "",
  });

  const [reserves,   setReserves]   = useState([]);
  const [newReserve, setNewReserve] = useState({ libelle: "", montant: "" });
  const [addingRes,  setAddingRes]  = useState(false);

  const [justifs,      setJustifs]      = useState([]);
  const [newJustif,    setNewJustif]    = useState({ libelle: "", montant: "", sens: "CREDIT" });
  const [editJustifIdx, setEditJustifIdx] = useState(null);

  // ── Contacts ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/personnes/?limit=500", { credentials: "include" })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setPersonnes(Array.isArray(d) ? d : (d.results ?? [])));
  }, []);

  const refreshCaisse = useCallback(async (id) => {
    const r = await fetch(`/api/passations/${id}/refresh-caisse/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (r.ok) {
      const d = await r.json();
      setPassation(p => ({ ...p, solde_caisse: d.solde_caisse }));
    }
  }, []);

  // ── Chargement ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = assembleeId ? `/api/passations/?assemblee=${assembleeId}` : "/api/passations/";
        const r = await fetch(url, { credentials: "include" });
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const p = list[0];
          setPassation(p);
          setForm({
            date_passation:        toLocalInput(p.date_passation),
            solde_banque:          p.solde_banque,
            notes:                 p.notes,
            nom_syndic:            p.nom_syndic            || "",
            nom_tresorier:         p.nom_tresorier         || "",
            nom_syndic_entrant:    p.nom_syndic_entrant    || "",
            nom_tresorier_entrant: p.nom_tresorier_entrant || "",
          });
          setReserves(p.reserves || []);
          setJustifs(parseJustifs(p.justification_ecart));
          // Charger situation + recalculer solde à chaque ouverture
          const [rs] = await Promise.all([
            fetch(`/api/passations/${p.id}/situation/`, { credentials: "include" }),
            refreshCaisse(p.id),
          ]);
          if (rs.ok) setSituation(await rs.json());
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [assembleeId, refreshCaisse]);

  // ── Sauvegarde ───────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nom_syndic)            { setError("Le syndic sortant est obligatoire.");    return; }
    if (!form.nom_tresorier)         { setError("Le trésorier sortant est obligatoire."); return; }
    if (!form.nom_syndic_entrant)    { setError("Le syndic entrant est obligatoire.");     return; }
    if (!form.nom_tresorier_entrant) { setError("Le trésorier entrant est obligatoire.");  return; }
    setSaving(true); setError("");
    // date_passation : figée côté serveur — exclure du payload
    const { date_passation: _ignored, ...formFields } = form;
    const payload = {
      ...formFields,
      justification_ecart: JSON.stringify(justifs),
      assemblee: assembleeId || null,
    };
    try {
      if (!passation) {
        const r = await fetch("/api/passations/", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          setError(err.detail || JSON.stringify(err) || "Erreur création."); return;
        }
        const p = await r.json();
        setPassation(p);
        setReserves(p.reserves || []);
        setJustifs(parseJustifs(p.justification_ecart));
        const [rs] = await Promise.all([
          fetch(`/api/passations/${p.id}/situation/`, { credentials: "include" }),
          refreshCaisse(p.id),
        ]);
        if (rs.ok) setSituation(await rs.json());
      } else {
        const r = await fetch(`/api/passations/${passation.id}/`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          setError(err.detail || JSON.stringify(err) || "Erreur modification."); return;
        }
        const p = await r.json();
        setPassation(prev => ({ ...prev, ...p }));
      }
    } finally { setSaving(false); }
  };

  // ── Réserves ─────────────────────────────────────────────
  const handleAddReserve = async () => {
    if (!passation || !newReserve.libelle.trim()) return;
    setAddingRes(true);
    const r = await fetch(`/api/passations/${passation.id}/reserves/`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ libelle: newReserve.libelle, montant: newReserve.montant || null }),
    });
    if (r.ok) {
      const res = await r.json();
      setReserves(prev => [...prev, res]);
      setNewReserve({ libelle: "", montant: "" });
    }
    setAddingRes(false);
  };

  const handleDeleteReserve = async (resId) => {
    if (!passation) return;
    await fetch(`/api/passations/${passation.id}/reserves/`, {
      method: "DELETE", credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ id: resId }),
    });
    setReserves(prev => prev.filter(r => r.id !== resId));
  };

  // ── Justifications ───────────────────────────────────────
  const addJustif = () => {
    if (!newJustif.libelle.trim()) return;
    const entry = { libelle: newJustif.libelle, montant: newJustif.montant, sens: newJustif.sens };
    if (editJustifIdx !== null) {
      setJustifs(prev => prev.map((j, i) => i === editJustifIdx ? entry : j));
      setEditJustifIdx(null);
    } else {
      setJustifs(prev => [...prev, entry]);
    }
    setNewJustif({ libelle: "", montant: "", sens: "CREDIT" });
  };

  const startEditJustif = (idx) => {
    setEditJustifIdx(idx);
    setNewJustif({ ...justifs[idx] });
  };

  const cancelEditJustif = () => {
    setEditJustifIdx(null);
    setNewJustif({ libelle: "", montant: "", sens: "CREDIT" });
  };

  const ecart = passation
    ? parseFloat(passation.solde_caisse) - parseFloat(form.solde_banque || 0)
    : 0;

  // Total justifications signé : CREDIT = positif, DEBIT = négatif
  const totalJustifs = justifs.reduce((s, j) => {
    const m = parseFloat(j.montant || 0);
    return s + (j.sens === "DEBIT" ? -m : m);
  }, 0);
  const ecartRestant = Math.round((ecart - totalJustifs) * 100) / 100;

  const personnesOptions = personnes.map(p => ({
    value: `${p.nom}${p.prenom ? " " + p.prenom : ""}`,
    label: `${p.nom}${p.prenom ? " " + p.prenom : ""}`,
  }));

  // ── Initialisation ───────────────────────────────────────
  const handleInitialisation = async () => {
    if (!window.confirm("Réinitialiser la passation ? La date sera recalculée, les justificatifs et réserves seront effacés.")) return;
    if (passation) {
      await fetch(`/api/passations/${passation.id}/`, {
        method: "DELETE", credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
      });
    }
    setPassation(null);
    setSituation([]);
    setReserves([]);
    setJustifs([]);
    setForm({
      date_passation:        toLocalInput(null),
      solde_banque:          "",
      notes:                 "",
      nom_syndic:            "",
      nom_tresorier:         "",
      nom_syndic_entrant:    "",
      nom_tresorier_entrant: "",
    });
  };

  // ── PDF ──────────────────────────────────────────────────
  const handlePdf = () => {
    if (!passation) return;
    setPdfLoading(true);

    const totalDu    = situation.reduce((s, l) => s + l.du,    0);
    const totalRecu  = situation.reduce((s, l) => s + l.recu,  0);
    const totalReste = situation.reduce((s, l) => s + l.reste, 0);

    const lotsRows = situation.map((l, i) => `
      <tr style="background:${i % 2 ? "#f9fafb" : "#fff"}">
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-weight:600">${l.lot}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${l.nom}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace">${fmt(l.du)}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#059669">${fmt(l.recu)}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace;color:${l.reste > 0 ? "#dc2626" : "#059669"};font-weight:${l.reste > 0 ? "700" : "400"}">${fmt(l.reste)}</td>
      </tr>`).join("");

    const reservesRows = reserves.map(r => `
      <tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${r.libelle}</td>
      </tr>`).join("");

    const justifRows = justifs.map(j => `
      <tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">
          <span style="font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;background:${j.sens === "CREDIT" ? "#d1fae5" : "#fee2e2"};color:${j.sens === "CREDIT" ? "#065f46" : "#991b1b"};margin-right:6px">${j.sens === "CREDIT" ? "Crédit" : "Débit"}</span>${j.libelle}
        </td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace;color:${j.sens === "CREDIT" ? "#059669" : "#dc2626"}">${j.montant ? (j.sens === "CREDIT" ? "+" : "−") + fmt(j.montant) + " MAD" : "—"}</td>
      </tr>`).join("");

    let sec = 1;
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Passation de consignes — ${form.date_passation.replace("T", " ")}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: #fff; padding: 18px 22px; }
    @page { size: A4; margin: 12mm 14mm; }
    h1 { font-size: 16px; font-weight: 800; letter-spacing: 0.03em; }
    h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 2px solid #111; padding-bottom: 3px; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #111; color: #fff; padding: 5px 8px; text-align: left; }
    .kpi { display: flex; gap: 8px; margin-bottom: 4px; }
    .kpi-box { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; }
    .kpi-label { font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-val { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
    .sign-col-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 10px; }
    .sign-block { margin-bottom: 18px; }
    .sign-box { border-top: 1px solid #111; padding-top: 5px; }
    .sign-role { font-size: 9px; font-weight: 700; margin-bottom: 1px; }
    .sign-name { font-size: 10px; color: #333; }
    .sign-space { height: 28px; }
    .red { color: #dc2626; } .green { color: #059669; }
  </style>
</head>
<body>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #111">
    <div>
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#555;margin-bottom:3px">Procès-verbal de</div>
      <h1>PASSATION DE CONSIGNES</h1>
      <div style="font-size:9px;color:#555;margin-top:3px">Date : <strong>${form.date_passation.replace("T", " ")}</strong></div>
    </div>
    <div style="text-align:right;font-size:9px;color:#555">
      <div style="font-weight:700;font-size:11px;color:#111">Syndic Pro</div>
      <div>Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <h2>${sec++}. Situation Financière</h2>
  <div class="kpi">
    <div class="kpi-box">
      <div class="kpi-label">Solde Caisse</div>
      <div class="kpi-val">${fmt(passation.solde_caisse)} MAD</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Solde Compte Bancaire</div>
      <div class="kpi-val">${fmt(form.solde_banque)} MAD</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Écart Caisse / Banque</div>
      <div class="kpi-val ${Math.abs(ecart) < 0.01 ? "green" : "red"}">${fmt(ecart)} MAD</div>
    </div>
  </div>

  ${justifs.length > 0 ? `
  <h2>${sec++}. Justification des Écarts</h2>
  <table>
    <thead><tr><th>Libellé</th></tr></thead>
    <tbody>${justifRows}</tbody>
  </table>` : ""}

  <h2>${sec++}. Situation des Paiements par Lot</h2>
  <table>
    <thead><tr>
      <th style="width:60px">Lot</th><th>Propriétaire</th>
      <th style="text-align:right">Appelé</th>
      <th style="text-align:right">Encaissé</th>
      <th style="text-align:right">Reste</th>
    </tr></thead>
    <tbody>
      ${lotsRows}
      <tr style="background:#f1f5f9;font-weight:700">
        <td colspan="2" style="padding:5px 8px;border:1px solid #cbd5e1">TOTAL</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace">${fmt(totalDu)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;color:#059669">${fmt(totalRecu)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-family:monospace;color:${totalReste > 0 ? "#dc2626" : "#059669"}">${fmt(totalReste)}</td>
      </tr>
    </tbody>
  </table>

  ${reserves.length > 0 ? `
  <h2>${sec++}. Réserves et Observations</h2>
  <table>
    <thead><tr><th>Libellé</th></tr></thead>
    <tbody>${reservesRows}</tbody>
  </table>` : ""}

  ${form.notes ? `
  <h2>${sec++}. Notes Complémentaires</h2>
  <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:3px;font-size:9px;line-height:1.6">${form.notes}</div>` : ""}

  <div class="sign-grid">
    <div>
      <div class="sign-col-label">Bureau sortant</div>
      <div class="sign-block">
        <div class="sign-box">
          <div class="sign-role">Le Trésorier Sortant</div>
          <div class="sign-name">${form.nom_tresorier || "___________________"}</div>
          <div class="sign-space"></div>
          <div style="font-size:8px;color:#777">Signature</div>
        </div>
      </div>
      <div class="sign-block">
        <div class="sign-box">
          <div class="sign-role">Le Syndic Sortant</div>
          <div class="sign-name">${form.nom_syndic || "___________________"}</div>
          <div class="sign-space"></div>
          <div style="font-size:8px;color:#777">Signature</div>
        </div>
      </div>
    </div>
    <div>
      <div class="sign-col-label">Bureau entrant</div>
      <div class="sign-block">
        <div class="sign-box">
          <div class="sign-role">Le Trésorier Entrant</div>
          <div class="sign-name">${form.nom_tresorier_entrant || "___________________"}</div>
          <div class="sign-space"></div>
          <div style="font-size:8px;color:#777">Signature</div>
        </div>
      </div>
      <div class="sign-block">
        <div class="sign-box">
          <div class="sign-role">Le Syndic Entrant</div>
          <div class="sign-name">${form.nom_syndic_entrant || "___________________"}</div>
          <div class="sign-space"></div>
          <div style="font-size:8px;color:#777">Signature</div>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:7px;color:#aaa;display:flex;justify-content:space-between">
    <span>Passation de consignes · Syndic Pro</span>
    <span>Édité le ${new Date().toLocaleDateString("fr-FR")}</span>
  </div>

</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setPdfLoading(false);
  };

  // ── Render ───────────────────────────────────────────────
  if (loading) return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
        <h1 className="text-white font-bold text-lg leading-tight">Passation de consignes</h1>
      </div>
      <div className="px-4 -mt-5">
        <div className="bg-white rounded-2xl shadow-sm text-center py-12 text-slate-400">Chargement…</div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-100 min-h-screen -m-3 sm:-m-6 pb-24">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 pt-5 pb-8">
        {assembleeId && (
          <button onClick={() => navigate("/gouvernance/assemblees")}
            className="flex items-center gap-1 text-white/70 hover:text-white text-[10px] font-semibold mb-3 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour AG
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Gouvernance</p>
            <h1 className="text-white font-bold text-lg leading-tight">Passation de consignes</h1>
          </div>
          <div className="flex gap-2">
            {passation && (
              <button onClick={handleInitialisation}
                className="bg-red-500/20 text-white text-xs px-3 py-2 rounded-xl font-semibold hover:bg-red-500/30 transition">
                Initialiser
              </button>
            )}
            {passation && (
              <button onClick={handlePdf} disabled={pdfLoading}
                className="bg-white text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold hover:bg-indigo-50 transition disabled:opacity-60">
                {pdfLoading ? "Génération…" : "PDF"}
              </button>
            )}
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-1">Transfert du bureau syndical</p>
      </div>
      <div className="px-4 -mt-5 space-y-4">

      {error && <div className="bg-white rounded-2xl shadow-sm text-xs text-red-600 border border-red-200 px-4 py-2">{error}</div>}

      {/* ── Formulaire principal ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

        {/* Date — figée automatiquement à la création, non modifiable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date et heure de passation</label>
            <input type="datetime-local" className={INPUT + " bg-slate-50 cursor-not-allowed opacity-70"}
              value={form.date_passation} disabled />
            <p className="text-[10px] text-slate-400 mt-0.5">Définie automatiquement · non modifiable</p>
          </div>
        </div>

        {/* Signataires */}
        <div className="border-t border-slate-100 pt-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Signataires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Bureau sortant</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Syndic sortant</label>
                  <select className={SELECT} value={form.nom_syndic}
                    onChange={e => setForm(f => ({ ...f, nom_syndic: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {personnesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trésorier sortant</label>
                  <select className={SELECT} value={form.nom_tresorier}
                    onChange={e => setForm(f => ({ ...f, nom_tresorier: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {personnesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Bureau entrant</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Syndic entrant</label>
                  <select className={SELECT} value={form.nom_syndic_entrant}
                    onChange={e => setForm(f => ({ ...f, nom_syndic_entrant: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {personnesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trésorier entrant</label>
                  <select className={SELECT} value={form.nom_tresorier_entrant}
                    onChange={e => setForm(f => ({ ...f, nom_tresorier_entrant: e.target.value }))}>
                    <option value="">— Sélectionner —</option>
                    {personnesOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Situation financière */}
        <div className="border-t border-slate-100 pt-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Situation financière</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Caisse auto */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solde Caisse</span>
                {passation && (
                  <button onClick={() => refreshCaisse(passation.id)} title="Recalculer"
                    className="text-slate-400 hover:text-indigo-600 transition text-xs">↺</button>
                )}
              </div>
              <p className="text-lg font-bold text-slate-800">{fmt(passation?.solde_caisse ?? 0)}</p>
              <p className="text-[10px] text-slate-400">MAD · automatique</p>
            </div>

            {/* Banque avec affichage formaté */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Solde Bancaire</div>
              <p className="text-lg font-bold text-slate-800">{fmt(form.solde_banque || 0)}</p>
              <input type="number" step="0.01" placeholder="Saisir le montant"
                className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                value={form.solde_banque}
                onChange={e => setForm(f => ({ ...f, solde_banque: e.target.value }))} />
              <p className="text-[10px] text-slate-400 mt-0.5">MAD · manuel</p>
            </div>

            {/* Écart */}
            <div className={`rounded-xl border p-3 ${Math.abs(ecart) < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Écart</div>
              <p className={`text-lg font-bold ${Math.abs(ecart) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>{fmt(ecart)}</p>
              <p className="text-[10px] text-slate-400">MAD · caisse − banque</p>
            </div>
          </div>

          {/* Justifications de l'écart */}
          {Math.abs(ecart) >= 0.01 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Justification(s) de l'écart</h3>

              {justifs.length > 0 && (
                <div className="space-y-1.5">
                  {justifs.map((j, idx) => (
                    <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${editJustifIdx === idx ? "bg-indigo-50 border-indigo-300" : "bg-red-50 border-red-100"}`}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${j.sens === "CREDIT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {j.sens === "CREDIT" ? "Crédit +" : "Débit −"}
                      </span>
                      <span className="text-sm text-slate-700 flex-1">{j.libelle}</span>
                      {j.montant && (
                        <span className={`text-xs font-mono font-semibold shrink-0 ${j.sens === "CREDIT" ? "text-emerald-700" : "text-red-700"}`}>
                          {j.sens === "CREDIT" ? "+" : "−"}{fmt(j.montant)} MAD
                        </span>
                      )}
                      <button onClick={() => startEditJustif(idx)}
                        className="text-slate-400 hover:text-indigo-600 transition text-xs shrink-0" title="Modifier">✎</button>
                      <button onClick={() => { if (editJustifIdx === idx) cancelEditJustif(); setJustifs(prev => prev.filter((_, i) => i !== idx)); }}
                        className="text-slate-300 hover:text-red-500 transition text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Indicateur équilibre */}
              {justifs.some(j => j.montant) && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${Math.abs(ecartRestant) < 0.01 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                  <span className="text-base">{Math.abs(ecartRestant) < 0.01 ? "↑" : "↓"}</span>
                  <span>
                    {Math.abs(ecartRestant) < 0.01
                      ? "Justifications équilibrées — écart couvert"
                      : `Reste à justifier : ${fmt(Math.abs(ecartRestant))} MAD`}
                  </span>
                  <span className="ml-auto text-xs font-normal opacity-70">
                    Total justifié : {fmt(Math.abs(totalJustifs))} / Écart : {fmt(Math.abs(ecart))}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <input className={INPUT} placeholder="Libellé de la justification…"
                  value={newJustif.libelle}
                  onChange={e => setNewJustif(j => ({ ...j, libelle: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addJustif()} />
                <div className="flex gap-2 items-center">
                  <input type="number" step="0.01" className={INPUT + " w-32"} placeholder="Montant"
                    value={newJustif.montant}
                    onChange={e => setNewJustif(j => ({ ...j, montant: e.target.value }))} />
                  <select className="border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-indigo-400 bg-white shrink-0"
                    value={newJustif.sens}
                    onChange={e => setNewJustif(j => ({ ...j, sens: e.target.value }))}>
                    <option value="CREDIT">Crédit +</option>
                    <option value="DEBIT">Débit −</option>
                  </select>
                  {editJustifIdx !== null && (
                    <button onClick={cancelEditJustif}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition shrink-0">
                      ✕
                    </button>
                  )}
                  <button onClick={addJustif} disabled={!newJustif.libelle.trim()}
                    className={`px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition shrink-0 ${editJustifIdx !== null ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-500 hover:bg-red-600"}`}>
                    {editJustifIdx !== null ? "Modifier" : "+ Ajouter"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? "Enregistrement…" : passation ? "Mettre à jour" : "Créer la passation"}
          </button>
        </div>
      </div>

      {passation && (<>

        {/* ── Situation paiements ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Situation des paiements par lot</span>
            <span className="ml-2 text-[10px] text-slate-400">automatique</span>
          </div>
          {situation.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Aucune donnée de paiement.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-left font-bold text-slate-500">Lot</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-500">Propriétaire</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-500">Appelé</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-500">Encaissé</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-500">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {situation.map((l, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-4 py-2 font-bold text-indigo-700">{l.lot}</td>
                      <td className="px-4 py-2 text-slate-600">{l.nom}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-700">{fmt(l.du)}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600 font-semibold">{fmt(l.recu)}</td>
                      <td className={`px-4 py-2 text-right font-mono font-bold ${l.reste > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(l.reste)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan="2" className="px-4 py-2 text-slate-700 text-xs uppercase tracking-wide">Total</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">{fmt(situation.reduce((s,l)=>s+l.du,0))}</td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-600">{fmt(situation.reduce((s,l)=>s+l.recu,0))}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-600">{fmt(situation.reduce((s,l)=>s+l.reste,0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Réserves ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Réserves et observations</h2>
          {reserves.length > 0 && (
            <div className="space-y-2">
              {reserves.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-sm text-slate-700 flex-1">{r.libelle}</span>
                  <button onClick={() => handleDeleteReserve(r.id)}
                    className="text-slate-300 hover:text-red-500 transition text-xs shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input className={INPUT} placeholder="Libellé de la réserve…"
              value={newReserve.libelle}
              onChange={e => setNewReserve(r => ({ ...r, libelle: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAddReserve()} />
            <button onClick={handleAddReserve} disabled={addingRes || !newReserve.libelle.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition shrink-0">
              + Ajouter
            </button>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notes complémentaires</h2>
          <textarea rows={3} className={INPUT + " resize-none"} placeholder="Observations libres…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end mt-3">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>

      </>)}
      </div>
    </div>
  );
}

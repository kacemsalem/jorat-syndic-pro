import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}
const fmt = v => Number(v || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 });
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white";

const EMPTY_FORM = {
  date_passation:        new Date().toISOString().slice(0, 10),
  solde_banque:          "",
  notes:                 "",
  nom_syndic:            "",
  nom_tresorier:         "",
  nom_syndic_entrant:    "",
  nom_tresorier_entrant: "",
};

function PersonneSelect({ label, value, onChange, personnes }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select className={INPUT} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Sélectionner —</option>
        {personnes.map(p => {
          const lbl = `${p.prenom || ""} ${p.nom}`.trim();
          return <option key={p.id} value={lbl}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

export default function PassationConsignesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const assembleeId = params.get("assemblee");

  const [passation,   setPassation]   = useState(null);
  const [situation,   setSituation]   = useState([]);
  const [personnes,   setPersonnes]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [error,       setError]       = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  // Justifications écart — liste [{libelle, montant}]
  const [justifications,  setJustifications]  = useState([]);
  const [newJustif,       setNewJustif]       = useState({ libelle: "", montant: "" });

  // Réserves
  const [reserves,   setReserves]   = useState([]);
  const [newReserve, setNewReserve] = useState({ libelle: "", montant: "" });
  const [addingRes,  setAddingRes]  = useState(false);

  // Contacts
  useEffect(() => {
    fetch("/api/personnes/", { credentials: "include" })
      .then(r => r.json())
      .then(d => setPersonnes(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  }, []);

  // Charger passation existante pour cette AG
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = assembleeId
          ? `/api/passations/?assemblee=${assembleeId}`
          : "/api/passations/";
        const r = await fetch(url, { credentials: "include" });
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const p = list[0];
          setPassation(p);
          setForm({
            date_passation:        p.date_passation,
            solde_banque:          p.solde_banque,
            notes:                 p.notes || "",
            nom_syndic:            p.nom_syndic || "",
            nom_tresorier:         p.nom_tresorier || "",
            nom_syndic_entrant:    p.nom_syndic_entrant || "",
            nom_tresorier_entrant: p.nom_tresorier_entrant || "",
          });
          setReserves(p.reserves || []);
          // Parse justifications JSON
          try {
            const j = JSON.parse(p.justification_ecart);
            setJustifications(Array.isArray(j) ? j : []);
          } catch { setJustifications([]); }
          // Charger situation lots
          const rs = await fetch(`/api/passations/${p.id}/situation/`, { credentials: "include" });
          if (rs.ok) setSituation(await rs.json());
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [assembleeId]);

  const handleSave = async () => {
    setSaving(true); setError("");
    const payload = {
      ...form,
      solde_banque: form.solde_banque || 0,
      justification_ecart: JSON.stringify(justifications),
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
          const d = await r.json().catch(() => ({}));
          setError(Object.values(d).flat().join(" ") || "Erreur création.");
          return;
        }
        const p = await r.json();
        setPassation(p);
        setReserves(p.reserves || []);
        const rs = await fetch(`/api/passations/${p.id}/situation/`, { credentials: "include" });
        if (rs.ok) setSituation(await rs.json());
      } else {
        const r = await fetch(`/api/passations/${passation.id}/`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(Object.values(d).flat().join(" ") || "Erreur modification.");
          return;
        }
        const p = await r.json();
        setPassation(p);
      }
    } finally { setSaving(false); }
  };

  const handleRefreshCaisse = async () => {
    if (!passation) return;
    const r = await fetch(`/api/passations/${passation.id}/refresh-caisse/`, {
      method: "POST", credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (r.ok) {
      const d = await r.json();
      setPassation(p => ({ ...p, solde_caisse: d.solde_caisse }));
    }
  };

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

  const addJustif = () => {
    if (!newJustif.libelle.trim()) return;
    setJustifications(prev => [...prev, { libelle: newJustif.libelle, montant: newJustif.montant }]);
    setNewJustif({ libelle: "", montant: "" });
  };

  const removeJustif = (idx) => setJustifications(prev => prev.filter((_, i) => i !== idx));

  const solveBanque = parseFloat(form.solde_banque) || 0;
  const solveCaisse = parseFloat(passation?.solde_caisse ?? 0);
  const ecart = solveCaisse - solveBanque;

  // ── PDF ─────────────────────────────────────────────────────────────────
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
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace">${r.montant ? fmt(r.montant) + " MAD" : "—"}</td>
      </tr>`).join("");

    const justifRows = justifications.map(j => `
      <tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb">${j.libelle}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-family:monospace">${j.montant ? fmt(j.montant) + " MAD" : "—"}</td>
      </tr>`).join("");

    const sectNum = (n) => n;
    let sec = 1;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Passation de consignes — ${form.date_passation}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
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
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; }
    .sign-group { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
    .sign-group-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .sign-row { display: flex; justify-content: space-between; gap: 10px; }
    .sign-box { flex: 1; }
    .sign-title { font-size: 9px; font-weight: 700; margin-bottom: 2px; }
    .sign-name { font-size: 10px; color: #333; }
    .sign-line { margin-top: 22px; border-top: 1px solid #111; padding-top: 4px; font-size: 7px; color: #aaa; }
    .red { color: #dc2626; } .green { color: #059669; }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #111">
    <div>
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#555;margin-bottom:3px">Procès-verbal de</div>
      <h1>PASSATION DE CONSIGNES</h1>
      <div style="font-size:9px;color:#555;margin-top:3px">Date : <strong>${form.date_passation}</strong></div>
    </div>
    <div style="text-align:right;font-size:9px;color:#555">
      <div style="font-weight:700;font-size:11px;color:#111">Syndic Pro</div>
      <div>Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <!-- Situation financière -->
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

  ${justifications.length > 0 ? `
  <h2>${sec++}. Justification des Écarts</h2>
  <table>
    <thead><tr><th>Justification</th><th style="text-align:right;width:120px">Montant</th></tr></thead>
    <tbody>${justifRows}</tbody>
  </table>` : ""}

  <!-- Situation paiements -->
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
    <thead><tr><th>Libellé</th><th style="text-align:right;width:120px">Montant</th></tr></thead>
    <tbody>${reservesRows}</tbody>
  </table>` : ""}

  ${form.notes ? `
  <h2>${sec++}. Notes Complémentaires</h2>
  <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:3px;font-size:9px;line-height:1.6">${form.notes}</div>` : ""}

  <!-- Signatures -->
  <div class="sign-grid">
    <div class="sign-group">
      <div class="sign-group-title">Bureau Syndical Sortant</div>
      <div class="sign-row">
        <div class="sign-box">
          <div class="sign-title">Le Syndic</div>
          <div class="sign-name">${form.nom_syndic || "___________________"}</div>
          <div class="sign-line">Signature</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Le Trésorier</div>
          <div class="sign-name">${form.nom_tresorier || "___________________"}</div>
          <div class="sign-line">Signature</div>
        </div>
      </div>
    </div>
    <div class="sign-group">
      <div class="sign-group-title">Bureau Syndical Entrant</div>
      <div class="sign-row">
        <div class="sign-box">
          <div class="sign-title">Le Syndic</div>
          <div class="sign-name">${form.nom_syndic_entrant || "___________________"}</div>
          <div class="sign-line">Signature</div>
        </div>
        <div class="sign-box">
          <div class="sign-title">Le Trésorier</div>
          <div class="sign-name">${form.nom_tresorier_entrant || "___________________"}</div>
          <div class="sign-line">Signature</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Pied de page -->
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:7px;color:#aaa;display:flex;justify-content:space-between">
    <span>Passation de consignes · Syndic Pro</span>
    <span>${form.date_passation}</span>
  </div>

</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    win.onload = () => { win.focus(); win.print(); URL.revokeObjectURL(url); };
    setPdfLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">
      <button onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:text-slate-700 font-medium transition">
        ← Retour
      </button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Passation de consignes</h1>
          <p className="text-xs text-slate-400 mt-0.5">Transfert du bureau syndical — situation à la date de passation</p>
        </div>
        {passation && (
          <button onClick={handlePdf} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition disabled:opacity-60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            {pdfLoading ? "Génération…" : "PDF Passation"}
          </button>
        )}
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</div>}

      {/* ── Formulaire principal ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

        {/* Date */}
        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date de passation *</label>
          <input type="date" className={INPUT} value={form.date_passation}
            onChange={e => setForm(f => ({ ...f, date_passation: e.target.value }))} />
        </div>

        {/* Signataires — sortants */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Bureau sortant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersonneSelect label="Syndic sortant" value={form.nom_syndic}
              onChange={v => setForm(f => ({ ...f, nom_syndic: v }))} personnes={personnes} />
            <PersonneSelect label="Trésorier sortant" value={form.nom_tresorier}
              onChange={v => setForm(f => ({ ...f, nom_tresorier: v }))} personnes={personnes} />
          </div>
        </div>

        {/* Signataires — entrants */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Bureau entrant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersonneSelect label="Syndic entrant" value={form.nom_syndic_entrant}
              onChange={v => setForm(f => ({ ...f, nom_syndic_entrant: v }))} personnes={personnes} />
            <PersonneSelect label="Trésorier entrant" value={form.nom_tresorier_entrant}
              onChange={v => setForm(f => ({ ...f, nom_tresorier_entrant: v }))} personnes={personnes} />
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
                  <button onClick={handleRefreshCaisse} title="Actualiser"
                    className="text-slate-400 hover:text-indigo-600 transition text-xs">↺</button>
                )}
              </div>
              <p className="text-lg font-bold text-slate-800">{fmt(passation?.solde_caisse ?? 0)}</p>
              <p className="text-[10px] text-slate-400">MAD · automatique</p>
            </div>

            {/* Banque — formatted display + input */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Solde Compte Bancaire</span>
              <p className="text-lg font-bold text-slate-800 mb-1">{fmt(form.solde_banque || 0)}</p>
              <input type="number" step="0.01" placeholder="Saisir le montant"
                className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                value={form.solde_banque}
                onChange={e => setForm(f => ({ ...f, solde_banque: e.target.value }))} />
            </div>

            {/* Écart */}
            <div className={`rounded-xl border p-3 ${Math.abs(ecart) < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Écart</div>
              <p className={`text-lg font-bold ${Math.abs(ecart) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>{fmt(ecart)}</p>
              <p className="text-[10px] text-slate-400">MAD · caisse − banque</p>
            </div>
          </div>

          {/* Justifications écart */}
          {Math.abs(ecart) >= 0.01 && (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                Justifications de l'écart
                <span className="ml-1 text-slate-400 font-normal">(détaillez chaque poste)</span>
              </label>

              {justifications.length > 0 && (
                <div className="space-y-1.5">
                  {justifications.map((j, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100">
                      <span className="text-sm text-slate-700 flex-1">{j.libelle}</span>
                      {j.montant && <span className="text-xs font-mono font-semibold text-orange-700 shrink-0">{fmt(j.montant)} MAD</span>}
                      <button onClick={() => removeJustif(idx)}
                        className="text-slate-300 hover:text-red-500 transition text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input className={INPUT} placeholder="Ex : Chèque non encore encaissé…"
                    value={newJustif.libelle}
                    onChange={e => setNewJustif(j => ({ ...j, libelle: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addJustif()} />
                </div>
                <div className="w-36">
                  <input type="number" step="0.01" className={INPUT} placeholder="Montant (opt.)"
                    value={newJustif.montant}
                    onChange={e => setNewJustif(j => ({ ...j, montant: e.target.value }))} />
                </div>
                <button onClick={addJustif} disabled={!newJustif.libelle.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shrink-0">
                  + Ajouter
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
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
                  {r.montant && <span className="text-xs font-mono font-semibold text-amber-700 shrink-0">{fmt(r.montant)} MAD</span>}
                  <button onClick={() => handleDeleteReserve(r.id)}
                    className="text-slate-300 hover:text-red-500 transition text-xs shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input className={INPUT} placeholder="Libellé de la réserve…"
                value={newReserve.libelle}
                onChange={e => setNewReserve(r => ({ ...r, libelle: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAddReserve()} />
            </div>
            <div className="w-32">
              <input type="number" step="0.01" className={INPUT} placeholder="Montant (opt.)"
                value={newReserve.montant}
                onChange={e => setNewReserve(r => ({ ...r, montant: e.target.value }))} />
            </div>
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
  );
}

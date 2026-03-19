import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const TYPE_LABELS = {
  SOLDE_INITIAL:      "Solde initial",
  PAIEMENT:           "Paiement copropriétaire",
  RECETTE:            "Recette",
  DEPENSE:            "Dépense",
  AJUSTEMENT:         "Ajustement",
  ARCHIVE_ADJUSTMENT: "Ajust. archive",
};

const TYPE_COLORS = {
  SOLDE_INITIAL:      { bg: "#e0f2fe", text: "#0369a1" },
  PAIEMENT:           { bg: "#d1fae5", text: "#059669" },
  RECETTE:            { bg: "#dcfce7", text: "#16a34a" },
  DEPENSE:            { bg: "#fee2e2", text: "#dc2626" },
  AJUSTEMENT:         { bg: "#fef3c7", text: "#d97706" },
  ARCHIVE_ADJUSTMENT: { bg: "#f3e8ff", text: "#7c3aed" },
};

const SENS_COLORS = {
  DEBIT:  { bg: "#d1fae5", text: "#059669" },
  CREDIT: { bg: "#fee2e2", text: "#dc2626" },
};

const EMPTY_FORM = {
  type_mouvement: "AJUSTEMENT",
  sens: "DEBIT",
  date_mouvement: new Date().toISOString().slice(0, 10),
  montant: "",
  libelle: "",
  commentaire: "",
};

const MANUAL_TYPES = ["SOLDE_INITIAL", "AJUSTEMENT"];

export default function CaissePage() {
  const navigate = useNavigate();

  const [mouvements,  setMouvements]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterMois,  setFilterMois]  = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterSens,  setFilterSens]  = useState("");

  const fetchAll = () => {
    setLoading(true);
    fetch("/api/caisse-mouvements/", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setMouvements(Array.isArray(d) ? d : (d.results ?? [])); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    return mouvements.filter(m => {
      if (filterAnnee && !m.date_mouvement?.startsWith(filterAnnee)) return false;
      if (filterMois  && m.mois !== filterMois) return false;
      if (filterType  && m.type_mouvement !== filterType) return false;
      if (filterSens  && m.sens !== filterSens) return false;
      return true;
    });
  }, [mouvements, filterAnnee, filterMois, filterType, filterSens]);

  const balance = useMemo(() => {
    return filtered.reduce((acc, m) => {
      const v = parseFloat(m.montant) || 0;
      return m.sens === "DEBIT" ? acc + v : acc - v;
    }, 0);
  }, [filtered]);

  const totalEntrees = useMemo(() =>
    filtered.filter(m => m.sens === "DEBIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0),
    [filtered]);

  const totalSorties = useMemo(() =>
    filtered.filter(m => m.sens === "CREDIT").reduce((s, m) => s + (parseFloat(m.montant) || 0), 0),
    [filtered]);

  const handleSubmit = async () => {
    setError("");
    if (!form.montant || !form.libelle || !form.date_mouvement) {
      setError("Montant, libellé et date sont obligatoires."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/caisse-mouvements/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(JSON.stringify(d)); return;
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await fetch(`/api/caisse-mouvements/${id}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": getCsrf() },
    });
    fetchAll();
  };

  const annees = useMemo(() => {
    const set = new Set(mouvements.map(m => m.date_mouvement?.slice(0, 4)).filter(Boolean));
    return [...set].sort().reverse();
  }, [mouvements]);

  const fmt = (n) => Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Caisse</h1>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setError(""); setShowForm(true); }}
          style={{ padding: "9px 20px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
        >
          + Nouveau mouvement
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Solde actuel",     value: `${fmt(balance)} MAD`,      color: balance >= 0 ? "#059669" : "#dc2626", bg: balance >= 0 ? "#d1fae5" : "#fee2e2", border: balance >= 0 ? "#6ee7b7" : "#fca5a5" },
          { label: "Total entrées",    value: `${fmt(totalEntrees)} MAD`, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Total sorties",    value: `${fmt(totalSorties)} MAD`, color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
          { label: "Nb mouvements",    value: filtered.length,            color: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          <option value="">Toutes périodes</option>
          {[
            ["JAN","Jan"],["FEV","Fév"],["MAR","Mar"],["AVR","Avr"],["MAI","Mai"],["JUN","Jui"],
            ["JUL","Jul"],["AOU","Aoû"],["SEP","Sep"],["OCT","Oct"],["NOV","Nov"],["DEC","Déc"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select value={filterSens} onChange={e => setFilterSens(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
          <option value="">Entrées + Sorties</option>
          <option value="DEBIT">Entrées seulement</option>
          <option value="CREDIT">Sorties seulement</option>
        </select>

        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 13, alignSelf: "center" }}>
          {filtered.length} mouvement{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-md">
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Nouveau mouvement manuel</h3>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Type *</label>
              <select value={form.type_mouvement} onChange={e => setForm(f => ({ ...f, type_mouvement: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                {MANUAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Sens *</label>
              <select value={form.sens} onChange={e => setForm(f => ({ ...f, sens: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                <option value="DEBIT">Entrée (débit)</option>
                <option value="CREDIT">Sortie (crédit)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Date *</label>
              <input type="date" value={form.date_mouvement} onChange={e => setForm(f => ({ ...f, date_mouvement: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Montant (MAD) *</label>
              <input type="number" min="0.01" step="0.01" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                placeholder="0.00"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Libellé *</label>
              <input type="text" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                placeholder="Description du mouvement"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Commentaire</label>
            <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
              rows={2} placeholder="Remarques optionnelles…"
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box", resize: "vertical" }} />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: "9px 24px", background: saving ? "#94a3b8" : "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14 }}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }}
              style={{ padding: "9px 20px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#475569" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          Aucun mouvement trouvé
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Date", "Type", "Sens", "Libellé / Compte", "Montant (MAD)", "Solde (MAD)", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: (h === "Montant (MAD)" || h === "Solde (MAD)") ? "right" : "left", fontWeight: 600, color: "#374151", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => {
                const tc = TYPE_COLORS[m.type_mouvement] || { bg: "#f1f5f9", text: "#475569" };
                const sc = SENS_COLORS[m.sens] || { bg: "#f1f5f9", text: "#475569" };
                const isManual = MANUAL_TYPES.includes(m.type_mouvement);
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 16px", color: "#374151", whiteSpace: "nowrap" }}>{m.date_mouvement}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: tc.bg, color: tc.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {TYPE_LABELS[m.type_mouvement] ?? m.type_mouvement}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: sc.bg, color: sc.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {m.sens === "DEBIT" ? "Entrée" : "Sortie"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>
                      <div>{m.libelle}</div>
                      {m.compte_code && (
                        <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2, fontFamily: "monospace" }}>
                          {m.compte_code}{m.compte_libelle ? ` — ${m.compte_libelle}` : ""}
                        </div>
                      )}
                      {m.commentaire && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{m.commentaire}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: m.sens === "DEBIT" ? "#059669" : "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                      {m.sens === "CREDIT" ? "−" : "+"}{fmt(m.montant)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: m.running_balance == null ? "#94a3b8" : m.running_balance >= 0 ? "#0369a1" : "#dc2626", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {m.running_balance == null ? "—" : fmt(m.running_balance)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {isManual && (
                        <button onClick={() => handleDelete(m.id)}
                          style={{ padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Suppr.
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const ALL_DATASETS = {
  "lots": {
    key: "lots", label: "Lots", desc: "Appartements, bureaux, locaux…",
    columns: ["numero_lot", "type_lot", "etage_lot", "surface", "montant_ref", "groupe", "proprietaire"],
    required: ["numero_lot"],
    note: "groupe et proprietaire sont optionnels — si absent ou introuvable, «ND (non définie)» est utilisé automatiquement.",
  },
  "personnes": {
    key: "personnes", label: "Contacts", desc: "Propriétaires et occupants",
    columns: ["nom", "prenom", "telephone", "email", "type_personne"],
    required: ["nom"],
    note: "type_personne: PHYSIQUE ou MORALE",
  },
  "plan-comptable": {
    key: "plan-comptable", label: "Plan Comptable", desc: "Comptes comptables",
    columns: ["code_compte", "libelle", "type_compte"],
    required: ["code_compte", "libelle"],
    note: "type_compte: CHARGE, PRODUIT ou TRESORERIE. Les codes existants sont ignorés.",
  },
  "depenses": {
    key: "depenses", label: "Dépenses", desc: "Charges et dépenses de la résidence",
    columns: ["date_depense", "montant", "libelle", "code_compte", "categorie", "fournisseur", "facture_reference", "mois"],
    required: ["date_depense", "montant", "libelle"],
    note: "categorie, fournisseur et code_compte sont optionnels — si absents ou introuvables, «ND (non définie)» est utilisé. mois: JAN-DEC.",
  },
  "recettes": {
    key: "recettes", label: "Recettes", desc: "Produits et recettes diverses",
    columns: ["date_recette", "montant", "libelle", "code_compte", "source", "mois"],
    required: ["date_recette", "montant", "libelle", "code_compte"],
    note: "Met à jour la caisse automatiquement. code_compte doit exister dans le plan comptable. mois: JAN-DEC.",
  },
  "appel-charge": {
    key: "appel-charge", label: "Appels de charge", desc: "Appels de charge / fond",
    columns: ["type_charge", "exercice", "periode", "nom_fond", "description_appel", "date_emission"],
    required: ["type_charge", "exercice"],
    note: "type_charge: CHARGE ou FOND. periode: JAN…DEC ou ANNEE.",
  },
  "paiements": {
    key: "paiements", label: "Paiements", desc: "Paiements copropriétaires",
    columns: ["numero_lot", "date_paiement", "montant", "reference", "mois", "mode_paiement"],
    required: ["numero_lot", "montant"],
    note: "Met à jour la caisse automatiquement. mode_paiement: ESPECES, VIREMENT ou CHEQUE.",
  },
};

// Kit = guided import path with tips
const KITS = [
  {
    key: "kit-lots",
    label: "Kit Lots",
    icon: "🏢",
    color: "border-amber-300 bg-amber-50",
    activeColor: "ring-2 ring-amber-400",
    desc: "Lots avec contacts et groupes",
    steps: [
      { dataset: "personnes",  label: "1. Contacts", hint: "Propriétaires à associer", import: true },
      { dataset: null,         label: "2. Groupes",  hint: "Créer via Paramètres → Groupes", import: false },
      { dataset: "lots",       label: "3. Lots",     hint: "Numéros, surfaces, références", import: true },
    ],
    tip: "Groupes et contacts sont optionnels dans le fichier Lots. Si absent ou introuvable, «ND (non définie)» est attribué automatiquement — vous corrigez ensuite manuellement.",
  },
  {
    key: "kit-depenses",
    label: "Kit Dépenses",
    icon: "💸",
    color: "border-rose-300 bg-rose-50",
    activeColor: "ring-2 ring-rose-400",
    desc: "Dépenses avec plan comptable",
    steps: [
      { dataset: "plan-comptable", label: "1. Plan Comptable",  hint: "Codes comptables", import: true },
      { dataset: null,             label: "2. Catégories",      hint: "Via Paramètres → Catégories dépenses", import: false },
      { dataset: null,             label: "3. Fournisseurs",    hint: "Via Paramètres → Fournisseurs", import: false },
      { dataset: "depenses",       label: "4. Dépenses",        hint: "Charges et factures", import: true },
    ],
    tip: "Catégorie, fournisseur et compte sont optionnels. Si vide ou introuvable, «ND (non définie)» est attribué automatiquement.",
  },
  {
    key: "kit-histo",
    label: "Historique Paiements",
    icon: "⟳",
    color: "border-amber-300 bg-amber-50",
    activeColor: "ring-2 ring-amber-500",
    desc: "Régulariser les soldes impayés",
    navigate: true,
    steps: [
      { label: "Appels de charge", hint: "Lots CHARGE impayés", filtre: "CHARGE" },
      { label: "Appels de fond",   hint: "Lots FOND impayés",   filtre: "FOND"   },
    ],
    tip: "Si l'appel de charge ou de fond ne figure pas encore, créez-le d'abord dans Gestion → Appels de charge / Appels de fond et vérifiez le montant dû par lot. Ensuite, cochez les lots avec un solde impayé et cliquez «⟳ Historique» pour créer un paiement de régularisation daté du 1er janvier de l'exercice.",
  },
];

const DATASETS = Object.values(ALL_DATASETS);

// ── Step indicator ──────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Sélection", "Analyse", "Confirmation", "Résultat"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done    = idx < current;
        const active  = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              done   ? "bg-green-100 text-green-700" :
              active ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400" :
                       "bg-slate-100 text-slate-400"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                done   ? "bg-green-500 text-white" :
                active ? "bg-amber-500 text-white" :
                         "bg-slate-200 text-slate-400"
              }`}>
                {done ? "✓" : idx}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${done ? "bg-green-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function ImportPage() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [step,       setStep]      = useState(1);
  const [activeKit,  setActiveKit] = useState("kit-lots");
  const [dataset,    setDataset]   = useState("lots");
  const [file,       setFile]      = useState(null);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState("");
  const [analysis,   setAnalysis]  = useState(null);  // result from validate
  const [imported,   setImported]  = useState(null);  // result from import

  const selectedDs  = ALL_DATASETS[dataset] || DATASETS[0];
  const selectedKit = KITS.find(k => k.key === activeKit) || KITS[0];

  const downloadTemplate = () => {
    const a = document.createElement("a");
    a.href = `/api/import/template/?dataset=${dataset}`;
    a.download = `modele_${dataset}.xlsx`;
    a.click();
  };

  const handleFileChange = e => {
    const f = e.target.files[0] || null;
    setFile(f);
    setAnalysis(null);
    setError("");
  };

  const handleAnalyse = async () => {
    if (!file) { setError("Veuillez sélectionner un fichier Excel (.xlsx)."); return; }
    setLoading(true); setError(""); setAnalysis(null);
    try {
      const fd = new FormData();
      fd.append("dataset", dataset);
      fd.append("action",  "validate");
      fd.append("file",    file);
      const res = await fetch("/api/import/excel/", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur de validation."); return; }
      setAnalysis(data);
      setStep(2);
      if (data.valid_rows > 0) setStep(3);
    } catch { setError("Erreur réseau."); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("dataset", dataset);
      fd.append("action",  "import");
      fd.append("file",    file);
      const res = await fetch("/api/import/excel/", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCsrf() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur lors de l'import."); return; }
      if (data.imported === 0) {
        // Re-validation found no insertable rows — show what went wrong
        setAnalysis(data);
        setStep(data.errors?.length > 0 ? 2 : 1);
        if (data.rows_detected === 0) setError("Le fichier ne contient aucune donnée.");
        else if (data.errors?.length === 0) setError("Aucune ligne à importer (peut-être déjà présentes).");
        return;
      }
      setImported(data);
      setStep(4);
    } catch { setError("Erreur réseau."); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStep(1); setFile(null); setAnalysis(null); setImported(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
    // keep activeKit and dataset so user can re-import same type
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Import des données</h1>
          <p className="text-sm text-slate-500 mt-1">Importez vos données depuis un fichier Excel (.xlsx)</p>
        </div>
      </div>

      <Steps current={step} />

      {/* Step 1 — Sélection */}
      {step === 1 && (
        <div className="space-y-5">

          {/* Kit selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {KITS.map(kit => (
              <button key={kit.key} onClick={() => {
                  setActiveKit(kit.key);
                  if (!kit.navigate) {
                    const firstImport = kit.steps.find(s => s.import);
                    if (firstImport) setDataset(firstImport.dataset);
                  }
                  setFile(null); setError("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  activeKit === kit.key ? `${kit.color} ${kit.activeColor}` : "border-slate-100 bg-white hover:border-slate-200"
                }`}>
                <div className="text-2xl mb-1">{kit.icon}</div>
                <div className="text-sm font-bold text-slate-800">{kit.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{kit.desc}</div>
              </button>
            ))}
          </div>

          {/* ── Kit historique — navigation uniquement ── */}
          {selectedKit.navigate ? (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-1">⟳ Récupérer l'historique des paiements</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ouvrez un appel de charge ou de fond, cochez les lots avec un solde impayé,
                  puis cliquez <strong>«⟳ Historique»</strong> pour créer un paiement de régularisation
                  daté du <strong>1er janvier de l'exercice</strong>.
                </p>
              </div>

              {selectedKit.tip && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                  <p className="text-xs text-amber-800">{selectedKit.tip}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedKit.steps.map(s => (
                  <button
                    key={s.filtre}
                    onClick={() => navigate(`/appels-charge?filtre=${s.filtre}&mode=historique`)}
                    className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition text-left group"
                  >
                    <div>
                      <p className="text-sm font-bold text-amber-800">{s.label}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{s.hint}</p>
                    </div>
                    <span className="text-amber-500 text-xl group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Kit import standard ── */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">

              {/* Kit steps guidance */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Ordre d'import recommandé
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedKit.steps.map((s, idx) => (
                    <div key={s.label} className="flex items-center gap-2">
                      {s.import ? (
                        <button
                          onClick={() => { setDataset(s.dataset); setFile(null); setError(""); if (fileRef.current) fileRef.current.value = ""; }}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold transition text-left ${
                            dataset === s.dataset
                              ? "border-amber-400 bg-amber-50 text-amber-800"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                          }`}>
                          <div>{s.label}</div>
                          <div className="font-normal text-slate-400 mt-0.5">{s.hint}</div>
                        </button>
                      ) : (
                        <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 text-xs text-left opacity-70">
                          <div className="font-semibold text-slate-500">{s.label}</div>
                          <div className="text-slate-400 mt-0.5">{s.hint}</div>
                        </div>
                      )}
                      {idx < selectedKit.steps.length - 1 && (
                        <span className="text-slate-300 text-lg">→</span>
                      )}
                    </div>
                  ))}
                </div>
                {selectedKit.tip && (
                  <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                    <p className="text-xs text-amber-800">{selectedKit.tip}</p>
                  </div>
                )}
              </div>

              {/* Columns info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Colonnes pour : <span className="text-amber-700">{selectedDs.label}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedDs.columns.map(col => (
                    <span key={col} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedDs.required.includes(col)
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {col}{selectedDs.required.includes(col) ? " *" : ""}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400">* Obligatoire — {selectedDs.note}</p>
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <div className="text-sm font-semibold text-blue-800">Télécharger le modèle</div>
                  <div className="text-xs text-blue-500 mt-0.5">Fichier Excel pré-formaté — {selectedDs.label}</div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                  ⬇ Modèle Excel
                </button>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Fichier Excel (.xlsx)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {file && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Fichier sélectionné: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(1)} Ko)
                  </p>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyse}
                  disabled={!file || loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition shadow">
                  {loading ? "Analyse en cours…" : "Analyser le fichier →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 / 3 — Analysis result */}
      {(step === 2 || step === 3) && analysis && (
        <div className="space-y-4">
          {analysis.imported === 0 && analysis.rows_detected > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 font-medium">
              ⚠ Aucun enregistrement importé — les lignes ci-dessous expliquent pourquoi.
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
              <div className="text-3xl font-bold text-slate-700">{analysis.rows_detected}</div>
              <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Lignes détectées</div>
            </div>
            <div className={`bg-white rounded-2xl border p-4 text-center shadow-sm ${
              analysis.valid_rows > 0 ? "border-green-200" : "border-slate-100"}`}>
              <div className={`text-3xl font-bold ${analysis.valid_rows > 0 ? "text-green-600" : "text-slate-400"}`}>
                {analysis.valid_rows}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Lignes valides</div>
            </div>
            <div className={`bg-white rounded-2xl border p-4 text-center shadow-sm ${
              analysis.invalid_rows > 0 ? "border-red-200" : "border-slate-100"}`}>
              <div className={`text-3xl font-bold ${analysis.invalid_rows > 0 ? "text-red-500" : "text-slate-400"}`}>
                {analysis.invalid_rows}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Lignes invalides</div>
            </div>
          </div>

          {/* Errors list */}
          {analysis.errors.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                <span className="text-sm font-bold text-red-700">
                  {analysis.errors.length} erreur{analysis.errors.length > 1 ? "s" : ""} détectée{analysis.errors.length > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-red-400 ml-2">(ces lignes seront ignorées lors de l'import)</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-semibold text-slate-600 w-20">Ligne</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.errors.map((err, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-mono text-red-500 font-bold">{err.row}</td>
                        <td className="px-4 py-2 text-slate-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {analysis.valid_rows === 0 && (
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
              <p className="text-red-600 font-semibold text-sm">Aucune ligne valide à importer.</p>
              <p className="text-red-400 text-xs mt-1">Corrigez les erreurs dans votre fichier et réessayez.</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 justify-between">
            <button onClick={reset}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              ← Recommencer
            </button>
            {analysis.valid_rows > 0 && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition shadow">
                {loading
                  ? "Import en cours…"
                  : `Importer ${analysis.valid_rows} ligne${analysis.valid_rows > 1 ? "s" : ""} →`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Result */}
      {step === 4 && imported && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-800">Import réussi !</h2>
          <p className="text-slate-600">
            <span className="font-bold text-green-600 text-2xl">{imported.imported}</span>
            {" "}enregistrement{imported.imported > 1 ? "s" : ""} importé{imported.imported > 1 ? "s" : ""} avec succès.
          </p>
          {imported.invalid_rows > 0 && (
            <p className="text-xs text-slate-400">
              {imported.invalid_rows} ligne{imported.invalid_rows > 1 ? "s" : ""} ignorée{imported.invalid_rows > 1 ? "s" : ""} (invalides).
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset}
              className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition">
              Nouvel import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

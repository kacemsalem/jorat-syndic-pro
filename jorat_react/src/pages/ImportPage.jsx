import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function getCsrf() {
  return document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1] || "";
}

const DATASET_GROUPS = [
  {
    label: "Référentiel",
    datasets: [
      {
        key: "lots",
        label: "Lots",
        desc: "Appartements, bureaux, locaux…",
        columns: ["numero_lot", "type_lot", "etage_lot", "surface", "montant_ref", "groupe", "proprietaire"],
        required: ["numero_lot"],
        note: "groupe et proprietaire doivent exister dans la résidence.",
      },
      {
        key: "personnes",
        label: "Personnes",
        desc: "Propriétaires et occupants",
        columns: ["nom", "prenom", "telephone", "email", "type_personne"],
        required: ["nom"],
        note: "type_personne: PHYSIQUE ou MORALE",
      },
      {
        key: "plan-comptable",
        label: "Plan Comptable",
        desc: "Comptes comptables de la résidence",
        columns: ["code_compte", "libelle", "type_compte"],
        required: ["code_compte", "libelle"],
        note: "type_compte: CHARGE, PRODUIT ou TRESORERIE. Les codes existants sont ignorés.",
      },
    ],
  },
  {
    label: "Finances",
    datasets: [
      {
        key: "recettes",
        label: "Recettes",
        desc: "Produits et recettes diverses",
        columns: ["date_recette", "montant", "libelle", "code_compte", "source", "mois"],
        required: ["date_recette", "montant", "libelle", "code_compte"],
        note: "Met à jour la caisse automatiquement. code_compte doit exister dans le plan comptable. mois: JAN-DEC.",
      },
      {
        key: "depenses",
        label: "Dépenses",
        desc: "Charges et dépenses de la résidence",
        columns: ["date_depense", "montant", "libelle", "code_compte", "categorie", "fournisseur", "facture_reference", "mois"],
        required: ["date_depense", "montant", "libelle", "code_compte"],
        note: "Met à jour la caisse automatiquement. categorie et fournisseur sont optionnels. mois: JAN-DEC.",
      },
    ],
  },
];

const DATASETS = DATASET_GROUPS.flatMap(g => g.datasets);

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

  const [step,      setStep]      = useState(1);
  const [dataset,   setDataset]   = useState("lots");
  const [file,      setFile]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [analysis,  setAnalysis]  = useState(null);  // result from validate
  const [imported,  setImported]  = useState(null);  // result from import

  const selectedDs = DATASETS.find(d => d.key === dataset);

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
  };

  return (
    <div className="max-w-3xl mx-auto">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">

          {/* Dataset selector */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
              Type de données à importer
            </label>
            {DATASET_GROUPS.map(group => (
              <div key={group.label}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {group.label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {group.datasets.map(ds => (
                    <button
                      key={ds.key}
                      onClick={() => { setDataset(ds.key); setFile(null); setError(""); if (fileRef.current) fileRef.current.value = ""; }}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        dataset === ds.key
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-100 hover:border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-800">{ds.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{ds.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Columns info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Colonnes attendues
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
              <div className="text-xs text-blue-500 mt-0.5">Fichier Excel pré-formaté avec les bons en-têtes</div>
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

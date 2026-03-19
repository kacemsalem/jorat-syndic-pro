import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DATASETS = [
  { key: "residence",      label: "Résidence",             desc: "Informations de la résidence" },
  { key: "groupes",        label: "Groupes / Bâtiments",   desc: "Blocs et bâtiments" },
  { key: "personnes",      label: "Personnes",             desc: "Propriétaires et occupants" },
  { key: "lots",           label: "Lots",                  desc: "Appartements, locaux, etc." },
  { key: "appels",         label: "Appels de charge",      desc: "Appels charges et fonds" },
  { key: "details-appels", label: "Détails appels",        desc: "Dettes par lot" },
  { key: "paiements",      label: "Paiements",             desc: "Encaissements copropriétaires" },
  { key: "affectations",   label: "Affectations",          desc: "Ventilation des paiements" },
  { key: "caisse",         label: "Caisse",                desc: "Journal des mouvements" },
  { key: "depenses",       label: "Dépenses",              desc: "Charges et factures" },
  { key: "recettes",       label: "Recettes",              desc: "Encaissements divers" },
  { key: "bureau",         label: "Bureau Syndical",       desc: "Membres et mandats" },
  { key: "assemblees",     label: "Assemblées Générales",  desc: "AG et statuts" },
  { key: "resolutions",    label: "Résolutions",           desc: "Votes et résultats" },
  { key: "documents",      label: "Documents",             desc: "Documents de gouvernance" },
];

export default function ExportPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(new Set(DATASETS.map(d => d.key)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = key => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const toggleAll = () => {
    setSelected(selected.size === DATASETS.length ? new Set() : new Set(DATASETS.map(d => d.key)));
  };

  const doExport = async (full) => {
    if (!full && selected.size === 0) {
      setError("Sélectionnez au moins un jeu de données.");
      return;
    }
    setLoading(true); setError("");
    try {
      const url = full
        ? "/api/export/excel/?full=true"
        : `/api/export/excel/?datasets=${[...selected].join(",")}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) { setError("Erreur lors de l'export."); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || "export.xlsx";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setError("Erreur réseau."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Export des données</h1>
            <p className="text-sm text-slate-500 mt-1">Téléchargez vos données en format Excel (.xlsx)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Jeux de données</h2>
          <button onClick={toggleAll} className="text-xs text-amber-600 font-semibold hover:underline">
            {selected.size === DATASETS.length ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DATASETS.map(d => (
            <label key={d.key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selected.has(d.key)
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-100 hover:border-slate-200 bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(d.key)}
                onChange={() => toggle(d.key)}
                className="mt-0.5 w-4 h-4 accent-amber-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">{d.label}</div>
                <div className="text-xs text-slate-400">{d.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => doExport(false)}
          disabled={loading || selected.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition shadow"
        >
          {loading ? "Export en cours…" : `Exporter sélection (${selected.size})`}
        </button>
        <button
          onClick={() => doExport(true)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition shadow"
        >
          {loading ? "Export en cours…" : "Export complet"}
        </button>
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const FMT = new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => FMT.format(parseFloat(v) || 0);

function BilanColumn({ title, rows, total, color, borderColor, textColor }) {
  return (
    <div className={`flex-1 bg-white rounded-2xl shadow-sm border-2 ${borderColor} overflow-hidden`}>
      <div className={`px-5 py-3 ${color}`}>
        <h2 className={`font-bold text-sm uppercase tracking-wider ${textColor}`}>{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
            <div>
              <div className="text-sm text-slate-700">{row.label}</div>
              {row.sub && <div className="text-xs text-slate-400 mt-0.5">{row.sub}</div>}
            </div>
            <div className={`font-mono font-semibold text-sm ${row.negative ? "text-red-600" : "text-slate-800"}`}>
              {fmt(row.value)}
            </div>
          </div>
        ))}
      </div>
      <div className={`px-5 py-3 flex items-center justify-between ${color} border-t-2 ${borderColor}`}>
        <span className={`font-bold text-sm ${textColor}`}>TOTAL {title}</span>
        <span className={`font-mono font-bold text-base ${textColor}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

export default function BilanPage() {
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin]     = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set("date_debut", dateDebut);
    if (dateFin)   params.set("date_fin",   dateFin);
    fetch(`/api/comptabilite/bilan/?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateDebut, dateFin]);

  const qParams = new URLSearchParams();
  if (dateDebut) qParams.set("date_debut", dateDebut);
  if (dateFin)   qParams.set("date_fin",   dateFin);

  const actif  = data?.actif  || {};
  const passif = data?.passif || {};
  const resultat = parseFloat(passif.resultat_net || 0);

  const actifRows = [
    { label: "Trésorerie nette",          sub: "Compte 512 — Banque/Trésorerie",         value: actif.tresorerie_nette,  negative: parseFloat(actif.tresorerie_nette) < 0 },
    { label: "Créances copropriétaires",  sub: "Compte 342 — Appels non encore recouvrés", value: actif.creances_copro },
  ];
  const passifRows = [
    { label: "Résultat net de l'exercice", sub: "Produits — Charges",          value: passif.resultat_net, negative: resultat < 0 },
    { label: "Fonds travaux collectés",    sub: "Appels de fonds reçus",       value: passif.fonds_travaux },
    { label: "Avances copropriétaires",   sub: "Total paiements reçus",       value: passif.avances_copro },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/accueil")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium mb-2 transition">← Tableau de bord</button>
          <h1 className="text-2xl font-bold text-slate-800">Bilan simplifié</h1>
          <p className="text-sm text-slate-500 mt-1">Situation patrimoniale de la résidence</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/comptabilite/bilan/excel/?${qParams}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition">
            Excel
          </a>
          <a href={`/api/comptabilite/bilan/pdf/?${qParams}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition">
            PDF
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Du</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Au</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement…</div>
      ) : !data ? null : (
        <div className="flex gap-4">
          <BilanColumn
            title="Actif"
            rows={actifRows}
            total={actif.total}
            color="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
          />
          <BilanColumn
            title="Passif"
            rows={passifRows}
            total={passif.total}
            color="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-800"
          />
        </div>
      )}

      {/* Équilibre note */}
      {data && (
        <div className="text-xs text-slate-400 text-center pt-2">
          Note : Les totaux Actif / Passif peuvent différer en l'absence de centralisation complète des appels de charge.
        </div>
      )}
    </div>
  );
}

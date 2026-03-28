import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const MM = { "01":"Jan","02":"Fév","03":"Mar","04":"Avr","05":"Mai","06":"Jun",
             "07":"Jul","08":"Aoû","09":"Sep","10":"Oct","11":"Nov","12":"Déc" };

const fmtNum = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 0 });

export default function ChartDepenses({ depenses }) {
  const [filterCat, setFilterCat] = useState("");

  const catList = useMemo(() =>
    [...new Set(depenses.map(d => d.modele_categorie_nom || d.categorie_nom).filter(Boolean))].sort()
  , [depenses]);

  const data = useMemo(() => {
    const monthMap = new Map();
    depenses.forEach(d => {
      const key = (d.date_depense || "").slice(0, 7);
      if (!key) return;
      if (!monthMap.has(key)) monthMap.set(key, { total: 0, cat: 0 });
      const amt = parseFloat(d.montant) || 0;
      const entry = monthMap.get(key);
      entry.total += amt;
      const dCat = d.modele_categorie_nom || d.categorie_nom || "";
      if (!filterCat || dCat === filterCat) entry.cat += amt;
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [yr, mm] = key.split("-");
        return {
          label:    `${MM[mm] ?? mm} ${yr.slice(2)}`,
          total:    Math.round(v.total * 100) / 100,
          categorie: Math.round(v.cat  * 100) / 100,
        };
      });
  }, [depenses, filterCat]);

  if (data.length === 0)
    return <p className="text-center text-slate-400 text-sm py-8">Aucune donnée</p>;

  return (
    <div>
      {/* Category filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400 text-slate-600"
        >
          <option value="">Toutes les catégories</option>
          {catList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterCat && (
          <button
            onClick={() => setFilterCat("")}
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }} barGap={2} barSize={filterCat ? 10 : 18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} />
          <YAxis tickFormatter={fmtNum} tick={{ fontSize: 9, fill: "#94a3b8" }} width={62} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v, name) => [fmtNum(v) + " MAD", name === "total" ? "Total" : (filterCat || "Catégorie")]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11, padding: "6px 10px" }}
            labelStyle={{ fontWeight: 600, color: "#334155", fontSize: 11 }}
          />
          <Bar dataKey="total"     name="total"     fill="#bfdbfe" radius={[3,3,0,0]} />
          {filterCat && (
            <Bar dataKey="categorie" name="categorie" fill="#2563EB" radius={[3,3,0,0]} />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-200" />
          <span className="text-[11px] text-slate-500">Total</span>
        </div>
        {filterCat && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-600" />
            <span className="text-[11px] text-slate-600 font-semibold truncate max-w-[140px]">{filterCat}</span>
          </div>
        )}
      </div>
    </div>
  );
}

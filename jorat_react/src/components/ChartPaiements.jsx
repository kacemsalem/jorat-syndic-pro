import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = { PAYE: "#10b981", PARTIEL: "#f59e0b", NON_PAYE: "#ef4444" };
const LABELS = { PAYE: "Soldés", PARTIEL: "Partiels", NON_PAYE: "Non payés" };

const fmtNum = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 0 });

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const rad = (midAngle * Math.PI) / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text x={cx - r * Math.cos(rad)} y={cy - r * Math.sin(rad)}
      textAnchor="middle" dominantBaseline="central"
      fill="white" fontSize={11} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  );
};

export default function ChartPaiements() {
  const [data,    setData]    = useState(null);
  const [amounts, setAmounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rapport-financier/", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const lots = d.situation_lots || [];
        let counts = { PAYE: 0, PARTIEL: 0, NON_PAYE: 0 };
        let amts   = { PAYE: 0, PARTIEL: 0, NON_PAYE: 0 };
        lots.forEach(l => {
          const du    = parseFloat(l.total_du   || 0);
          const payed = parseFloat(l.total_paye || 0);
          const reste = parseFloat(l.reste      || 0);
          if (du <= 0) return;
          if (reste <= 0)      { counts.PAYE++;    amts.PAYE    += payed; }
          else if (payed > 0)  { counts.PARTIEL++; amts.PARTIEL += payed; }
          else                 { counts.NON_PAYE++; }
        });
        setData(
          Object.keys(LABELS)
            .filter(k => counts[k] > 0)
            .map(k => ({ key: k, name: LABELS[k], value: counts[k] }))
        );
        setAmounts(amts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      Chargement…
    </div>
  );
  if (!data || data.length === 0)
    return <p className="text-center text-slate-400 text-sm py-8">Aucune donnée de paiement</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={52} outerRadius={82}
            dataKey="value"
            stroke="none"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map(entry => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, _, p) => [`${v} lot${v > 1 ? "s" : ""} — ${fmtNum(amounts?.[p.payload.key] ?? 0)} MAD`, p.payload.name]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11, padding: "6px 10px" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend + KPIs */}
      <div className="flex justify-center gap-4 flex-wrap mt-1">
        {data.map(d => (
          <div key={d.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[d.key] }} />
            <span className="text-[11px] text-slate-600 font-medium">
              {d.name}
              <span className="ml-1 text-slate-400 font-normal">
                ({d.value} / {total})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

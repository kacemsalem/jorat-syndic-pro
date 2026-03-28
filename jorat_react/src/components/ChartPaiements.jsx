import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = { PAYE: "#10b981", PARTIEL: "#f59e0b", NON_PAYE: "#ef4444" };
const LABELS = { PAYE: "Soldés", PARTIEL: "Partiels", NON_PAYE: "Impayés" };

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null;
  const rad = (midAngle * Math.PI) / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text x={cx - r * Math.cos(rad)} y={cy - r * Math.sin(rad)}
      textAnchor="middle" dominantBaseline="central"
      fill="white" fontSize={10} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  );
};

export default function ChartPaiements({ typeCharge, year }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `?type_charge=${typeCharge}&year=${year}`;
    fetch(`/api/situation-paiements/${qs}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const lots = d.lots || [];
        let counts = { PAYE: 0, PARTIEL: 0, NON_PAYE: 0 };
        lots.forEach(l => {
          const du      = parseFloat(l.total_du || 0);
          if (du <= 0) return;
          const paid    = (l.paiements || []).reduce((s, p) => s + parseFloat(p.montant || 0), 0);
          if (paid >= du - 0.01)   counts.PAYE++;
          else if (paid > 0)       counts.PARTIEL++;
          else                     counts.NON_PAYE++;
        });
        setData(
          Object.keys(LABELS)
            .filter(k => counts[k] > 0)
            .map(k => ({ key: k, name: LABELS[k], value: counts[k] }))
        );
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [typeCharge, year]);

  if (loading) return (
    <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
      <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data || data.length === 0)
    return <p className="text-center text-slate-400 text-xs py-6">Aucune donnée</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%"
            innerRadius={42} outerRadius={68}
            dataKey="value" stroke="none"
            labelLine={false} label={CustomLabel}>
            {data.map(entry => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, _, p) => [`${v} lot${v > 1 ? "s" : ""}`, p.payload.name]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11, padding: "6px 10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col items-start gap-1 mt-1 px-1">
        {data.map(d => (
          <div key={d.key} className="flex items-center gap-1.5 w-full justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[d.key] }} />
              <span className="text-[10px] text-slate-600 font-medium">{d.name}</span>
            </div>
            <span className="text-[10px] text-slate-400">{d.value} / {total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

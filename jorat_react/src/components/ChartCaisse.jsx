import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const MM = { "01":"Jan","02":"Fév","03":"Mar","04":"Avr","05":"Mai","06":"Jun",
             "07":"Jul","08":"Aoû","09":"Sep","10":"Oct","11":"Nov","12":"Déc" };

const fmtNum = (v) => Number(v).toLocaleString("fr-MA", { minimumFractionDigits: 0 });

export default function ChartCaisse({ mouvements }) {
  const data = useMemo(() => {
    const sorted = [...mouvements]
      .filter(m => m.date_mouvement)
      .sort((a, b) => a.date_mouvement.localeCompare(b.date_mouvement));
    let running = 0;
    const monthMap = new Map();
    sorted.forEach(m => {
      const amt = parseFloat(m.montant) || 0;
      running = m.sens === "DEBIT" ? running + amt : running - amt;
      const key = m.date_mouvement.slice(0, 7);
      monthMap.set(key, Math.round(running * 100) / 100);
    });
    return Array.from(monthMap.entries()).map(([key, balance]) => {
      const [yr, mm] = key.split("-");
      return { label: `${MM[mm] ?? mm} ${yr.slice(2)}`, balance };
    });
  }, [mouvements]);

  if (data.length === 0)
    return <p className="text-center text-slate-400 text-sm py-8">Aucune donnée</p>;

  const isPositive = data[data.length - 1]?.balance >= 0;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="caisseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={isPositive ? "#2563EB" : "#ef4444"} stopOpacity={0.18} />
            <stop offset="95%" stopColor={isPositive ? "#2563EB" : "#ef4444"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} />
        <YAxis tickFormatter={fmtNum} tick={{ fontSize: 9, fill: "#94a3b8" }} width={62} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v) => [fmtNum(v) + " MAD", "Solde"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11, padding: "6px 10px" }}
          labelStyle={{ fontWeight: 600, color: "#334155", fontSize: 11 }}
        />
        <Area
          type="monotone" dataKey="balance"
          stroke={isPositive ? "#2563EB" : "#ef4444"}
          strokeWidth={2}
          fill="url(#caisseGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

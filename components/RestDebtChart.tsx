import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DebtData {
  name: string;
  debt: number;
}

interface RestDebtChartProps {
  data: DebtData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="liquid-glass p-3 rounded-2xl border-white shadow-xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Долг (Rest Debt)</p>
        <p className="text-sm font-black text-rose-600">
          {payload[0].value.toFixed(1)}ч к возврату
        </p>
      </div>
    );
  }
  return null;
};

const RestDebtChart: React.FC<RestDebtChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            hide
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="debt" 
            stroke="#f43f5e" 
            strokeWidth={4} 
            fillOpacity={1} 
            fill="url(#colorDebt)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RestDebtChart;

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DebtData {
  name: string;
  debt: number;
}

interface RestDebtChartProps {
  data: DebtData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="ios-glass p-4 rounded-3xl border-white shadow-2xl animate-in zoom-in duration-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">{label}</p>
        <p className="text-sm font-bold text-rose-600">
          {payload[0].value.toFixed(1)}ч к возврату
        </p>
      </div>
    );
  }
  return null;
};

// Функция для получения цвета в зависимости от величины долга
const getDebtColor = (hours: number) => {
  if (hours >= 15) return '#e11d48'; // Насыщенный красный (большой долг)
  if (hours >= 5) return '#fb7185';  // Розовый (средний)
  return '#fda4af'; // Светло-розовый (небольшой)
};

const RestDebtChart: React.FC<RestDebtChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(244, 63, 94, 0.05)', radius: 15 }}
          />
          <Bar 
            dataKey="debt" 
            radius={[12, 12, 12, 12]} 
            fillOpacity={0.6}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-debt-${index}`} 
                fill={getDebtColor(entry.debt)}
                className="filter drop-shadow-sm"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RestDebtChart;

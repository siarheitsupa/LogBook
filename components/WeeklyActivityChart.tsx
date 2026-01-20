import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WeeklyData {
  day: string;
  driving: number;
  work: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="liquid-glass p-4 rounded-3xl border-white shadow-2xl animate-in zoom-in duration-200 min-w-[140px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Вождение</span>
            <span className="text-sm font-black text-blue-600">{payload[0].value}ч</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Работа</span>
            <span className="text-sm font-black text-orange-500">{payload[1].value}ч</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Функция для получения цвета в зависимости от нагрузки вождения
const getBarColor = (hours: number) => {
  if (hours >= 9) return '#8b5cf6'; // Фиолетовый (тяжелый день)
  if (hours >= 4.5) return '#6366f1'; // Индиго (средний)
  return '#3b82f6'; // Синий (легкий)
};

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          barGap={6}
        >
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 20 }}
          />
          
          {/* Столбик вождения */}
          <Bar 
            dataKey="driving" 
            radius={[12, 12, 12, 12]} 
            fillOpacity={0.7}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-drive-${index}`} 
                fill={getBarColor(entry.driving)} 
                className="filter drop-shadow-sm transition-all duration-500"
              />
            ))}
          </Bar>

          {/* Столбик прочей работы (молотки) */}
          <Bar 
            dataKey="work" 
            fill="#f59e0b" 
            radius={[12, 12, 12, 12]} 
            fillOpacity={0.5}
            className="filter drop-shadow-sm transition-all duration-500"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyActivityChart;
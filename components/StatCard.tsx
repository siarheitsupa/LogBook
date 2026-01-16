import React, { useMemo } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  // Генерация случайной задержки для асинхронного парения
  const animationDelay = useMemo(() => `${(Math.random() * -4).toFixed(2)}s`, []);

  const styles = {
    yellow: 'bg-amber-100/80 text-amber-900 border-amber-200 shadow-amber-200/40',
    green: 'bg-emerald-100/80 text-emerald-900 border-emerald-200 shadow-emerald-200/40',
    blue: 'bg-blue-100/80 text-blue-900 border-blue-200 shadow-blue-200/40',
    purple: 'bg-purple-100/80 text-purple-900 border-purple-200 shadow-purple-200/40',
    orange: 'bg-orange-100/80 text-orange-900 border-orange-200 shadow-orange-200/40',
    indigo: 'bg-indigo-100/80 text-indigo-900 border-indigo-200 shadow-indigo-200/40',
  };

  return (
    <div 
      className={`p-5 rounded-[2rem] border shadow-xl flex flex-col items-center justify-center text-center transition-all hover:scale-105 active:scale-95 animate-float backdrop-blur-sm ${styles[variant]}`}
      style={{ animationDelay }}
    >
      <span className="text-3xl font-black mb-1 tracking-tighter tabular-nums drop-shadow-sm">
        {value}
      </span>
      <span className="text-[10px] font-black leading-tight opacity-70 uppercase tracking-widest px-2">
        {label}
      </span>
      {sublabel && (
        <span className="text-[9px] mt-1.5 italic opacity-50 font-bold bg-white/30 px-2 py-0.5 rounded-full">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default StatCard;
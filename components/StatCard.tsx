import React, { useMemo } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  const animationDelay = useMemo(() => `${(Math.random() * -5).toFixed(2)}s`, []);

  const styles = {
    yellow: 'bg-amber-400/10 text-amber-900 border-amber-200/50 shadow-amber-200/20',
    green: 'bg-emerald-400/10 text-emerald-900 border-emerald-200/50 shadow-emerald-200/20',
    blue: 'bg-blue-400/10 text-blue-900 border-blue-200/50 shadow-blue-200/20',
    purple: 'bg-purple-400/10 text-purple-900 border-purple-200/50 shadow-purple-200/20',
    orange: 'bg-orange-400/10 text-orange-900 border-orange-200/50 shadow-orange-200/20',
    indigo: 'bg-indigo-400/10 text-indigo-900 border-indigo-200/50 shadow-indigo-200/20',
  };

  return (
    <div 
      className={`p-6 rounded-[2.5rem] border shadow-2xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.03] active:scale-95 animate-float backdrop-blur-xl ${styles[variant]}`}
      style={{ animationDelay }}
    >
      <span className="text-3xl font-black mb-1.5 tracking-tighter tabular-nums text-slate-900 drop-shadow-md">
        {value}
      </span>
      <span className="text-[10px] font-black leading-tight opacity-60 uppercase tracking-widest px-2 mb-2">
        {label}
      </span>
      {sublabel && (
        <span className="text-[9px] font-black bg-white/60 text-slate-500 px-3 py-1 rounded-full shadow-sm border border-white/40">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default React.memo(StatCard);
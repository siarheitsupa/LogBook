import React, { useMemo } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo' | 'rose' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  const animationDelay = useMemo(() => `${(Math.random() * -5).toFixed(2)}s`, []);

  const styles = {
    yellow: 'bg-amber-400/5 text-amber-900 border-amber-100/50 shadow-amber-100/10',
    green: 'bg-emerald-400/5 text-emerald-900 border-emerald-100/50 shadow-emerald-100/10',
    blue: 'bg-blue-400/5 text-blue-900 border-blue-100/50 shadow-blue-100/10',
    purple: 'bg-purple-400/5 text-purple-900 border-purple-100/50 shadow-purple-100/10',
    orange: 'bg-orange-400/5 text-orange-900 border-orange-100/50 shadow-orange-100/10',
    indigo: 'bg-indigo-400/5 text-indigo-900 border-indigo-100/50 shadow-indigo-100/10',
    rose: 'bg-rose-400/5 text-rose-900 border-rose-100/50 shadow-rose-100/10',
    emerald: 'bg-emerald-500/10 text-emerald-900 border-emerald-200/50 shadow-emerald-100/10',
  };

  return (
    <div 
      className={`p-4 rounded-[2rem] border shadow-lg flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] active:scale-95 animate-float backdrop-blur-md ${styles[variant]}`}
      style={{ animationDelay }}
    >
      <span className="text-xl font-black mb-1 tracking-tighter tabular-nums text-slate-800">
        {value}
      </span>
      <span className="text-[9px] font-black leading-tight opacity-50 uppercase tracking-widest px-1 mb-1.5 h-6 flex items-center">
        {label}
      </span>
      {sublabel && (
        <span className="text-[8px] font-black bg-white/80 text-slate-400 px-2 py-0.5 rounded-full border border-white/40 whitespace-nowrap">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default React.memo(StatCard);
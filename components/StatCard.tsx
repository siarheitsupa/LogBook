
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
    yellow: 'bg-amber-100/40 text-amber-900',
    green: 'bg-emerald-100/40 text-emerald-900',
    blue: 'bg-blue-100/40 text-blue-900',
    purple: 'bg-purple-100/40 text-purple-900',
    orange: 'bg-orange-100/40 text-orange-900',
    indigo: 'bg-indigo-100/40 text-indigo-900',
    rose: 'bg-rose-100/40 text-rose-900',
    emerald: 'bg-emerald-100/40 text-emerald-900',
  };

  return (
    <div 
      className={`p-5 rounded-[2.2rem] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] active:scale-95 animate-float ios-glass ${styles[variant]}`}
      style={{ animationDelay }}
    >
      <span className="text-2xl font-bold mb-1 tracking-tighter tabular-nums text-slate-800">
        {value}
      </span>
      <span className="text-[10px] font-bold leading-tight opacity-50 uppercase tracking-widest px-1 mb-2 h-5 flex items-center">
        {label}
      </span>
      {sublabel && (
        <span className="text-[9px] font-bold bg-white/60 text-slate-500 px-3 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default React.memo(StatCard);

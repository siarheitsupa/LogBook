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
    yellow: 'bg-gradient-to-br from-amber-500/10 to-amber-400/5 text-amber-900 border-amber-200/60 shadow-amber-200/20',
    green: 'bg-gradient-to-br from-emerald-500/10 to-emerald-400/5 text-emerald-900 border-emerald-200/60 shadow-emerald-200/20',
    blue: 'bg-gradient-to-br from-blue-500/10 to-blue-400/5 text-blue-900 border-blue-200/60 shadow-blue-200/20',
    purple: 'bg-gradient-to-br from-purple-500/10 to-purple-400/5 text-purple-900 border-purple-200/60 shadow-purple-200/20',
    orange: 'bg-gradient-to-br from-orange-500/10 to-orange-400/5 text-orange-900 border-orange-200/60 shadow-orange-200/20',
    indigo: 'bg-gradient-to-br from-indigo-500/10 to-indigo-400/5 text-indigo-900 border-indigo-200/60 shadow-indigo-200/20',
    rose: 'bg-gradient-to-br from-rose-500/10 to-rose-400/5 text-rose-900 border-rose-200/60 shadow-rose-200/20',
    emerald: 'bg-gradient-to-br from-emerald-500/15 to-emerald-400/10 text-emerald-900 border-emerald-300/60 shadow-emerald-200/20',
  };
 
  return (
    <div 
      className={`liquid-glass p-4 rounded-[2rem] border backdrop-blur-xl shadow-xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] active:scale-95 animate-float relative overflow-hidden ${styles[variant]}`}
      style={{ animationDelay }}
    >
      {/* Эффект свечения */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      <span className="text-xl font-black mb-1 tracking-tighter tabular-nums text-slate-800 relative z-10">
        {value}
      </span>
      <span className="text-[9px] font-black leading-tight opacity-50 uppercase tracking-widest px-1 mb-1.5 h-6 flex items-center relative z-10">
        {label}
      </span>
      {sublabel && (
        <span className="text-[8px] font-black bg-white/90 text-slate-500 px-2 py-0.5 rounded-full border border-white/60 whitespace-nowrap backdrop-blur-sm relative z-10">
          {sublabel}
        </span>
      )}
    </div>
  );
};
 
export default React.memo(StatCard);


import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'orange' | 'green' | 'blue' | 'indigo' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  const styles = {
    yellow: 'bg-amber-50 text-amber-900 border-amber-100',
    orange: 'bg-orange-50 text-orange-900 border-orange-100',
    green: 'bg-emerald-50 text-emerald-900 border-emerald-100',
    blue: 'bg-blue-50 text-blue-900 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-100',
    purple: 'bg-purple-50 text-purple-900 border-purple-100',
  };

  const labelColors = {
    yellow: 'text-amber-700',
    orange: 'text-orange-700',
    green: 'text-emerald-700',
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
    purple: 'text-purple-700',
  };

  return (
    <div className={`p-6 rounded-[2.5rem] border shadow-sm flex flex-col items-center justify-center text-center transition-all active:scale-95 ${styles[variant]}`}>
      <span className="text-3xl font-black mb-1 tracking-tighter tabular-nums">
        {value}
      </span>
      <span className={`text-[10px] font-black leading-tight uppercase tracking-widest mb-1 ${labelColors[variant]}`}>
        {label}
      </span>
      {sublabel && (
        <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default React.memo(StatCard);

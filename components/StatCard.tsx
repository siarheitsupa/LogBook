
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo' | 'rose' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  const styles = {
    yellow: 'bg-[#fefce8] text-[#854d0e] border-[#fef9c3]',
    green: 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]',
    blue: 'bg-[#eff6ff] text-[#1e40af] border-[#dbeafe]',
    purple: 'bg-[#faf5ff] text-[#6b21a8] border-[#f3e8ff]',
    orange: 'bg-[#fff7ed] text-[#9a3412] border-[#ffedd5]',
    indigo: 'bg-[#eef2ff] text-[#3730a3] border-[#e0e7ff]',
    rose: 'bg-[#fff1f2] text-[#9f1239] border-[#ffe4e6]',
    emerald: 'bg-[#ecfdf5] text-[#065f46] border-[#d1fae5]',
  };

  const pillStyles = {
    yellow: 'bg-white text-[#ca8a04]',
    green: 'bg-white text-[#16a34a]',
    blue: 'bg-white text-[#3b82f6]',
    purple: 'bg-white text-[#9333ea]',
    orange: 'bg-white text-[#ea580c]',
    rose: 'bg-white text-[#e11d48]',
    emerald: 'bg-white text-[#10b981]',
    indigo: 'bg-white text-[#6366f1]',
  };

  return (
    <div className={`p-8 rounded-[2.8rem] border shadow-sm flex flex-col items-center justify-center text-center transition-all active:scale-95 ${styles[variant]}`}>
      <span className="text-3xl font-black mb-1.5 tracking-tighter tabular-nums text-slate-800">
        {value}
      </span>
      <span className="text-[10px] font-black leading-tight uppercase tracking-widest mb-3 opacity-60">
        {label}
      </span>
      {sublabel && (
        <span className={`text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-black/5 shadow-sm ${pillStyles[variant]}`}>
          {sublabel}
        </span>
      )}
    </div>
  );
};

export default React.memo(StatCard);

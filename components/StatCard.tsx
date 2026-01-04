
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  variant: 'yellow' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant }) => {
  const styles = {
    yellow: 'bg-amber-100 text-amber-900',
    green: 'bg-emerald-100 text-emerald-900',
    blue: 'bg-blue-100 text-blue-900',
    purple: 'bg-purple-100 text-purple-900',
    orange: 'bg-orange-100 text-orange-900',
    indigo: 'bg-indigo-100 text-indigo-900',
  };

  return (
    <div className={`p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center transition-transform active:scale-95 ${styles[variant]}`}>
      <span className="text-2xl font-bold mb-1 tracking-tight">{value}</span>
      <span className="text-[10px] font-bold leading-tight opacity-80 uppercase tracking-wider">
        {label}
      </span>
      {sublabel && <span className="text-[9px] mt-1 italic opacity-60 font-medium">{sublabel}</span>}
    </div>
  );
};

export default StatCard;

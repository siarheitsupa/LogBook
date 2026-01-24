
import React, { useState } from 'react';
import { WeekGroupData, formatMinsToHHMM } from '../utils/timeUtils';

interface WeekGroupProps {
  group: WeekGroupData;
  children: React.ReactNode;
}

const WeekGroup: React.FC<WeekGroupProps> = ({ group, children }) => {
  const [isOpen, setIsOpen] = useState(group.isCurrentWeek);
  
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const limitMins = 56 * 60; // 56 часов
  const percent = Math.min(100, (group.totalDriveMins / limitMins) * 100);
  
  // Цвет прогресс-бара
  let progressColor = 'bg-emerald-500';
  if (percent > 90) progressColor = 'bg-rose-500';
  else if (percent > 75) progressColor = 'bg-amber-400';

  return (
    <div className="mb-8 last:mb-0">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`ios-glass rounded-[2.5rem] p-5 cursor-pointer transition-all duration-300 relative overflow-hidden group ${isOpen ? 'mb-4 shadow-lg' : 'hover:scale-[1.01]'}`}
      >
        <div className="flex justify-between items-center relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${group.isCurrentWeek ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight ml-1">
                {formatDate(group.weekStart)} — {formatDate(group.weekEnd)}
              </h3>
            </div>
            <div className="flex items-center gap-2 ml-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Вождение: <span className="text-slate-800">{formatMinsToHHMM(group.totalDriveMins)}</span> / 56:00
              </span>
            </div>
          </div>
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/40 transition-transform duration-300 backdrop-blur-md ${isOpen ? 'rotate-180' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100/50">
           <div 
             className={`h-full ${progressColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
             style={{ width: `${percent}%` }}
           ></div>
        </div>
        
        {/* Индикатор превышения */}
        {!isOpen && percent > 100 && (
           <div className="absolute top-4 right-14">
             <span className="flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
             </span>
           </div>
        )}
      </div>

      <div className={`space-y-4 transition-all duration-500 ease-in-out px-1 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 h-0 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

export default WeekGroup;

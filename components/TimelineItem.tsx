import React, { useState } from 'react';
import { ShiftWithRest, Shift } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onToggleCompensation?: (shift: Shift) => void;
  isInitiallyExpanded?: boolean;
}

const DrivingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
    <circle cx="12" cy="12" r="10"/><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 2l0 7"/><path d="M12 15l0 7"/><path d="M2 12l7 0"/><path d="M15 12l7 0"/>
  </svg>
);

const WorkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
    <path d="M15.5 10.5 L19 7 L21 9 L17.5 12.5 Z" />
    <path d="M17.5 10.5 L10 18" />
    <path d="M8.5 10.5 L5 7 L3 9 L6.5 12.5 Z" />
    <path d="M6.5 10.5 L14 18" />
  </svg>
);

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete, onToggleCompensation, isInitiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const duration = calculateShiftDurationMins(shift);
  const isOverdue = shift.restBefore?.compensationDeadline && 
                    Date.now() > shift.restBefore.compensationDeadline && 
                    !shift.restBefore.isCompensated;

  const getRestLabel = () => {
    if (!shift.restBefore) return "";
    const hours = shift.restBefore.durationHours + (shift.restBefore.durationMinutes / 60);
    
    if (hours > 144) return "Длительный перерыв / Отпуск";
    if (shift.restBefore.type === 'long_pause') return "Длительная пауза / Ожидание";
    
    if (hours >= 45) return "Регулярный недельный отдых";
    if (shift.restBefore.type === 'weekly_reduced') return "Сокращенный недельный отдых";
    if (hours >= 11) return "Регулярный ежедневный отдых";
    return "Сокращенный ежедневный отдых";
  };

  const getRestColors = () => {
    if (!shift.restBefore) return "";
    if (shift.restBefore.isCompensated) return "border-emerald-200 text-emerald-600 bg-emerald-50/20 grayscale-[0.5]";
    if (isOverdue) return "border-rose-500 text-rose-700 bg-rose-50 animate-pulse border-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    
    const hours = shift.restBefore.durationHours;
    if (hours > 144) return "border-slate-200 text-slate-500 bg-slate-50/50";
    if (shift.restBefore.type === 'long_pause') return "border-slate-200 text-slate-400 bg-slate-50/20";
    if (hours >= 45) return "border-emerald-200/50 text-emerald-600 bg-emerald-50/30";
    if (shift.restBefore.type === 'weekly_reduced') return "border-orange-300 text-orange-700 bg-orange-50/50 border-l-8";
    return "border-blue-200/50 text-blue-600 bg-blue-50/30";
  };

  return (
    <div className="group space-y-3 mb-6 last:mb-0">
      {shift.restBefore && (
        <div className={`liquid-glass mx-6 py-4 px-6 rounded-[2rem] text-center relative border transition-all ${getRestColors()}`}>
          <div className="flex flex-col items-center">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">
              {shift.restBefore.isCompensated && "✅ КОРРЕКТНО "}
              {getRestLabel()}
            </span>
            <span className="text-xl font-black tabular-nums tracking-tight">
              {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
            </span>
            
            {shift.restBefore.type === 'weekly_reduced' && !shift.restBefore.isCompensated && (
              <div className="mt-2 w-full pt-2 border-t border-orange-200/50 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                  <span className="text-rose-500">Долг: {Math.round(shift.restBefore.debtHours * 10) / 10}ч</span>
                  <span className={isOverdue ? 'text-rose-600 underline' : 'text-slate-500'}>
                    До: {new Date(shift.restBefore.compensationDeadline!).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <button 
                  onClick={() => onToggleCompensation && onToggleCompensation(shift)}
                  className="w-full mt-2 py-2 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md"
                >
                  Отметить как компенсированный
                </button>
              </div>
            )}

            {shift.restBefore.isCompensated && (
               <button 
                onClick={() => onToggleCompensation && onToggleCompensation(shift)}
                className="mt-2 text-[8px] font-black uppercase text-slate-400 underline"
               >
                 Отменить компенсацию
               </button>
            )}
          </div>
        </div>
      )}

      <div className="liquid-glass rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:shadow-2xl border-white/60">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-6 flex justify-between items-center cursor-pointer hover:bg-white/40 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-900 tracking-tight">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                {shift.startTime} — {shift.endTime}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <div className="flex gap-3">
                <span className="flex items-center text-sm font-black text-amber-600 tracking-tight">
                  <WorkIcon />
                  {shift.workHours}ч {shift.workMinutes}м
                </span>
                <span className="flex items-center text-sm font-black text-blue-600 tracking-tight">
                  <DrivingIcon />
                  {shift.driveHours}ч {shift.driveMinutes}м
                </span>
              </div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter opacity-50 mt-0.5">СМЕНА: {formatMinsToHHMM(duration)}</span>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-md shadow-inner transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 pb-6 px-6' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
          <div className="overflow-hidden">
            <div className="pt-2 flex justify-end items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                className="flex items-center gap-2.5 px-6 py-4 bg-blue-500 text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-200"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Изменить
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                className="flex items-center gap-2.5 px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl hover:bg-rose-100 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineItem);
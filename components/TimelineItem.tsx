
import React, { useState } from 'react';
import { ShiftWithRest, Shift } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onAddExpense?: (shiftId: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete, onAddExpense }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const duration = calculateShiftDurationMins(shift);

  const getRestLabel = () => {
    if (!shift.restBefore) return "";
    const hours = shift.restBefore.durationHours + (shift.restBefore.durationMinutes / 60);
    if (hours >= 45) return "РЕГУЛЯРНЫЙ ЕЖЕНЕДЕЛЬНЫЙ ОТДЫХ";
    if (shift.restBefore.type === 'weekly_reduced') return "КОРРЕКТНО СОКРАЩЕННЫЙ НЕДЕЛЬНЫЙ ОТДЫХ";
    if (shift.restBefore.type === 'long_pause') return "ДЛИТЕЛЬНАЯ ПАУЗА / ОЖИДАНИЕ";
    return "РЕГУЛЯРНЫЙ ЕЖЕДНЕВНЫЙ ОТДЫХ";
  };

  const getRestStyles = () => {
    if (!shift.restBefore) return "";
    const hours = shift.restBefore.durationHours;
    if (hours >= 45) return "bg-[#eff6ff] border-[#dbeafe] text-[#1e40af]";
    if (shift.restBefore.type === 'weekly_reduced') return "bg-[#f0fdf4] border-[#dcfce7] text-[#166534]";
    return "bg-[#eff6ff] border-[#dbeafe] text-[#1e40af]";
  };

  return (
    <div className="space-y-4 mb-6">
      {shift.restBefore && (
        <div className={`mx-4 py-5 px-8 rounded-[2.5rem] border text-center shadow-lg shadow-slate-200/10 ${getRestStyles()}`}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60">
            {getRestLabel()}
          </div>
          <div className="text-2xl font-black tabular-nums tracking-tight">
            {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
          </div>
          {shift.restBefore.type === 'weekly_reduced' && (
            <button className="mt-2 text-[8px] font-black uppercase tracking-widest underline opacity-60">ОТМЕНИТЬ КОМПЕНСАЦИЮ</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-[2.8rem] p-8 shadow-2xl shadow-slate-200/30 border border-slate-50 transition-all active:scale-[0.99]">
        <div className="flex justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </div>
            <div className="text-[11px] font-black text-slate-300 uppercase tracking-widest tabular-nums">
              {shift.startTime} — {shift.endTime}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex gap-4 text-blue-600 font-black text-sm tracking-tight mb-1">
                <span className="flex items-center gap-1.5">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                   {shift.driveHours}ч
                </span>
                <span className="flex items-center gap-1.5 text-orange-500">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/></svg>
                   {shift.workHours || 0}ч
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                СМЕНА: {formatMinsToHHMM(duration)}
              </div>
            </div>
            <div className={`w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 animate-in fade-in zoom-in duration-300">
             <button 
                onClick={(e) => { e.stopPropagation(); onAddExpense && onAddExpense(shift.id); }}
                className="w-full bg-white border border-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm active:bg-slate-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 12h.01"/></svg>
                + Расход
              </button>
            <div className="flex gap-3">
              <button onClick={(e) => { e.stopPropagation(); onEdit(shift); }} className="flex-[2] bg-[#0f172a] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">ИЗМЕНИТЬ</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }} className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">УДАЛИТЬ</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TimelineItem);

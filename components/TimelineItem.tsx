import React, { useState, useMemo } from 'react';
import { ShiftWithRest, Shift, Currency } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onToggleCompensation?: (shift: Shift) => void;
  onAddExpense?: (shiftId: string) => void;
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

const WalletIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete, onToggleCompensation, onAddExpense, isInitiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const duration = calculateShiftDurationMins(shift);
  const isOverdue = shift.restBefore?.compensationDeadline && 
                    Date.now() > shift.restBefore.compensationDeadline && 
                    !shift.restBefore.isCompensated;

  const expensesSummary = useMemo(() => {
    if (!shift.expenses || shift.expenses.length === 0) return null;
    const totals: Record<string, number> = {};
    shift.expenses.forEach(e => {
      totals[e.currency] = (totals[e.currency] || 0) + e.amount;
    });
    return Object.entries(totals).map(([cur, val]) => `${Math.round(val)} ${cur}`).join(', ');
  }, [shift.expenses]);

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
    if (shift.restBefore.isCompensated) return "border-emerald-200 text-emerald-600 bg-emerald-50/20";
    if (isOverdue) return "border-rose-500 text-rose-700 bg-rose-50 border-2 animate-pulse shadow-lg shadow-rose-100";
    const hours = shift.restBefore.durationHours;
    if (hours >= 45) return "border-emerald-100 text-emerald-600 bg-emerald-50/30";
    if (shift.restBefore.type === 'weekly_reduced') return "border-orange-200 text-orange-700 bg-orange-50/50";
    return "border-blue-100 text-blue-600 bg-blue-50/30";
  };

  return (
    <div className="space-y-2 mb-6 last:mb-0 animate-in fade-in slide-in-from-bottom-2">
      {shift.restBefore && (
        <div className={`liquid-glass mx-6 py-3 px-6 rounded-[1.8rem] text-center relative border transition-all ${getRestColors()}`}>
          <div className="flex flex-col items-center">
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">
              {shift.restBefore.isCompensated && "✅ КОРРЕКТНО "}
              {getRestLabel()}
            </span>
            <span className="text-lg font-black tabular-nums tracking-tight">
              {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
            </span>
            {shift.restBefore.type === 'weekly_reduced' && !shift.restBefore.isCompensated && (
              <div className="mt-2 w-full pt-2 border-t border-orange-100 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight">
                  <span className="text-rose-500">Долг: {Math.round(shift.restBefore.debtHours * 10) / 10}ч</span>
                  <span className={isOverdue ? 'text-rose-600 underline' : 'text-slate-400'}>
                    До: {new Date(shift.restBefore.compensationDeadline!).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <button 
                  onClick={() => onToggleCompensation && onToggleCompensation(shift)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md"
                >
                  Компенсировать
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

      <div className="liquid-glass rounded-[2.2rem] overflow-hidden border-white/60">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/40 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-base font-black text-slate-900 tracking-tight">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
              {shift.startTime} — {shift.endTime}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex gap-2">
                <span className="flex items-center text-[11px] font-black text-blue-600">
                  <DrivingIcon />{shift.driveHours}ч
                </span>
                <span className="flex items-center text-[11px] font-black text-amber-600">
                  <WorkIcon />{shift.workHours}ч
                </span>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5">СМЕНА: {formatMinsToHHMM(duration)}</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/60 shadow-inner transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 pb-5 px-5' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
          <div className="overflow-hidden space-y-4">
            {expensesSummary && (
              <div className="px-4 py-2.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <span className="text-emerald-500"><WalletIcon /></span>
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tight">Траты: {expensesSummary}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onAddExpense && onAddExpense(shift.id); }}
                className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider"
              >
                <WalletIcon /> + Расход
              </button>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider shadow-lg shadow-slate-200"
                >
                  Изменить
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimelineItem);
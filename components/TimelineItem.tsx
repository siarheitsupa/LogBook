
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

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
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
    if (hours > 144) return "ДЛИТЕЛЬНЫЙ ПЕРЕРЫВ / ОТПУСК";
    if (shift.restBefore.type === 'long_pause') return "ДЛИТЕЛЬНАЯ ПАУЗА / ОЖИДАНИЕ";
    if (hours >= 45) return "РЕГУЛЯРНЫЙ НЕДЕЛЬНЫЙ ОТДЫХ";
    if (shift.restBefore.type === 'weekly_reduced') return "СОКРАЩЕННЫЙ НЕДЕЛЬНЫЙ ОТДЫХ";
    if (hours >= 11) return "РЕГУЛЯРНЫЙ ЕЖЕДНЕВНЫЙ ОТДЫХ";
    return "СОКРАЩЕННЫЙ ЕЖЕДНЕВНЫЙ ОТДЫХ";
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
    <div className="space-y-4 mb-6 last:mb-0 animate-in fade-in slide-in-from-bottom-2">
      {shift.restBefore && (
        <div className={`mx-4 py-5 px-8 rounded-[2.5rem] border text-center shadow-lg shadow-slate-200/10 ${getRestColors()}`}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-60">
            {shift.restBefore.isCompensated && "✅ КОРРЕКТНО "}
            {getRestLabel()}
          </div>
          <div className="text-2xl font-black tabular-nums tracking-tight">
            {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
          </div>
          {shift.restBefore.type === 'weekly_reduced' && !shift.restBefore.isCompensated && (
              <div className="mt-2 w-full pt-2 border-t border-orange-100 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight">
                  <span className="text-rose-500">Долг: {Math.round(shift.restBefore.debtHours * 10) / 10}ч</span>
                  <span className={isOverdue ? 'text-rose-600 underline' : 'text-slate-400'}>
                    До: {new Date(shift.restBefore.compensationDeadline!).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
          )}
        </div>
      )}

      <div className={`bg-white rounded-[2.8rem] overflow-hidden border transition-all ${shift.violation ? 'border-rose-400 shadow-xl shadow-rose-100' : 'border-slate-50 shadow-2xl shadow-slate-200/30'}`}>
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-8 flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest tabular-nums mt-1">
              {shift.startTime} — {shift.endTime}
            </span>
            {shift.violation && (
              <div className="mt-2 flex items-start gap-2 text-rose-500">
                <div className="mt-0.5"><AlertIcon /></div>
                <span className="text-[10px] font-bold leading-tight uppercase tracking-tight max-w-[180px]">
                  {shift.violation}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex gap-4 text-blue-600 font-black text-sm tracking-tight mb-1">
                <span className="flex items-center gap-1.5">
                   <DrivingIcon />
                   {shift.driveHours}ч
                </span>
                <span className="flex items-center gap-1.5 text-orange-500">
                   <WorkIcon />
                   {shift.workHours}ч
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
          <div className="px-8 pb-8 pt-0 animate-in fade-in zoom-in duration-300">
             <div className="border-t border-slate-50 mb-6"></div>
             
             {expensesSummary && (
              <div className="mb-6 px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <span className="text-emerald-500"><WalletIcon /></span>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Траты: {expensesSummary}</span>
              </div>
            )}

             <button 
                onClick={(e) => { e.stopPropagation(); onAddExpense && onAddExpense(shift.id); }}
                className="w-full bg-white border border-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm active:bg-slate-50 transition-colors mb-4"
              >
                <WalletIcon />
                + РАСХОД
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

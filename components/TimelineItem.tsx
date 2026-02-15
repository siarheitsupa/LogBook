
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

const TruckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block mb-0.5 opacity-60">
    <path d="M5 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M19 18h2v-9l-4 -4h-11v7" /><path d="M7 18h10" /><path d="M3 15h11" /><path d="M19 13h2" />
  </svg>
);

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete, onToggleCompensation, onAddExpense, isInitiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const duration = calculateShiftDurationMins(shift);
  const isMultiDay = shift.startDate !== shift.endDate;
  const driveTotalMins = (shift.driveHours * 60) + shift.driveMinutes;
  const distance = (shift.endMileage && shift.startMileage) ? (shift.endMileage - shift.startMileage) : 0;

  const totalExpenses = useMemo(() => {
    if (!shift.expenses) return 0;
    // Для простоты считаем в EUR, можно расширить
    return shift.expenses.reduce((acc, curr) => acc + (curr.currency === 'EUR' ? curr.amount : 0), 0);
  }, [shift.expenses]);

  const formattedDate = useMemo(() => {
    const start = new Date(shift.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    if (shift.startDate === shift.endDate) return start;
    const end = new Date(shift.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${start} — ${end}`;
  }, [shift.startDate, shift.endDate]);

  const needsCompensation = shift.restBefore?.type === 'weekly_reduced' && !shift.isCompensated;

  return (
    <div className="space-y-3 mb-6 last:mb-0">
      <div className={`ios-glass rounded-[2.5rem] overflow-hidden border-white/80 shadow-sm transition-all active:scale-[0.99] ${needsCompensation ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
        <div onClick={() => setIsExpanded(!isExpanded)} className="p-5 flex justify-between items-center cursor-pointer">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 tracking-tight">{formattedDate}</span>
              {shift.truckId && (
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-lg flex items-center">
                  <TruckIcon /> {shift.truckId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">
                {shift.startTime} — {shift.endTime}
              </span>
              {needsCompensation && (
                <span className="animate-pulse flex h-2 w-2 rounded-full bg-amber-500"></span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center ${isMultiDay ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                  <DrivingIcon /> {formatMinsToHHMM(driveTotalMins)}
                </span>
                {distance > 0 && <span className="text-[9px] font-bold text-emerald-600 mt-1">{distance} км</span>}
             </div>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
               <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
             </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {/* Предупреждение о компенсации */}
            {shift.restBefore?.type === 'weekly_reduced' && (
              <div className={`p-4 rounded-2xl flex items-center justify-between border ${shift.isCompensated ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Еженедельный отдых</span>
                  <span className="text-xs font-bold">
                    {shift.isCompensated ? '✅ Компенсировано' : `🚨 Долг: ${shift.restBefore.debtHours.toFixed(1)}ч`}
                  </span>
                </div>
                {onToggleCompensation && !shift.isCompensated && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleCompensation(shift); }}
                    className="px-4 py-2 bg-amber-600 text-white text-[9px] font-bold uppercase rounded-xl shadow-md active:scale-95 transition-all"
                  >
                    Вернуть долг
                  </button>
                )}
                {onToggleCompensation && shift.isCompensated && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleCompensation(shift); }}
                    className="text-[9px] font-bold uppercase underline opacity-50"
                  >
                    Отменить
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl text-center">
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Одометр</span>
                <span className="text-sm font-bold text-slate-700">{shift.startMileage || '—'} → {shift.endMileage || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-center">
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Общая смена</span>
                <span className="text-sm font-bold text-slate-700">{formatMinsToHHMM(duration)}</span>
              </div>
            </div>

            {/* Расходы */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Расходы за смену</span>
                {onAddExpense && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddExpense(shift.id); }}
                    className="text-[18px] font-bold text-slate-400 leading-none hover:text-slate-900"
                  >
                    +
                  </button>
                )}
              </div>
              {shift.expenses && shift.expenses.length > 0 ? (
                <div className="space-y-1.5">
                  {shift.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-center text-[11px] font-medium">
                      <span className="text-slate-500">{exp.category}</span>
                      <span className="font-bold text-slate-700">{exp.amount} {exp.currency}</span>
                    </div>
                  ))}
                  {totalExpenses > 0 && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-800 uppercase tracking-tighter">Итого (EUR)</span>
                      <span className="text-blue-600">{totalExpenses.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Нет записанных расходов</p>
              )}
            </div>

            {shift.notes && (
              <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1 tracking-widest">Заметки:</p>
                <p className="text-xs font-medium text-slate-600 italic leading-relaxed">{shift.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => onEdit(shift)} className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">Изменить</button>
              <button onClick={() => onDelete(shift.id)} className="px-5 py-3.5 text-rose-500 bg-rose-50 rounded-2xl text-[9px] font-bold uppercase active:scale-95 transition-all">Удалить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TimelineItem);

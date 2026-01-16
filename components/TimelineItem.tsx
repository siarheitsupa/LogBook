import React, { useState } from 'react';
import { ShiftWithRest, Shift } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  isInitiallyExpanded?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete, isInitiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const duration = calculateShiftDurationMins(shift);

  return (
    <div className="group space-y-3 mb-4">
      {/* Rest Period Above - Liquid Glass Style */}
      {shift.restBefore && (
        <div className={`liquid-glass mx-4 py-4 px-6 rounded-[2rem] text-center relative overflow-hidden ${shift.restBefore.type === 'regular' ? 'border-blue-200/50' : 'border-purple-200/50'}`}>
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-40"></div>
          <span className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${shift.restBefore.type === 'regular' ? 'text-blue-500/70' : 'text-purple-500/70'}`}>
            {shift.restBefore.type === 'regular' ? 'РЕГУЛЯРНЫЙ ОТДЫХ' : 'СОКРАЩЕННЫЙ ОТДЫХ'}
          </span>
          <span className={`text-xl font-black tabular-nums ${shift.restBefore.type === 'regular' ? 'text-blue-900' : 'text-purple-900'}`}>
            {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
          </span>
          {shift.restBefore.debtHours > 0 && (
            <span className="block text-[9px] font-black text-rose-500/70 mt-1">Долг: {Math.ceil(shift.restBefore.debtHours)}ч</span>
          )}
        </div>
      )}

      {/* Main Shift Card - Liquid Glass Style */}
      <div className="liquid-glass rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-xl border-white/60">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/40 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 tracking-tight">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">
              {shift.startTime} — {shift.endTime}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-blue-600 tracking-tight">Руль: {shift.driveHours}ч {shift.driveMinutes}м</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-60">СМЕНА: {formatMinsToHHMM(duration)}</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100/50 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="px-5 pb-5 pt-2 flex justify-end items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
              className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 text-blue-600 rounded-2xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Изменить
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
              className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 text-rose-600 rounded-2xl hover:bg-rose-500/20 transition-all text-xs font-black uppercase tracking-wider"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineItem;
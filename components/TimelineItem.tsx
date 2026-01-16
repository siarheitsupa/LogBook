
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
    <div className="group space-y-3 mb-6 last:mb-0">
      {/* Rest Period Above - Liquid Glass Style */}
      {shift.restBefore && (
        <div className={`liquid-glass mx-6 py-4 px-6 rounded-[2rem] text-center relative overflow-hidden ${shift.restBefore.type === 'regular' ? 'border-blue-200/50' : 'border-purple-200/50'}`}>
          <div className={`absolute top-0 left-0 w-1.5 h-full opacity-50 ${shift.restBefore.type === 'regular' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
          <span className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${shift.restBefore.type === 'regular' ? 'text-blue-500/70' : 'text-purple-500/70'}`}>
            {shift.restBefore.type === 'regular' ? 'РЕГУЛЯРНЫЙ ОТДЫХ' : 'СОКРАЩЕННЫЙ ОТДЫХ'}
          </span>
          <span className={`text-xl font-black tabular-nums ${shift.restBefore.type === 'regular' ? 'text-blue-900' : 'text-purple-900'}`}>
            {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
          </span>
          {shift.restBefore.debtHours > 0 && (
            <div className="flex justify-center mt-1">
              <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-tighter">
                Долг: {Math.ceil(shift.restBefore.debtHours)}ч
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Shift Card - iOS Liquid Glass Style */}
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
              <span className="text-base font-black text-blue-600 tracking-tight drop-shadow-sm">Руль: {shift.driveHours}ч {shift.driveMinutes}м</span>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter opacity-50 mt-0.5">СМЕНА: {formatMinsToHHMM(duration)}</span>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-md shadow-inner transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Expandable Action Controls */}
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

export default TimelineItem;

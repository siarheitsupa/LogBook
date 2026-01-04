
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
    <div className="group space-y-1">
      {/* Rest Period Above if exists */}
      {shift.restBefore && (
        <div className={`p-3 border-l-4 mx-2 rounded-xl text-center shadow-sm ${shift.restBefore.type === 'regular' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-purple-50 border-purple-400 text-purple-800'}`}>
          <span className="block text-[10px] font-bold uppercase opacity-60">
            {shift.restBefore.type === 'regular' ? 'Регулярный отдых' : 'Сокращенный отдых'}
          </span>
          <span className="text-sm font-bold">
            {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}мин
          </span>
        </div>
      )}

      {/* Main Shift Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">
              {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {shift.startTime} — {shift.endTime}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-blue-600">Руль: {shift.driveHours}ч {shift.driveMinutes}м</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Смена: {formatMinsToHHMM(duration)}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expandable Details - Compacted */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-2 border-t border-slate-50 bg-slate-50/30 flex justify-end items-center">
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Изменить
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-xs font-bold"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineItem;

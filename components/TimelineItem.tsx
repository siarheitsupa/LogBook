
import React, { useState } from 'react';
import { ShiftWithRest, Shift } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const duration = calculateShiftDurationMins(shift);

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all">
      <div className="flex justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="space-y-0.5">
          <div className="text-lg font-black text-slate-800 tracking-tight">
            {new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </div>
          <div className="text-[11px] font-black text-slate-300 uppercase tracking-widest tabular-nums">
            {shift.startTime} — {shift.endTime}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-blue-600 font-black text-sm tracking-tight leading-none mb-0.5">
              Руль: {shift.driveHours}ч {shift.driveMinutes}м
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              СМЕНА: {formatMinsToHHMM(duration)}
            </div>
          </div>
          <svg className={`w-5 h-5 text-slate-200 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-slate-50 flex gap-2">
          <button onClick={() => onEdit(shift)} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Изменить</button>
          <button onClick={() => onDelete(shift.id)} className="flex-1 bg-rose-50 text-rose-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Удалить</button>
        </div>
      )}
    </div>
  );
};

export default React.memo(TimelineItem);

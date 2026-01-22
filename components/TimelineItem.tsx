
import React from 'react';
import { ShiftWithRest, Shift } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface TimelineItemProps {
  shift: ShiftWithRest;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ shift, onEdit, onDelete }) => {
  const duration = calculateShiftDurationMins(shift);

  return (
    <div className="space-y-1 mb-6">
      {shift.restBefore && (
        <div className="bg-slate-100/50 py-2 px-4 rounded-xl text-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Отдых: {shift.restBefore.durationHours}ч {shift.restBefore.durationMinutes}м
          </span>
        </div>
      )}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
        <div>
          <p className="font-black text-slate-900">{new Date(shift.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">{shift.startTime} - {shift.endTime}</p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="text-[10px] font-bold">
            <p className="text-blue-600">В: {shift.driveHours}ч {shift.driveMinutes}м</p>
            <p className="text-slate-400">С: {formatMinsToHHMM(duration)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(shift)} className="p-2 text-slate-300 hover:text-slate-600">✎</button>
            <button onClick={() => onDelete(shift.id)} className="p-2 text-slate-300 hover:text-rose-500">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineItem;

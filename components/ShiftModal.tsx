import React, { useState, useEffect } from 'react';
import { Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  initialData?: Shift | null;
  defaultStartTime?: string;
}

const DrivingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block mb-0.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 2l0 7"/><path d="M12 15l0 7"/><path d="M2 12l7 0"/><path d="M15 12l7 0"/>
  </svg>
);

const WorkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block mb-0.5">
    <path d="m15 12-8.373 8.373a1 1 0 1 1-3.007-3.007L12 9"/><path d="m9 15 3-3"/><path d="M15 12c2 0 4-1 4-3s-2-3-4-3-4 1-4 3 2 3 4 3Z"/>
  </svg>
);

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData, defaultStartTime }) => {
  const [date, setDate] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('18:00');
  const [driveH, setDriveH] = useState('0');
  const [driveM, setDriveM] = useState('0');
  const [workH, setWorkH] = useState('0');
  const [workM, setWorkM] = useState('0');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date);
        setStart(initialData.startTime);
        setEnd(initialData.endTime);
        setDriveH(initialData.driveHours.toString());
        setDriveM(initialData.driveMinutes.toString());
        setWorkH((initialData.workHours || 0).toString());
        setWorkM((initialData.workMinutes || 0).toString());
      } else {
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        if (defaultStartTime) {
          setStart(defaultStartTime);
        } else {
          setStart('08:00');
        }
        setEnd(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        setDriveH('0');
        setDriveM('0');
        setWorkH('0');
        setWorkM('0');
      }
    }
  }, [initialData, isOpen, defaultStartTime]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const shift: Shift = {
      id: initialData?.id || Date.now().toString(),
      date,
      startTime: start,
      endTime: end,
      driveHours: parseInt(driveH) || 0,
      driveMinutes: parseInt(driveM) || 0,
      workHours: parseInt(workH) || 0,
      workMinutes: parseInt(workM) || 0,
      timestamp: new Date(`${date}T${start}`).getTime()
    };
    onSave(shift);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-center mb-6">Запись смены</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Дата</label>
            <input 
              type="date" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:border-slate-400 outline-none transition-all" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              required 
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Начало</label>
              <input 
                type="time" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-blue-500 outline-none" 
                value={start} 
                onChange={e => setStart(e.target.value)}
                required 
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Конец</label>
              <input 
                type="time" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-blue-500 outline-none" 
                value={end} 
                onChange={e => setEnd(e.target.value)}
                required 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">
                <DrivingIcon /> Вождение
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  placeholder="ЧЧ" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-blue-500 outline-none" 
                  value={driveH} 
                  onChange={e => setDriveH(e.target.value)}
                  min="0" max="24"
                  required 
                />
                <span className="font-bold text-slate-400">:</span>
                <input 
                  type="number" 
                  placeholder="ММ" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-blue-500 outline-none" 
                  value={driveM} 
                  onChange={e => setDriveM(e.target.value)}
                  min="0" max="59"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">
                <WorkIcon /> Работа
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  placeholder="ЧЧ" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-amber-500 outline-none" 
                  value={workH} 
                  onChange={e => setWorkH(e.target.value)}
                  min="0" max="24"
                  required 
                />
                <span className="font-bold text-slate-400">:</span>
                <input 
                  type="number" 
                  placeholder="ММ" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-medium focus:ring-2 ring-amber-500 outline-none" 
                  value={workM} 
                  onChange={e => setWorkM(e.target.value)}
                  min="0" max="59"
                  required 
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-xl active:bg-slate-200 transition-colors"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl active:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;
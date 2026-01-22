
import React, { useState, useEffect } from 'react';
import { Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  initialData?: Shift | null;
}

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [date, setDate] = useState('');
  const [startH, setStartH] = useState('08');
  const [startM, setStartM] = useState('00');
  const [endH, setEndH] = useState('18');
  const [endM, setEndM] = useState('00');
  const [driveH, setDriveH] = useState('0');
  const [driveM, setDriveM] = useState('0');
  const [workH, setWorkH] = useState('0');
  const [workM, setWorkM] = useState('0');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date);
        const [sh, sm] = initialData.startTime.split(':');
        const [eh, em] = initialData.endTime.split(':');
        setStartH(sh); setStartM(sm); setEndH(eh); setEndM(em);
        setDriveH(initialData.driveHours.toString());
        setDriveM(initialData.driveMinutes.toString());
        setWorkH(initialData.workHours.toString());
        setWorkM(initialData.workMinutes.toString());
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setStartH('08'); setStartM('00'); setEndH('18'); setEndM('00');
        setDriveH('0'); setDriveM('0'); setWorkH('0'); setWorkM('0');
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || Date.now().toString(),
      date,
      startTime: `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`,
      endTime: `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`,
      driveHours: parseInt(driveH) || 0,
      driveMinutes: parseInt(driveM) || 0,
      workHours: parseInt(workH) || 0,
      workMinutes: parseInt(workM) || 0,
      timestamp: new Date(`${date}T${startH}:${startM}`).getTime()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl">
        <h3 className="text-xl font-black mb-6 text-center uppercase">Детали смены</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={date} onChange={e => setDate(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
             <div className="flex gap-1 bg-slate-50 p-2 rounded-xl">
               <input type="number" className="w-full bg-transparent text-center font-bold" value={startH} onChange={e => setStartH(e.target.value)} /> :
               <input type="number" className="w-full bg-transparent text-center font-bold" value={startM} onChange={e => setStartM(e.target.value)} />
             </div>
             <div className="flex gap-1 bg-slate-50 p-2 rounded-xl">
               <input type="number" className="w-full bg-transparent text-center font-bold" value={endH} onChange={e => setEndH(e.target.value)} /> :
               <input type="number" className="w-full bg-transparent text-center font-bold" value={endM} onChange={e => setEndM(e.target.value)} />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Вождение</p>
              <div className="flex gap-1">
                <input type="number" className="w-full bg-transparent font-bold" value={driveH} onChange={e => setDriveH(e.target.value)} />
                <input type="number" className="w-full bg-transparent font-bold" value={driveM} onChange={e => setDriveM(e.target.value)} />
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Работа</p>
              <div className="flex gap-1">
                <input type="number" className="w-full bg-transparent font-bold" value={workH} onChange={e => setWorkH(e.target.value)} />
                <input type="number" className="w-full bg-transparent font-bold" value={workM} onChange={e => setWorkM(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-slate-400">Отмена</button>
            <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;

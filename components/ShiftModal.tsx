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
    <path d="M15.5 10.5 L19 7 L21 9 L17.5 12.5 Z" />
    <path d="M17.5 10.5 L10 18" />
    <path d="M8.5 10.5 L5 7 L3 9 L6.5 12.5 Z" />
    <path d="M6.5 10.5 L14 18" />
  </svg>
);

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData, defaultStartTime }) => {
  const [date, setDate] = useState('');
  
  // Раздельные состояния для времени начала и конца
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
        setStartH(sh);
        setStartM(sm);
        setEndH(eh);
        setEndM(em);
        setDriveH(initialData.driveHours.toString());
        setDriveM(initialData.driveMinutes.toString());
        setWorkH((initialData.workHours || 0).toString());
        setWorkM((initialData.workMinutes || 0).toString());
      } else {
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        if (defaultStartTime) {
          const [sh, sm] = defaultStartTime.split(':');
          setStartH(sh);
          setStartM(sm);
        } else {
          setStartH('08');
          setStartM('00');
        }
        setEndH(now.getHours().toString().padStart(2, '0'));
        setEndM(now.getMinutes().toString().padStart(2, '0'));
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
      startTime: `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`,
      endTime: `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`,
      driveHours: parseInt(driveH) || 0,
      driveMinutes: parseInt(driveM) || 0,
      workHours: parseInt(workH) || 0,
      workMinutes: parseInt(workM) || 0,
      timestamp: new Date(`${date}T${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`).getTime()
    };
    onSave(shift);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm safe-p-bottom">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92dvh] overflow-hidden">
        <div className="p-5 sm:p-6 overflow-y-auto">
          <h3 className="text-xl font-black text-center mb-6 text-slate-800">Запись смены</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Дата</label>
              <input 
                type="date" 
                className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-center font-bold text-slate-700 focus:bg-white focus:ring-2 ring-blue-500/20 outline-none transition-all appearance-none" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                required 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Начало</label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl min-w-0">
                  <input 
                    type="number" 
                    placeholder="ЧЧ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={startH} 
                    onChange={e => setStartH(e.target.value)}
                    min="0" max="23"
                    inputMode="numeric"
                    required 
                  />
                  <span className="font-bold text-slate-300">:</span>
                  <input 
                    type="number" 
                    placeholder="ММ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={startM} 
                    onChange={e => setStartM(e.target.value)}
                    min="0" max="59"
                    inputMode="numeric"
                    required 
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Конец</label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl min-w-0">
                  <input 
                    type="number" 
                    placeholder="ЧЧ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={endH} 
                    onChange={e => setEndH(e.target.value)}
                    min="0" max="23"
                    inputMode="numeric"
                    required 
                  />
                  <span className="font-bold text-slate-300">:</span>
                  <input 
                    type="number" 
                    placeholder="ММ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={endM} 
                    onChange={e => setEndM(e.target.value)}
                    min="0" max="59"
                    inputMode="numeric"
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1 min-w-0">
                <label className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 truncate">
                  <DrivingIcon /> Вождение
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl min-w-0">
                  <input 
                    type="number" 
                    placeholder="ЧЧ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={driveH} 
                    onChange={e => setDriveH(e.target.value)}
                    min="0" max="24"
                    inputMode="numeric"
                    required 
                  />
                  <span className="font-bold text-slate-300">:</span>
                  <input 
                    type="number" 
                    placeholder="ММ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={driveM} 
                    onChange={e => setDriveM(e.target.value)}
                    min="0" max="59"
                    inputMode="numeric"
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-1 min-w-0">
                <label className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 truncate">
                  <WorkIcon /> Работа
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl min-w-0">
                  <input 
                    type="number" 
                    placeholder="ЧЧ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={workH} 
                    onChange={e => setWorkH(e.target.value)}
                    min="0" max="24"
                    inputMode="numeric"
                    required 
                  />
                  <span className="font-bold text-slate-300">:</span>
                  <input 
                    type="number" 
                    placeholder="ММ" 
                    className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none min-w-0 appearance-none" 
                    value={workM} 
                    onChange={e => setWorkM(e.target.value)}
                    min="0" max="59"
                    inputMode="numeric"
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-4 font-black text-slate-400 bg-slate-50 rounded-2xl active:bg-slate-100 transition-all text-xs uppercase tracking-widest"
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="flex-1 py-4 font-black text-white bg-blue-600 rounded-2xl active:scale-[0.98] shadow-xl shadow-blue-100 transition-all text-xs uppercase tracking-widest"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;
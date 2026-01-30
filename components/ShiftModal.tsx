
import React, { useState, useEffect } from 'react';
import { Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  initialData?: Shift | null;
  defaultStartTime?: string;
  defaultDate?: string;
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

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData, defaultStartTime, defaultDate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startH, setStartH] = useState('08');
  const [startM, setStartM] = useState('00');
  const [endH, setEndH] = useState('18');
  const [endM, setEndM] = useState('00');
  
  // Поля для ввода вождения
  const [driveH1, setDriveH1] = useState('0');
  const [driveM1, setDriveM1] = useState('0');
  const [driveH2, setDriveH2] = useState('0');
  const [driveM2, setDriveM2] = useState('0');
  
  const [workH, setWorkH] = useState('0');
  const [workM, setWorkM] = useState('0');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setStartDate(initialData.startDate);
        setEndDate(initialData.endDate);
        const [sh, sm] = initialData.startTime.split(':');
        const [eh, em] = initialData.endTime.split(':');
        setStartH(sh); setStartM(sm);
        setEndH(eh); setEndM(em);

        // Расчет для раздельного ввода (День 1 = Всего - День 2)
        const totalDriveMins = (initialData.driveHours * 60) + initialData.driveMinutes;
        const day2DriveMins = ((initialData.driveHoursDay2 || 0) * 60) + (initialData.driveMinutesDay2 || 0);
        const day1DriveMins = Math.max(0, totalDriveMins - day2DriveMins);

        setDriveH1(Math.floor(day1DriveMins / 60).toString());
        setDriveM1((day1DriveMins % 60).toString());
        setDriveH2((initialData.driveHoursDay2 || 0).toString());
        setDriveM2((initialData.driveMinutesDay2 || 0).toString());
        
        setWorkH((initialData.workHours || 0).toString());
        setWorkM((initialData.workMinutes || 0).toString());
      } else {
        const now = new Date();
        const dateStr = defaultDate || now.toISOString().split('T')[0];
        setStartDate(dateStr); setEndDate(dateStr);
        if (defaultStartTime) {
          const [sh, sm] = defaultStartTime.split(':');
          setStartH(sh); setStartM(sm);
        } else {
          setStartH('08'); setStartM('00');
        }
        setEndH(now.getHours().toString().padStart(2, '0'));
        setEndM(now.getMinutes().toString().padStart(2, '0'));
        setDriveH1('0'); setDriveM1('0');
        setDriveH2('0'); setDriveM2('0');
        setWorkH('0'); setWorkM('0');
      }
    }
  }, [initialData, isOpen, defaultStartTime, defaultDate]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (!endDate || endDate < val) setEndDate(val);
  };

  if (!isOpen) return null;

  const isMultiDay = startDate !== endDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Складываем части вождения для общего значения в БД
    const d1Mins = (parseInt(driveH1) || 0) * 60 + (parseInt(driveM1) || 0);
    const d2Mins = isMultiDay ? ((parseInt(driveH2) || 0) * 60 + (parseInt(driveM2) || 0)) : 0;
    const totalDriveMins = d1Mins + d2Mins;

    const shift: Shift = {
      id: initialData?.id || Date.now().toString(),
      startDate, endDate,
      startTime: `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`,
      endTime: `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`,
      driveHours: Math.floor(totalDriveMins / 60),
      driveMinutes: totalDriveMins % 60,
      driveHoursDay2: Math.floor(d2Mins / 60),
      driveMinutesDay2: d2Mins % 60,
      workHours: parseInt(workH) || 0,
      workMinutes: parseInt(workM) || 0,
      timestamp: new Date(`${startDate}T${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`).getTime()
    };
    onSave(shift);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm safe-p-bottom">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92dvh] overflow-hidden">
        <div className="p-5 sm:p-6 overflow-y-auto">
          <h3 className="text-xl font-bold text-center mb-6 text-slate-800">Запись смены</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Дата Старта</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center font-bold text-slate-700 text-xs focus:ring-2 ring-blue-500/20 outline-none appearance-none" value={startDate} onChange={e => handleStartDateChange(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Дата Финиша</label>
                <input type="date" className={`w-full p-3 bg-slate-50 border rounded-2xl text-center font-bold text-xs focus:ring-2 ring-blue-500/20 outline-none appearance-none ${isMultiDay ? 'border-amber-200 text-amber-700' : 'border-slate-100 text-slate-700'}`} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Начало</label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                  <input type="number" placeholder="ЧЧ" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={startH} onChange={e => setStartH(e.target.value)} min="0" max="23" inputMode="numeric" required />
                  <span className="font-bold text-slate-300">:</span>
                  <input type="number" placeholder="ММ" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={startM} onChange={e => setStartM(e.target.value)} min="0" max="59" inputMode="numeric" required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Конец</label>
                <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                  <input type="number" placeholder="ЧЧ" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={endH} onChange={e => setEndH(e.target.value)} min="0" max="23" inputMode="numeric" required />
                  <span className="font-bold text-slate-300">:</span>
                  <input type="number" placeholder="ММ" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={endM} onChange={e => setEndM(e.target.value)} min="0" max="59" inputMode="numeric" required />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"><DrivingIcon /> Вождение День 1</label>
                    <div className="flex items-center gap-1 p-1 bg-white border border-slate-100 rounded-2xl">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={driveH1} onChange={e => setDriveH1(e.target.value)} min="0" max="24" inputMode="numeric" required />
                      <span className="font-bold text-slate-300">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={driveM1} onChange={e => setDriveM1(e.target.value)} min="0" max="59" inputMode="numeric" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1"><WorkIcon /> Работа (Всего)</label>
                    <div className="flex items-center gap-1 p-1 bg-white border border-slate-100 rounded-2xl">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={workH} onChange={e => setWorkH(e.target.value)} min="0" max="24" inputMode="numeric" required />
                      <span className="font-bold text-slate-300">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-slate-700 outline-none" value={workM} onChange={e => setWorkM(e.target.value)} min="0" max="59" inputMode="numeric" required />
                    </div>
                  </div>
               </div>

               {isMultiDay && (
                  <div className="pt-4 border-t border-slate-200/50 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">
                        Вождение День 2 (после 00:00)
                      </label>
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-amber-50 border border-amber-100 rounded-2xl w-1/2">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-amber-700 outline-none" value={driveH2} onChange={e => setDriveH2(e.target.value)} min="0" max="24" inputMode="numeric" />
                      <span className="font-bold text-amber-200">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-amber-700 outline-none" value={driveM2} onChange={e => setDriveM2(e.target.value)} min="0" max="59" inputMode="numeric" />
                    </div>
                  </div>
               )}
            </div>

            <div className="flex gap-3 pt-3">
              <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl active:bg-slate-100 text-xs uppercase tracking-widest">Отмена</button>
              <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-2xl active:scale-[0.98] shadow-xl shadow-blue-100 text-xs uppercase tracking-widest">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;

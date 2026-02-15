
import React, { useState, useEffect } from 'react';
import { Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  initialData?: Shift | null;
  defaultStartTime?: string;
  defaultDate?: string;
  defaultStartMileage?: number;
  defaultTruckId?: string;
}

const DrivingIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block mb-0.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 2l0 7"/><path d="M12 15l0 7"/><path d="M2 12l7 0"/><path d="M15 12l7 0"/>
  </svg>
);

const TruckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block mb-0.5">
    <path d="M5 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M19 18h2v-9l-4 -4h-11v7" /><path d="M7 18h10" /><path d="M3 15h11" /><path d="M19 13h2" />
  </svg>
);

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData, defaultStartTime, defaultDate, defaultStartMileage, defaultTruckId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startH, setStartH] = useState('08');
  const [startM, setStartM] = useState('00');
  const [endH, setEndH] = useState('18');
  const [endM, setEndM] = useState('00');
  const [driveH1, setDriveH1] = useState('0');
  const [driveM1, setDriveM1] = useState('0');
  const [driveH2, setDriveH2] = useState('0');
  const [driveM2, setDriveM2] = useState('0');
  const [workH, setWorkH] = useState('0');
  const [workM, setWorkM] = useState('0');
  const [startMileage, setStartMileage] = useState('');
  const [endMileage, setEndMileage] = useState('');
  const [truckId, setTruckId] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompensated, setIsCompensated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setStartDate(initialData.startDate);
        setEndDate(initialData.endDate);
        const [sh, sm] = initialData.startTime.split(':');
        const [eh, em] = initialData.endTime.split(':');
        setStartH(sh); setStartM(sm);
        setEndH(eh); setEndM(em);

        const totalDriveMins = (initialData.driveHours * 60) + initialData.driveMinutes;
        const d2Mins = ((initialData.driveHoursDay2 || 0) * 60) + (initialData.driveMinutesDay2 || 0);
        const d1Mins = Math.max(0, totalDriveMins - d2Mins);

        setDriveH1(Math.floor(d1Mins / 60).toString());
        setDriveM1((d1Mins % 60).toString());
        setDriveH2((initialData.driveHoursDay2 || 0).toString());
        setDriveM2((initialData.driveMinutesDay2 || 0).toString());
        setWorkH((initialData.workHours || 0).toString());
        setWorkM((initialData.workMinutes || 0).toString());
        setStartMileage(initialData.startMileage?.toString() || '');
        setEndMileage(initialData.endMileage?.toString() || '');
        setTruckId(initialData.truckId || '');
        setNotes(initialData.notes || '');
        setIsCompensated(initialData.isCompensated || false);
      } else {
        const now = new Date();
        const dateStr = defaultDate || now.toISOString().split('T')[0];
        setStartDate(dateStr);
        setEndDate(now.toISOString().split('T')[0]);
        
        if (defaultStartTime) {
          const [sh, sm] = defaultStartTime.split(':');
          setStartH(sh); setStartM(sm);
        } else {
          setStartH('08'); setStartM('00');
        }
        
        setEndH(now.getHours().toString().padStart(2, '0'));
        setEndM(now.getMinutes().toString().padStart(2, '0'));
        
        setStartMileage(defaultStartMileage?.toString() || '');
        setTruckId(defaultTruckId || localStorage.getItem('last_truck_id') || '');
        
        setDriveH1('0'); setDriveM1('0'); setDriveH2('0'); setDriveM2('0');
        setWorkH('0'); setWorkM('0'); setEndMileage(''); setNotes('');
        setIsCompensated(false);
      }
    }
  }, [initialData, isOpen, defaultStartTime, defaultDate, defaultStartMileage, defaultTruckId]);

  if (!isOpen) return null;
  const isMultiDay = startDate !== endDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d1Mins = (parseInt(driveH1) || 0) * 60 + (parseInt(driveM1) || 0);
    const d2Mins = isMultiDay ? ((parseInt(driveH2) || 0) * 60 + (parseInt(driveM2) || 0)) : 0;
    const totalMins = d1Mins + d2Mins;

    if (truckId) localStorage.setItem('last_truck_id', truckId);

    onSave({
      id: initialData?.id || Date.now().toString(),
      startDate, endDate,
      startTime: `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`,
      endTime: `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`,
      driveHours: Math.floor(totalMins / 60),
      driveMinutes: totalMins % 60,
      driveHoursDay2: Math.floor(d2Mins / 60),
      driveMinutesDay2: d2Mins % 60,
      workHours: parseInt(workH) || 0,
      workMinutes: parseInt(workM) || 0,
      timestamp: new Date(`${startDate}T${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`).getTime(),
      startMileage: parseInt(startMileage) || 0,
      endMileage: parseInt(endMileage) || 0,
      truckId,
      notes,
      isCompensated
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        <div className="p-6 overflow-y-auto space-y-5">
          <h3 className="text-xl font-bold text-center text-slate-800 uppercase tracking-tight">Журнал смены</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Дата Старта</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Дата Финиша</label>
                <input type="date" className="w-full p-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Номер Тягача</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700">
                  <TruckIcon />
                  <input type="text" className="bg-transparent w-full outline-none uppercase text-xs" placeholder="ABC-123" value={truckId} onChange={e => setTruckId(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Старт</label>
                    <div className="flex items-center gap-1 p-1.5 bg-slate-50 border rounded-xl">
                      <input type="number" className="w-full bg-transparent text-center font-bold text-xs outline-none" value={startH} onChange={e => setStartH(e.target.value)} min="0" max="23" />
                      <span className="text-slate-300">:</span>
                      <input type="number" className="w-full bg-transparent text-center font-bold text-xs outline-none" value={startM} onChange={e => setStartM(e.target.value)} min="0" max="59" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Финиш</label>
                    <div className="flex items-center gap-1 p-1.5 bg-slate-50 border rounded-xl">
                      <input type="number" className="w-full bg-transparent text-center font-bold text-xs outline-none" value={endH} onChange={e => setEndH(e.target.value)} min="0" max="23" />
                      <span className="text-slate-300">:</span>
                      <input type="number" className="w-full bg-transparent text-center font-bold text-xs outline-none" value={endM} onChange={e => setEndM(e.target.value)} min="0" max="59" />
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-[2rem] space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Одометр Старт</label>
                    <input type="number" className="w-full p-3 bg-white border rounded-2xl text-center font-bold outline-none" placeholder="км" value={startMileage} onChange={e => setStartMileage(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Одометр Финиш</label>
                    <input type="number" className="w-full p-3 bg-white border rounded-2xl text-center font-bold outline-none" placeholder="км" value={endMileage} onChange={e => setEndMileage(e.target.value)} inputMode="numeric" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1"><DrivingIcon /> Вождение День 1</label>
                    <div className="flex items-center gap-1 p-1 bg-white border rounded-2xl">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold outline-none" value={driveH1} onChange={e => setDriveH1(e.target.value)} min="0" inputMode="numeric" required />
                      <span className="font-bold text-slate-300">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold outline-none" value={driveM1} onChange={e => setDriveM1(e.target.value)} min="0" max="59" inputMode="numeric" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">🔨 Прочая работа</label>
                    <div className="flex items-center gap-1 p-1 bg-white border rounded-2xl">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold outline-none" value={workH} onChange={e => setWorkH(e.target.value)} min="0" inputMode="numeric" required />
                      <span className="font-bold text-slate-300">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold outline-none" value={workM} onChange={e => setWorkM(e.target.value)} min="0" max="59" inputMode="numeric" required />
                    </div>
                  </div>
               </div>

               {isMultiDay && (
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-[10px] font-bold text-amber-600 uppercase mb-2 ml-1">Вождение День 2</label>
                    <div className="flex items-center gap-1 p-1 bg-amber-50 border border-amber-100 rounded-2xl w-1/2">
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-amber-700 outline-none" value={driveH2} onChange={e => setDriveH2(e.target.value)} min="0" inputMode="numeric" />
                      <span className="font-bold text-amber-200">:</span>
                      <input type="number" className="w-full py-2 bg-transparent text-center font-bold text-amber-700 outline-none" value={driveM2} onChange={e => setDriveM2(e.target.value)} min="0" max="59" inputMode="numeric" />
                    </div>
                  </div>
               )}

               <div className="flex items-center gap-3 pt-2">
                 <input 
                   type="checkbox" 
                   id="compensated" 
                   className="w-5 h-5 rounded-md text-slate-900 focus:ring-slate-500"
                   checked={isCompensated} 
                   onChange={e => setIsCompensated(e.target.checked)} 
                 />
                 <label htmlFor="compensated" className="text-xs font-bold text-slate-600 uppercase tracking-tight">Отдых компенсирован</label>
               </div>
            </div>

            <textarea 
              className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-medium outline-none resize-none h-16" 
              placeholder="Заметки (адрес загрузки, номер прицепа...)" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl uppercase text-[10px]">Отмена</button>
              <button type="submit" className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-2xl shadow-xl uppercase text-[10px]">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;

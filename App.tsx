
import React, { useState, useEffect } from 'react';
import { Shift, AppState } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, calculateShiftDurationMins, pad } from './utils/timeUtils';
import { analyzeLogs } from './services/geminiService';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import TimelineItem from './components/TimelineItem';

const App: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Update "now" for live timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000); // Update every second for smooth timer
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setShifts(storage.getShifts());
    setAppState(storage.getState());
  }, []);

  const handleMainAction = () => {
    if (!appState.isActive) {
      const newState = { isActive: true, startTime: Date.now() };
      setAppState(newState);
      storage.saveState(newState);
    } else {
      setEditingShift(null);
      setIsModalOpen(true);
    }
  };

  const handleSaveShift = (newShift: Shift) => {
    let updatedShifts;
    if (editingShift) {
      updatedShifts = shifts.map(s => s.id === newShift.id ? newShift : s);
    } else {
      updatedShifts = [...shifts, newShift];
      setAppState({ isActive: false, startTime: null });
      storage.clearState();
    }
    
    updatedShifts.sort((a, b) => b.timestamp - a.timestamp);
    setShifts(updatedShifts);
    storage.saveShifts(updatedShifts);
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const deleteShift = (id: string) => {
    if (window.confirm('Удалить эту смену?')) {
      const updated = shifts.filter(s => s.id !== id);
      setShifts(updated);
      storage.saveShifts(updated);
    }
  };

  const editShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsModalOpen(true);
  };

  const runAiAnalysis = async () => {
    if (shifts.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeLogs(shifts);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const { shifts: enrichedShifts, totalDebt } = calculateLogSummary(shifts);
  const { weekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount } = getStats(shifts);

  const lastShift = shifts[0]; // shifts are sorted newest first
  const lastShiftEndTime = lastShift ? new Date(`${lastShift.date}T${lastShift.endTime}`).getTime() : null;
  
  // Calculate rest time elapsed
  const restElapsedMins = (!appState.isActive && lastShiftEndTime) 
    ? Math.max(0, (now - lastShiftEndTime) / (1000 * 60))
    : 0;

  const defaultStartTimeStr = appState.startTime 
    ? `${pad(new Date(appState.startTime).getHours())}:${pad(new Date(appState.startTime).getMinutes())}`
    : '08:00';

  // Calculate current active shift duration
  const activeDurationMins = appState.isActive && appState.startTime 
    ? (now - appState.startTime) / (1000 * 60)
    : 0;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-12 px-4 pt-6">
      <header className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">DriverLog Pro</span>
        </div>
      </header>

      {/* Main Control Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className={`mb-4 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold transition-all ${appState.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{appState.isActive ? '🟢' : '💤'}</span>
            <span>{appState.isActive ? 'Смена открыта' : 'На отдыхе'}</span>
          </div>
          
          {appState.isActive && (
            <div className="mt-2 text-2xl font-black tabular-nums tracking-tighter">
              {formatMinsToHHMM(activeDurationMins)}
              <span className="text-xs font-bold block text-center opacity-60 uppercase">Длительность смены</span>
            </div>
          )}

          {!appState.isActive && lastShiftEndTime && (
            <div className="mt-4 w-full space-y-3">
              <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] block text-center uppercase text-slate-400 font-bold mb-1">Прошло отдыха</span>
                <div className="text-2xl font-black text-slate-700 text-center tabular-nums">
                  {formatMinsToHHMM(restElapsedMins)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-xl text-center border ${restElapsedMins >= 9 * 60 ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  <span className="text-[9px] block font-bold uppercase opacity-60">До 9ч</span>
                  <span className="text-sm font-black tabular-nums">
                    {restElapsedMins >= 9 * 60 ? 'ГОТОВО' : formatMinsToHHMM(9 * 60 - restElapsedMins)}
                  </span>
                </div>
                <div className={`p-2 rounded-xl text-center border ${restElapsedMins >= 11 * 60 ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <span className="text-[9px] block font-bold uppercase opacity-60">До 11ч</span>
                  <span className="text-sm font-black tabular-nums">
                    {restElapsedMins >= 11 * 60 ? 'ГОТОВО' : formatMinsToHHMM(11 * 60 - restElapsedMins)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={handleMainAction}
          className={`w-full py-5 rounded-2xl text-lg font-bold text-white shadow-lg transition-all active:scale-[0.98] ${appState.isActive ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}
        >
          {appState.isActive ? 'Завершить смену' : 'Начать смену'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Вождение неделя" value={formatMinsToHHMM(weekMins)} sublabel="Макс: 56ч" variant="yellow" />
        <StatCard label="Работа (Сутки)" value={formatMinsToHHMM(dailyDutyMins + activeDurationMins)} sublabel="Текущий день" variant="orange" />
        <StatCard label="За 2 недели" value={formatMinsToHHMM(biWeekMins)} sublabel="Макс: 90ч" variant="green" />
        <StatCard label="10ч Вождение" value={`${extDrivingCount} / 2`} sublabel="Доп. часы" variant="blue" />
        <StatCard label="15ч Смены" value={`${extDutyCount} / 3`} sublabel="Растяжки (ЕС)" variant="indigo" />
        <StatCard label="Долг (Отдых)" value={`${Math.ceil(totalDebt)}ч`} sublabel="Компенсация" variant="purple" />
      </div>

      {/* AI Analysis */}
      {shifts.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg text-lg">✨</span>
                AI Анализ Норм
              </h3>
              <button onClick={runAiAnalysis} disabled={isAnalyzing} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-bold transition-colors disabled:opacity-50">
                {isAnalyzing ? 'Анализ...' : 'Обновить'}
              </button>
            </div>
            <p className="text-sm leading-relaxed opacity-90 italic">
              {aiAnalysis || "Нажмите 'Обновить' для проверки логов на соответствие ЕС."}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 px-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          Хронология
        </h3>
        
        <div className="space-y-2">
          {enrichedShifts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center text-slate-400 font-medium border border-slate-100">
              Пока нет записей.
            </div>
          ) : (
            enrichedShifts.map((shift, idx) => (
              <TimelineItem 
                key={shift.id} 
                shift={shift} 
                onEdit={editShift} 
                onDelete={deleteShift}
                isInitiallyExpanded={idx === 0}
              />
            ))
          )}
        </div>
      </div>

      <ShiftModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingShift(null); }}
        onSave={handleSaveShift}
        initialData={editingShift}
        defaultStartTime={defaultStartTimeStr}
      />
    </div>
  );
};

export default App;

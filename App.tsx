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
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await storage.getShifts();
      setShifts(data);
      setAppState(storage.getState());
      setIsLoading(false);
    };
    loadData();
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

  const handleSaveShift = async (newShift: Shift) => {
    setIsLoading(true);
    const success = await storage.saveShift(newShift);
    const updatedData = await storage.getShifts();
    setShifts(updatedData);
    if (!editingShift) {
      setAppState({ isActive: false, startTime: null });
      storage.clearState();
    }
    setIsLoading(false);
    setIsModalOpen(false);
    setEditingShift(null);
    
    if (!success && storage.isCloudEnabled()) {
      alert('Ошибка синхронизации с облаком. Данные сохранены локально.');
    }
  };

  const deleteShift = async (id: string) => {
    if (window.confirm('Удалить эту смену?')) {
      setIsLoading(true);
      await storage.deleteShift(id);
      const updatedData = await storage.getShifts();
      setShifts(updatedData);
      setIsLoading(false);
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

  const copyAnalysis = () => {
    if (aiAnalysis) {
      navigator.clipboard.writeText(aiAnalysis);
      alert('Скопировано в буфер обмена');
    }
  };

  const { shifts: enrichedShifts, totalDebt } = calculateLogSummary(shifts);
  const { weekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount } = getStats(shifts);

  const lastShift = shifts[0];
  const lastShiftEndTime = lastShift ? new Date(`${lastShift.date}T${lastShift.endTime}`).getTime() : null;
  
  const restElapsedMins = (!appState.isActive && lastShiftEndTime) 
    ? Math.max(0, (now - lastShiftEndTime) / (1000 * 60))
    : 0;

  const defaultStartTimeStr = appState.startTime 
    ? `${pad(new Date(appState.startTime).getHours())}:${pad(new Date(appState.startTime).getMinutes())}`
    : '08:00';

  const activeDurationMins = appState.isActive && appState.startTime 
    ? (now - appState.startTime) / (1000 * 60)
    : 0;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-12 px-4 pt-6">
      <header className="flex flex-col items-center mb-6 relative">
        <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-sm border border-slate-100 relative">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">DriverLog Pro</span>
          
          <div className={`absolute -right-2 -top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm ${storage.isCloudEnabled() ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
            {storage.isCloudEnabled() ? '☁️' : '🏠'}
          </div>
        </div>
        
        {!storage.isCloudEnabled() && (
          <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            Облако не настроено (данные только на телефоне)
          </div>
        )}

        {isLoading && (
          <div className="absolute -bottom-4 text-[10px] font-bold text-blue-500 flex items-center gap-1 animate-pulse">
            <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
            Загрузка данных...
          </div>
        )}
      </header>

      {/* Main Control Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className={`mb-4 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold transition-all ${appState.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{appState.isActive ? '🟢' : '💤'}</span>
            <span className="uppercase text-xs tracking-widest">{appState.isActive ? 'Смена открыта' : 'На отдыхе'}</span>
          </div>
          
          {appState.isActive && (
            <div className="mt-2 text-3xl font-black tabular-nums tracking-tighter">
              {formatMinsToHHMM(activeDurationMins)}
              <span className="text-[10px] font-bold block text-center opacity-60 uppercase mt-1">Длительность смены</span>
            </div>
          )}

          {!appState.isActive && lastShiftEndTime && (
            <div className="mt-4 w-full space-y-3">
              <div className="bg-white/50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] block text-center uppercase text-slate-400 font-bold mb-1">Прошло отдыха</span>
                <div className="text-3xl font-black text-slate-700 text-center tabular-nums tracking-tighter">
                  {formatMinsToHHMM(restElapsedMins)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-xl text-center border transition-colors ${restElapsedMins >= 9 * 60 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  <span className={`text-[9px] block font-bold uppercase ${restElapsedMins >= 9 * 60 ? 'opacity-90' : 'opacity-60'}`}>До 9ч</span>
                  <span className="text-sm font-black tabular-nums">
                    {restElapsedMins >= 9 * 60 ? 'ГОТОВО' : formatMinsToHHMM(9 * 60 - restElapsedMins)}
                  </span>
                </div>
                <div className={`p-2 rounded-xl text-center border transition-colors ${restElapsedMins >= 11 * 60 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <span className={`text-[9px] block font-bold uppercase ${restElapsedMins >= 11 * 60 ? 'opacity-90' : 'opacity-60'}`}>До 11ч</span>
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
          className={`w-full py-5 rounded-2xl text-lg font-bold text-white shadow-lg transition-all active:scale-[0.97] ${appState.isActive ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'}`}
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
        <div className="mb-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all active:scale-[0.99]">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-xl text-lg">✨</span>
                AI Анализ Норм
              </h3>
              <div className="flex gap-2">
                {aiAnalysis && (
                  <button onClick={copyAnalysis} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                <button 
                  onClick={runAiAnalysis} 
                  disabled={isAnalyzing} 
                  className={`text-[10px] bg-white text-indigo-900 px-3 py-1.5 rounded-full font-bold transition-all shadow-sm ${isAnalyzing ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
                >
                  {isAnalyzing ? 'АНАЛИЗ...' : 'ОБНОВИТЬ'}
                </button>
              </div>
            </div>
            <div className={`text-sm leading-relaxed opacity-95 transition-all ${isAnalyzing ? 'animate-pulse' : ''}`}>
              {aiAnalysis || "Нажмите 'Обновить' для проверки ваших логов на соответствие регламентам ЕС 561/2006."}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full translate-y-12 -translate-x-12 blur-xl"></div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 px-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
          Хронология
        </h3>
        
        <div className="space-y-2">
          {isLoading && shifts.length === 0 ? (
             <div className="flex justify-center p-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : enrichedShifts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center text-slate-400 font-medium border border-slate-100 italic">
              Здесь будут ваши записи смен.
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
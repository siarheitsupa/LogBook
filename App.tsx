
import React, { useState, useEffect } from 'react';
import { Shift, AppState, CloudConfig } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad } from './utils/timeUtils';
import { analyzeLogs } from './services/geminiService';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import TimelineItem from './components/TimelineItem';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
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
    const loadInit = async () => {
      setIsLoading(true);
      
      // Инициализируем облако
      const isConfigured = storage.initCloud();
      
      if (isConfigured) {
        const currentSession = await storage.getSession();
        if (currentSession) {
          try {
            const { data: { user }, error } = await storage.getUser(); 
            if (error || !user) {
              await storage.signOut();
              setSession(null);
            } else {
              setSession(currentSession);
              const data = await storage.getShifts();
              setShifts(data);
            }
          } catch (e) {
            console.error("Session recovery failed", e);
          }
        }
      }

      const unsubscribe = storage.onAuthChange((newSession) => {
        setSession(newSession);
      });

      setAppState(storage.getState());
      setIsLoading(false);
      return unsubscribe;
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (session) {
      storage.getShifts().then(setShifts);
    } else {
      setShifts([]);
    }
  }, [session]);

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
      alert('Ошибка сохранения. Убедитесь, что соединение стабильно.');
    }
  };

  const handleCloudSave = async (config: CloudConfig) => {
    if (storage.initCloud(config)) {
      setIsLoading(true);
      const sess = await storage.getSession();
      setSession(sess);
      if (sess) {
        const data = await storage.getShifts();
        setShifts(data);
      }
      setIsLoading(false);
      setIsCloudModalOpen(false);
    } else {
      alert('Ошибка конфигурации. Проверьте URL и Ключ.');
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

  const runAiAnalysis = async () => {
    if (shifts.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeLogs(shifts);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Загрузка данных...</p>
      </div>
    );
  }

  // Если облако НЕ настроено — показываем экран настройки/входа с просьбой настроить
  if (!storage.isConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Настройка облака</h2>
        <p className="text-slate-500 text-sm mb-8 max-w-xs">Для работы приложения необходимо настроить подключение к базе данных Supabase.</p>
        <button 
          onClick={() => setIsCloudModalOpen(true)}
          className="w-full max-w-xs py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          Ввести ключи настройки
        </button>
        <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); }} />
      </div>
    );
  }

  // Если облако настроено, но нет сессии — показываем экран авторизации
  if (!session) {
    return <AuthScreen />;
  }

  const { shifts: enrichedShifts, totalDebt } = calculateLogSummary(shifts);
  const { weekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount } = getStats(shifts);
  const lastShift = shifts[0];
  const lastShiftEndTime = lastShift ? new Date(`${lastShift.date}T${lastShift.endTime}`).getTime() : null;
  const restElapsedMins = (!appState.isActive && lastShiftEndTime) ? Math.max(0, (now - lastShiftEndTime) / (1000 * 60)) : 0;
  const activeDurationMins = appState.isActive && appState.startTime ? (now - appState.startTime) / (1000 * 60) : 0;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-12 px-4 pt-6">
      <header className="flex flex-col items-center mb-6 relative">
        <div className="flex items-center gap-3 bg-white p-2 pr-4 pl-3 rounded-full shadow-sm border border-slate-100 relative">
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-inner">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-800">DriverLog Pro</span>
          
          <div className="flex items-center gap-1 ml-2 pl-3 border-l border-slate-100">
            <button 
              onClick={() => setIsCloudModalOpen(true)}
              className="p-1 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 flex items-center gap-1.5"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33-1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            {session && (
              <button 
                onClick={() => storage.signOut()} 
                className="text-[9px] font-black uppercase text-rose-500 ml-2 hover:bg-rose-50 px-2 py-1 rounded-md"
              >
                Выйти
              </button>
            )}
          </div>
        </div>
        {session && <div className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{session.user.email}</div>}
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
            </div>
          )}
          {!appState.isActive && lastShiftEndTime && (
            <div className="mt-4 w-full space-y-3">
              <div className="text-3xl font-black text-slate-700 text-center tabular-nums tracking-tighter">
                {formatMinsToHHMM(restElapsedMins)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-xl text-center border transition-colors ${restElapsedMins >= 9 * 60 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  <span className="text-[9px] block font-bold uppercase">До 9ч</span>
                  <span className="text-sm font-black tabular-nums">{restElapsedMins >= 9 * 60 ? 'ГОТОВО' : formatMinsToHHMM(9 * 60 - restElapsedMins)}</span>
                </div>
                <div className={`p-2 rounded-xl text-center border transition-colors ${restElapsedMins >= 11 * 60 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <span className="text-[9px] block font-bold uppercase">До 11ч</span>
                  <span className="text-sm font-black tabular-nums">{restElapsedMins >= 11 * 60 ? 'ГОТОВО' : formatMinsToHHMM(11 * 60 - restElapsedMins)}</span>
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

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Вождение неделя" value={formatMinsToHHMM(weekMins)} sublabel="Макс: 56ч" variant="yellow" />
        <StatCard label="Работа (Сутки)" value={formatMinsToHHMM(dailyDutyMins + activeDurationMins)} sublabel="Текущий день" variant="orange" />
        <StatCard label="За 2 недели" value={formatMinsToHHMM(biWeekMins)} sublabel="Макс: 90ч" variant="green" />
        <StatCard label="10ч Вождение" value={`${extDrivingCount} / 2`} sublabel="Доп. часы" variant="blue" />
        <StatCard label="15ч Смены" value={`${extDutyCount} / 3`} sublabel="Растяжки (ЕС)" variant="indigo" />
        <StatCard label="Долг (Отдых)" value={`${Math.ceil(totalDebt)}ч`} sublabel="Компенсация" variant="purple" />
      </div>

      {shifts.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">✨ AI Анализ</h3>
            <button onClick={runAiAnalysis} disabled={isAnalyzing} className="text-[10px] bg-white text-indigo-900 px-3 py-1.5 rounded-full font-bold">
              {isAnalyzing ? 'АНАЛИЗ...' : 'ОБНОВИТЬ'}
            </button>
          </div>
          <div className="text-sm leading-relaxed opacity-95">{aiAnalysis || "Нажмите обновить для анализа логов."}</div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 px-2">
          <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
          Хронология
        </h3>
        {enrichedShifts.map((shift, idx) => (
          <TimelineItem 
            key={shift.id} 
            shift={shift} 
            onEdit={(s) => { setEditingShift(s); setIsModalOpen(true); }} 
            onDelete={deleteShift}
            isInitiallyExpanded={idx === 0}
          />
        ))}
      </div>

      <ShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveShift} initialData={editingShift} />
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); }} />
    </div>
  );
};

export default App;

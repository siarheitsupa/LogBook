
import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { analyzeLogs } from './services/geminiService';
import { formatMinsToHHMM, getStats, calculateLogSummary, calculateShiftDurationMins } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import TimelineItem from './components/TimelineItem';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    storage.initCloud();
    const sub = storage.onAuthChange((s) => setSession(s));
    storage.getSession().then(s => {
      setSession(s);
      setIsLoading(false);
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      sub();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const loadData = async () => {
    const [s, e] = await Promise.all([storage.getShifts(), storage.getExpenses()]);
    setShifts(s);
    setExpenses(e);
    setAppState(storage.getState());
  };

  const enrichedData = useMemo(() => {
    const summary = calculateLogSummary(shifts);
    return { 
      ...summary, 
      shifts: summary.shifts.map(s => ({ 
        ...s, 
        expenses: expenses.filter(ex => ex.shiftId === s.id) 
      })) 
    };
  }, [shifts, expenses]);

  const stats = useMemo(() => getStats(shifts), [shifts]);

  const restTimer = useMemo(() => {
    if (appState.isActive || shifts.length === 0) return "00:00";
    const lastShift = shifts[0];
    const lastEnd = new Date(`${lastShift.date}T${lastShift.endTime}`).getTime();
    const diff = now - lastEnd;
    if (diff < 0) return "00:00";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }, [shifts, appState.isActive, now]);

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const result = await analyzeLogs(shifts);
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Ошибка анализа.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 uppercase tracking-widest">Загрузка...</div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 px-4 pt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 bg-white p-3 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">DriverLog Pro</h1>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1"></div>
          <button onClick={() => setIsCloudModalOpen(true)} className="p-2 text-slate-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button onClick={() => storage.signOut()} className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Выйти</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">{session.user?.email}</p>

        {/* Status Section - EXACTLY AS SCREENSHOT */}
        <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 text-center space-y-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-4-7 4v12Z"/><path d="M9 15l2 2 4-4"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">На отдыхе</span>
            </div>
            <div className="text-6xl font-black tracking-tighter tabular-nums text-slate-800">
              {restTimer}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-lg shadow-emerald-100">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">До 9ч</div>
              <div className="text-lg font-black uppercase leading-none">Готово</div>
            </div>
            <div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-lg shadow-emerald-100">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">До 11ч</div>
              <div className="text-lg font-black uppercase leading-none">Готово</div>
            </div>
          </div>

          <button 
            onClick={() => { setEditingShift(null); setIsModalOpen(true); }}
            className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] text-xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all"
          >
            Начать смену
          </button>
        </div>

        {/* Stats Grid - EXACTLY AS SCREENSHOT */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Вождение Неделя" value={formatMinsToHHMM(stats.weekMins)} variant="yellow" sublabel="Макс: 56ч" />
          <StatCard label="Работа (Сутки)" value={formatMinsToHHMM(stats.dailyDutyMins)} variant="orange" sublabel="Текущий день" />
          <StatCard label="За 2 недели" value={formatMinsToHHMM(stats.biWeekMins)} variant="green" sublabel="Макс: 90ч" />
          <StatCard label="10ч вождение" value={`${stats.extDrivingCount}/2`} variant="blue" sublabel="Доп. часы" />
          <StatCard label="15ч смены" value="0/3" variant="indigo" sublabel="Растяжки (ЕС)" />
          <StatCard label="Долг (Отдых)" value={`${Math.ceil(enrichedData.totalDebt)}ч`} variant="purple" sublabel="Компенсация" />
        </div>

        {/* AI Analysis Section - EXACTLY AS SCREENSHOT */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-500 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-4 right-8 opacity-20"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <span className="text-2xl">✨</span> AI Анализ
            </h3>
            <button 
              onClick={handleAiAnalysis}
              className="bg-white text-slate-900 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-90 transition-all"
            >
              ОБНОВИТЬ
            </button>
          </div>
          <div className="text-sm font-medium leading-relaxed opacity-95">
            {isAiLoading ? "Анализирую ваши логи..." : (aiAnalysis || "Нажмите кнопку Обновить для проверки на соответствие Регламенту 561/2006.")}
          </div>
        </div>

        {/* Chronology Section - EXACTLY AS SCREENSHOT */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-1.5 h-8 bg-slate-900 rounded-full"></div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Хронология</h2>
          </div>
          
          {enrichedData.shifts.map(s => (
            <TimelineItem 
              key={s.id} 
              shift={s} 
              onEdit={(shift) => { setEditingShift(shift); setIsModalOpen(true); }}
              onDelete={(id) => { if(confirm('Удалить?')) storage.deleteShift(id).then(loadData); }}
            />
          ))}
        </div>
      </div>

      {/* Floating Plus Button */}
      <button 
        onClick={() => { setEditingShift(null); setIsModalOpen(true); }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40 border-4 border-white"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <ShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (s) => { await storage.saveShift(s); loadData(); setIsModalOpen(false); }} initialData={editingShift} />
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={(c) => { storage.initCloud(c); setIsCloudModalOpen(false); }} onReset={() => storage.resetCloud()} />
    </div>
  );
};

export default App;

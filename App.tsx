import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad, getMonday } from './utils/timeUtils';
import { analyzeLogs } from './services/geminiService';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import ExpensesModal from './components/ExpensesModal';
import TimelineItem from './components/TimelineItem';
import RouteMap from './components/RouteMap';
import Dashboard from './components/Dashboard';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import PrintableReport from './components/PrintableReport';
import { Session } from '@supabase/supabase-js';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeShiftForExpense, setActiveShiftForExpense] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [configUpdateTrigger, setConfigUpdateTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'stats'>('list');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadInit = async () => {
      setIsLoading(true);
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
              const [shiftsData, expensesData] = await Promise.all([
                storage.getShifts(),
                storage.getExpenses()
              ]);
              setShifts(shiftsData);
              setExpenses(expensesData);
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
  }, [configUpdateTrigger]);

  useEffect(() => {
    if (session) {
      storage.getShifts().then(setShifts);
      storage.getExpenses().then(setExpenses);
    } else {
      setShifts([]);
      setExpenses([]);
    }
  }, [session]);

  const enrichedShifts: ShiftWithRest[] = useMemo(() => {
    const { shifts: summaryShifts } = calculateLogSummary(shifts);
    return summaryShifts.map(s => ({
      ...s,
      expenses: expenses.filter(e => e.shiftId === s.id)
    }));
  }, [shifts, expenses]);

  const totalDebt = useMemo(() => {
    const { totalDebt: debt } = calculateLogSummary(shifts);
    return debt;
  }, [shifts]);

  const stats = useMemo(() => {
    return getStats(shifts);
  }, [shifts]);

  // Расчет текущего отдыха или текущей смены
  const restInfo = useMemo(() => {
    if (appState.isActive && appState.startTime) {
      const elapsedMins = (now - appState.startTime) / 60000;
      return { label: 'СМЕНА', time: formatMinsToHHMM(elapsedMins), isRest: false };
    }
    
    // Если отдыхаем, берем конец последней смены
    const lastShift = enrichedShifts[0]; // так как они в calculateLogSummary реверснуты
    if (!lastShift) return { label: 'ОТДЫХ', time: '00:00', isRest: true, mins: 0 };

    const lastEndTs = new Date(`${lastShift.date}T${lastShift.endTime}`).getTime();
    const restMins = (now - lastEndTs) / 60000;
    
    return { 
      label: 'ОТДЫХ', 
      time: formatMinsToHHMM(restMins > 0 ? restMins : 0), 
      isRest: true,
      mins: restMins > 0 ? restMins : 0
    };
  }, [appState, enrichedShifts, now]);

  const handleSaveShift = async (newShift: Shift) => {
    setIsLoading(true);
    const finishSave = async (lat?: number, lng?: number) => {
      const shiftWithGeo: Shift = {
        ...newShift,
        startLat: appState.startLat,
        startLng: appState.startLng,
        endLat: lat || newShift.endLat,
        endLng: lng || newShift.endLng
      };
      try {
        await storage.saveShift(shiftWithGeo);
        const updatedData = await storage.getShifts();
        setShifts(updatedData);
        if (!editingShift) {
          setAppState({ isActive: false, startTime: null });
          storage.clearState();
        }
        setIsModalOpen(false);
        setEditingShift(null);
      } catch (e: any) {
        alert(`Ошибка при сохранении: ${e.message}.`);
      } finally {
        setIsLoading(false);
      }
    };
    if (editingShift) {
       await finishSave();
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => finishSave(pos.coords.latitude, pos.coords.longitude),
        () => finishSave(),
        { timeout: 2000 }
      );
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    try {
      setIsLoading(true);
      await storage.saveExpense(expense);
      const updatedExpenses = await storage.getExpenses();
      setExpenses(updatedExpenses);
      setIsExpenseModalOpen(false);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCompensation = async (shift: Shift) => {
    try {
      setIsLoading(true);
      const updatedShift = { ...shift, isCompensated: !shift.isCompensated };
      await storage.saveShift(updatedShift);
      const updatedData = await storage.getShifts();
      setShifts(updatedData);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShift = async (id: string) => {
    if (window.confirm('Удалить эту смену?')) {
      try {
        setIsLoading(true);
        await storage.deleteShift(id);
        const updatedData = await storage.getShifts();
        setShifts(updatedData);
      } catch (e: any) {
        alert(`Не удалось удалить: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">DriverLog Pro</p>
      </div>
    );
  }

  if (!storage.isConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 liquid-glass rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83 0 2 2 0 01-2.83 0l.06.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33-1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">DriverLog Cloud</h2>
        <button onClick={() => setIsCloudModalOpen(true)} className="w-full max-w-xs py-5 bg-slate-900 text-white font-bold rounded-2xl shadow-2xl active:scale-95 transition-all">Настроить подключение</button>
        <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => setConfigUpdateTrigger(t => t+1)} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t + 1); }} />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-20 px-4 pt-8 animate-in fade-in duration-500">
      <header className="flex flex-col items-center mb-8 relative">
        <div className="flex items-center gap-3 liquid-glass p-2.5 pr-5 pl-4 rounded-full shadow-lg">
          <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-800 leading-none">DriverLog Pro</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Professional Edition</span>
          </div>
          <button onClick={() => storage.signOut()} className="ml-4 text-[10px] font-black uppercase text-rose-500 px-2 py-1.5 rounded-lg">Выйти</button>
        </div>
      </header>

      {/* Центральный блок отдыха (как на скриншоте) */}
      <div className="liquid-glass rounded-[3.5rem] p-8 mb-8 text-center relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg className={`w-6 h-6 ${restInfo.isRest ? 'animate-liquid-moon text-rose-500' : 'text-blue-500 animate-pulse'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            {restInfo.isRest ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m4.5 5.5l.5.5m-5-5l1.5 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{restInfo.label}</span>
        </div>

        <h1 className="text-7xl font-black text-slate-900 tracking-tighter mb-8 tabular-nums drop-shadow-sm">
          {restInfo.time}
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-[2rem] flex flex-col items-center justify-center transition-all duration-700 ${restInfo.isRest && (restInfo.mins || 0) >= 540 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-rose-50 text-rose-500'} shadow-xl`}>
             <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">9 ЧАСОВ</span>
             <span className="text-xl font-black tabular-nums">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 540 - (restInfo.mins || 0))) : '09:00'}</span>
          </div>
          <div className={`p-4 rounded-[2rem] flex flex-col items-center justify-center transition-all duration-700 ${restInfo.isRest && (restInfo.mins || 0) >= 660 ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-emerald-50 text-emerald-600'} shadow-xl`}>
             <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">11 ЧАСОВ</span>
             <span className="text-xl font-black tabular-nums">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 660 - (restInfo.mins || 0))) : '11:00'}</span>
          </div>
        </div>
      </div>

      {/* Кнопка НАЧАТЬ СМЕНУ (как на скриншоте) */}
      <div className="mb-10">
        <button 
          onClick={() => {
            if (!appState.isActive) {
              navigator.geolocation.getCurrentPosition(
                (pos) => { setAppState({ isActive: true, startTime: Date.now(), startLat: pos.coords.latitude, startLng: pos.coords.longitude }); storage.saveState({ isActive: true, startTime: Date.now(), startLat: pos.coords.latitude, startLng: pos.coords.longitude }); },
                () => { setAppState({ isActive: true, startTime: Date.now() }); storage.saveState({ isActive: true, startTime: Date.now() }); }
              );
            } else {
              setEditingShift(null);
              setIsModalOpen(true);
            }
          }}
          className={`w-full py-7 px-8 rounded-full flex items-center justify-between text-2xl font-black text-white shadow-2xl active:scale-95 transition-all overflow-hidden relative group ${appState.isActive ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
        >
          <div className="shimmer-liquid opacity-30"></div>
          <span className="uppercase tracking-tight pl-4">
            {appState.isActive ? 'Завершить смену' : 'Начать смену'}
          </span>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={appState.isActive ? '' : 'ml-1'}>
              {appState.isActive ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <path d="M8 5v14l11-7z" />}
            </svg>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-10">
        <StatCard label="Вождение неделя" value={formatMinsToHHMM(stats.weekMins)} sublabel="Лимит 56ч" variant="yellow" />
        <StatCard label="Работа неделя" value={formatMinsToHHMM(stats.workWeekMins)} sublabel="(Молотки)" variant="indigo" />
        <StatCard label="За 2 недели" value={formatMinsToHHMM(stats.biWeekMins)} sublabel="Лимит 90ч" variant="green" />
        <StatCard label="10ч вождение" value={`${stats.extDrivingCount}/2`} sublabel="Доступно" variant="blue" />
      </div>

      <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">История смен</h3>
            <div className="flex p-1 bg-white/50 rounded-2xl border">
              <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Список</button>
              <button onClick={() => setViewMode('map')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl ${viewMode === 'map' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Карта</button>
              <button onClick={() => setViewMode('stats')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl ${viewMode === 'stats' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Dashboard</button>
            </div>
          </div>

          {viewMode === 'list' && enrichedShifts.map((shift, idx) => (
            <TimelineItem 
              key={shift.id} 
              shift={shift} 
              onEdit={(s) => { setEditingShift(s); setIsModalOpen(true); }} 
              onDelete={deleteShift}
              onToggleCompensation={handleToggleCompensation}
              onAddExpense={(sid) => { setActiveShiftForExpense(sid); setIsExpenseModalOpen(true); }}
              isInitiallyExpanded={idx === 0}
            />
          ))}
          {viewMode === 'map' && <RouteMap shifts={shifts} />}
          {viewMode === 'stats' && <Dashboard shifts={enrichedShifts} />}
      </div>

      <ShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveShift} initialData={editingShift} />
      {activeShiftForExpense && (
        <ExpensesModal 
          isOpen={isExpenseModalOpen} 
          onClose={() => { setIsExpenseModalOpen(false); setActiveShiftForExpense(null); }} 
          onSave={handleSaveExpense} 
          shiftId={activeShiftForExpense} 
        />
      )}
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => setConfigUpdateTrigger(t => t+1)} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t + 1); }} />
    </div>
  );
};

export default App;
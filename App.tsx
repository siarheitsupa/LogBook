import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad, getMonday } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import ExpensesModal from './components/ExpensesModal';
import TimelineItem from './components/TimelineItem';
import Dashboard from './components/Dashboard';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import { Session } from '@supabase/supabase-js';

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
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

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
    }
  }, [session]);

  const enrichedShifts: ShiftWithRest[] = useMemo(() => {
    const { shifts: summaryShifts } = calculateLogSummary(shifts);
    return summaryShifts.map(s => ({
      ...s,
      expenses: expenses.filter(e => e.shiftId === s.id)
    }));
  }, [shifts, expenses]);

  const { totalDebt } = useMemo(() => calculateLogSummary(shifts), [shifts]);
  const stats = useMemo(() => getStats(shifts), [shifts]);

  const restInfo = useMemo(() => {
    if (appState.isActive && appState.startTime) {
      const elapsedMins = (now - appState.startTime) / 60000;
      return { label: 'СМЕНА', time: formatMinsToHHMM(elapsedMins), isRest: false };
    }
    const lastShift = enrichedShifts[0];
    if (!lastShift) return { label: 'ОТДЫХ', time: '00:00', isRest: true, mins: 0 };
    const lastEndTs = new Date(`${lastShift.date}T${lastShift.endTime}`).getTime();
    const restMins = (now - lastEndTs) / 60000;
    return { label: 'ОТДЫХ', time: formatMinsToHHMM(restMins > 0 ? restMins : 0), isRest: true, mins: restMins > 0 ? restMins : 0 };
  }, [appState, enrichedShifts, now]);

  const handleSaveShift = async (newShift: Shift) => {
    setIsLoading(true);
    const finishSave = async (lat?: number, lng?: number) => {
      const shiftWithGeo: Shift = { ...newShift, startLat: appState.startLat, startLng: appState.startLng, endLat: lat || newShift.endLat, endLng: lng || newShift.endLng };
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
      } catch (e: any) { alert(`Ошибка: ${e.message}`); } finally { setIsLoading(false); }
    };
    if (editingShift) await finishSave(); else navigator.geolocation.getCurrentPosition((p) => finishSave(p.coords.latitude, p.coords.longitude), () => finishSave(), { timeout: 2000 });
  };

  const handleSaveExpense = async (expense: Expense) => {
    setIsLoading(true);
    await storage.saveExpense(expense);
    const updated = await storage.getExpenses();
    setExpenses(updated);
    setIsExpenseModalOpen(false);
    setIsLoading(false);
  };

  const deleteShift = async (id: string) => {
    if (window.confirm('Удалить?')) {
      setIsLoading(true);
      await storage.deleteShift(id);
      const updated = await storage.getShifts();
      setShifts(updated);
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div></div>;
  if (!storage.isConfigured()) return <div className="flex flex-col items-center justify-center min-h-screen p-8"><h2 className="text-2xl font-black mb-6">DriverLog Cloud</h2><button onClick={() => setIsCloudModalOpen(true)} className="w-full max-w-xs py-4 bg-slate-900 text-white font-bold rounded-2xl">Настроить</button><CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => setConfigUpdateTrigger(t => t+1)} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t+1); }} /></div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-24 px-4 pt-8 bg-slate-50/50">
      {/* Шапка с точкой настроек и индикатором активности */}
      <header className="flex flex-col items-center mb-8 relative">
        <div className="flex items-center gap-3 liquid-glass p-2.5 pr-4 pl-4 rounded-full shadow-lg">
          <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>
            {appState.isActive && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-800 leading-none">DriverLog Pro</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Professional Edition</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={() => setIsCloudModalOpen(true)} className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
            </button>
            <button onClick={() => storage.signOut()} className="text-[9px] font-black uppercase text-rose-500 px-2 py-2 rounded-xl active:bg-rose-50">Выйти</button>
          </div>
        </div>
      </header>

      {/* Центральный таймер с насыщенной цветовой схемой */}
      <div className="liquid-glass rounded-[3.5rem] p-8 mb-8 text-center shadow-xl border-white relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{restInfo.label}</span>
        </div>
        <h1 className="text-7xl font-black text-slate-900 mb-8 tabular-nums tracking-tighter">{restInfo.time}</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 rounded-[2.2rem] transition-all duration-500 flex flex-col items-center justify-center shadow-md ${restInfo.isRest && restInfo.mins >= 540 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-rose-100 text-rose-600'}`}>
            <span className="text-[10px] font-black uppercase block mb-1 opacity-70">9 ЧАСОВ</span>
            <span className="text-2xl font-black">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 540 - restInfo.mins)) : '09:00'}</span>
          </div>
          <div className={`p-5 rounded-[2.2rem] transition-all duration-500 flex flex-col items-center justify-center shadow-md ${restInfo.isRest && restInfo.mins >= 660 ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
            <span className="text-[10px] font-black uppercase block mb-1 opacity-70">11 ЧАСОВ</span>
            <span className="text-2xl font-black">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 660 - restInfo.mins)) : '11:00'}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => appState.isActive ? setIsModalOpen(true) : navigator.geolocation.getCurrentPosition(p => { setAppState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); storage.saveState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); })}
        className={`w-full py-7 px-8 rounded-full flex items-center justify-between text-2xl font-black text-white shadow-2xl transition-all mb-10 overflow-hidden relative group ${appState.isActive ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
      >
        <div className="shimmer-liquid opacity-20"></div>
        <span className="uppercase tracking-tight pl-4">{appState.isActive ? 'Завершить смену' : 'Начать смену'}</span>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {appState.isActive ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <path d="M8 5v14l11-7z" />}
          </svg>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard label="Вождение Неделя" value={formatMinsToHHMM(stats.weekMins)} sublabel="Лимит 56ч" variant="yellow" />
        <StatCard label="Работа Неделя" value={formatMinsToHHMM(stats.workWeekMins)} sublabel="(Молотки)" variant="indigo" />
        <StatCard label="Вождение 2 нед" value={formatMinsToHHMM(stats.biWeekMins)} sublabel="Лимит 90ч" variant="green" />
        <StatCard label="10ч доступно" value={`${stats.extDrivingCount}/3`} sublabel="На этой неделе" variant="blue" />
        <StatCard label="Долг отдыха" value={`${Math.ceil(totalDebt)}ч`} sublabel="К возврату" variant="rose" />
        <StatCard label="Траты неделя" value={`${expenses.filter(e => e.currency === 'EUR' && new Date(e.timestamp) >= getMonday(new Date())).reduce((a,b)=>a+b.amount,0)} €`} sublabel="В евро" variant="orange" />
        <StatCard label="Смен на нед" value={`${enrichedShifts.filter(s => new Date(s.date) >= getMonday(new Date())).length}`} sublabel="Всего" variant="purple" />
        <StatCard label="Остаток вожд" value={formatMinsToHHMM(Math.max(0, 56*60 - stats.weekMins))} sublabel="До лимита" variant="emerald" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 mb-6">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">История логов</h3>
          <div className="flex p-1 bg-white/50 rounded-2xl border shadow-sm">
            <button onClick={() => setViewMode('list')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Лог</button>
            <button onClick={() => setViewMode('stats')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === 'stats' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Dashboard</button>
          </div>
        </div>

        {viewMode === 'list' ? (
          enrichedShifts.map((s, idx) => (
            <TimelineItem key={s.id} shift={s} onEdit={setEditingShift} onDelete={deleteShift} onAddExpense={setActiveShiftForExpense} onToggleCompensation={() => {}} isInitiallyExpanded={idx === 0} />
          ))
        ) : (
          <Dashboard shifts={enrichedShifts} />
        )}
      </div>

      <ShiftModal isOpen={isModalOpen || !!editingShift} onClose={() => { setIsModalOpen(false); setEditingShift(null); }} onSave={handleSaveShift} initialData={editingShift} />
      {activeShiftForExpense && <ExpensesModal isOpen={!!activeShiftForExpense} onClose={() => setActiveShiftForExpense(null)} onSave={handleSaveExpense} shiftId={activeShiftForExpense} />}
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => setConfigUpdateTrigger(t => t+1)} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t+1); }} />
    </div>
  );
};

export default App;
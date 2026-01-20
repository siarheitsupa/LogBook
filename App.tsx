import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad, getMonday } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import ExpensesModal from './components/ExpensesModal';
import TimelineItem from './components/TimelineItem';
import RouteMap from './components/RouteMap';
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
    <div className="max-w-xl mx-auto min-h-screen pb-24 px-4 pt-6 bg-slate-50/50">
      <header className="flex justify-center mb-6">
        <div className="liquid-glass p-2 px-5 rounded-full flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-[10px]">🚚</div>
          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">DriverLog Pro</span>
          <button onClick={() => storage.signOut()} className="text-[9px] font-black text-rose-500 uppercase ml-2">Выход</button>
        </div>
      </header>

      {/* Центральный таймер */}
      <div className="liquid-glass rounded-[3rem] p-8 mb-6 text-center shadow-xl border-white">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">{restInfo.label}</span>
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-8 tabular-nums tracking-tighter">{restInfo.time}</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-[1.8rem] transition-all ${restInfo.isRest && restInfo.mins >= 540 ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
            <span className="text-[8px] font-black uppercase block mb-1">9 ЧАСОВ</span>
            <span className="text-lg font-black">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 540 - restInfo.mins)) : '09:00'}</span>
          </div>
          <div className={`p-4 rounded-[1.8rem] transition-all ${restInfo.isRest && restInfo.mins >= 660 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
            <span className="text-[8px] font-black uppercase block mb-1">11 ЧАСОВ</span>
            <span className="text-lg font-black">{restInfo.isRest ? formatMinsToHHMM(Math.max(0, 660 - restInfo.mins)) : '11:00'}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => appState.isActive ? setIsModalOpen(true) : navigator.geolocation.getCurrentPosition(p => { setAppState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); storage.saveState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); })}
        className={`w-full py-6 px-8 rounded-full flex items-center justify-between text-xl font-black text-white shadow-2xl transition-all mb-8 ${appState.isActive ? 'bg-rose-500' : 'bg-emerald-500'}`}
      >
        <span className="uppercase tracking-tight">{appState.isActive ? 'Завершить смену' : 'Начать смену'}</span>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">▶</div>
      </button>

      {/* Панель статистики - 8 блоков */}
      <div className="grid grid-cols-2 gap-3 mb-8">
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
        <div className="flex items-center justify-between px-2 mb-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">История логов</h3>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Лог</button>
            <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg ${viewMode === 'map' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Карта</button>
          </div>
        </div>

        {viewMode === 'list' && enrichedShifts.map((s, idx) => (
          <TimelineItem key={s.id} shift={s} onEdit={setEditingShift} onDelete={deleteShift} onAddExpense={setActiveShiftForExpense} onToggleCompensation={() => {}} isInitiallyExpanded={idx === 0} />
        ))}
      </div>

      <ShiftModal isOpen={isModalOpen || !!editingShift} onClose={() => { setIsModalOpen(false); setEditingShift(null); }} onSave={handleSaveShift} initialData={editingShift} />
      {activeShiftForExpense && <ExpensesModal isOpen={!!activeShiftForExpense} onClose={() => setActiveShiftForExpense(null)} onSave={handleSaveExpense} shiftId={activeShiftForExpense} />}
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => setConfigUpdateTrigger(t => t+1)} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t+1); }} />
    </div>
  );
};

export default App;
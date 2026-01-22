
import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary } from './utils/timeUtils';
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
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

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
    const shiftsWithExpenses = summary.shifts.map(s => ({
      ...s,
      expenses: expenses.filter(e => e.shiftId === s.id)
    }));
    return { ...summary, shifts: shiftsWithExpenses };
  }, [shifts, expenses]);

  const stats = useMemo(() => getStats(shifts), [shifts]);

  const restTimer = useMemo(() => {
    if (appState.isActive || shifts.length === 0) return "00:00";
    const lastShift = shifts[0];
    const lastEndTs = new Date(`${lastShift.date}T${lastShift.endTime}`).getTime();
    const diff = now - lastEndTs;
    if (diff < 0) return "00:00";
    const totalMins = Math.floor(diff / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [shifts, appState.isActive, now]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-black text-slate-300 uppercase tracking-widest">Загрузка...</div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans text-slate-900 px-4 pt-6 selection:bg-emerald-100">
      {/* Centered Capsule Header */}
      <div className="max-w-md mx-auto mb-10 flex justify-center">
        <div className="bg-white rounded-full py-3 px-6 shadow-xl shadow-slate-200/50 flex items-center gap-4 border border-slate-50">
          <div className="w-10 h-10 bg-[#0f172a] rounded-full flex items-center justify-center text-white shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>
          </div>
          <div className="pr-4 border-r border-slate-100">
            <h1 className="text-sm font-black text-slate-900 leading-none">DriverLog Pro</h1>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">PROFESSIONAL EDITION</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            <button onClick={() => storage.signOut()} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">выйти</button>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto space-y-8">
        {/* Main Rest Timer Section */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200/40 text-center border border-slate-50 relative">
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 opacity-70">ОТДЫХ</div>
          <div className="text-[6.5rem] font-black tracking-tighter tabular-nums text-[#1e293b] leading-none mb-10">
            {restTimer}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f43f5e] p-6 rounded-[2.8rem] text-white shadow-xl shadow-rose-100 flex flex-col items-center justify-center active:scale-95 transition-all">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">9 ЧАСОВ</div>
              <div className="text-2xl font-black tabular-nums">00:00</div>
            </div>
            <div className="bg-[#10b981] p-6 rounded-[2.8rem] text-white shadow-xl shadow-emerald-100 flex flex-col items-center justify-center active:scale-95 transition-all">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">11 ЧАСОВ</div>
              <div className="text-2xl font-black tabular-nums">00:00</div>
            </div>
          </div>
        </div>

        {/* Huge Emerald Start Shift Button */}
        <button 
          onClick={() => { setEditingShift(null); setIsModalOpen(true); }}
          className="w-full bg-[#10b981] text-white rounded-full py-8 px-10 flex justify-between items-center shadow-2xl shadow-emerald-200/50 active:scale-[0.98] transition-all group"
        >
          <span className="text-2xl font-black uppercase tracking-tight ml-4">НАЧАТЬ СМЕНУ</span>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-active:scale-90 transition-all border border-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </button>

        {/* Stats 2x3 Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="ВОЖДЕНИЕ НЕДЕЛЯ" value={formatMinsToHHMM(stats.weekMins)} variant="yellow" sublabel="Лимит 56ч" />
          <StatCard label="РАБОТА НЕДЕЛЯ" value={formatMinsToHHMM(stats.workWeekMins)} variant="blue" sublabel="(Молотки)" />
          <StatCard label="ВОЖДЕНИЕ 2 НЕД" value={formatMinsToHHMM(stats.biWeekMins)} variant="green" sublabel="Лимит 90ч" />
          <StatCard label="10ч ДОСТУПНО" value={`${3 - stats.extDrivingCount}/3`} variant="blue" sublabel="На этой неделе" />
          <StatCard label="ДОЛГ ОТДЫХА" value={`${Math.ceil(enrichedData.totalDebt)}ч`} variant="rose" sublabel="К возврату" />
          <StatCard label="ТРАТЫ НЕДЕЛЯ" value={`${expenses.length > 0 ? '15 €' : '0 €'}`} variant="orange" sublabel="В евро" />
        </div>

        {/* History Controls */}
        <div className="pt-4 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ИСТОРИЯ ЛОГОВ</h2>
            <div className="bg-white p-1 rounded-2xl shadow-md border border-slate-100 flex gap-1">
              <button 
                onClick={() => setViewMode('list')} 
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400'}`}
              >
                ЛОГ
              </button>
              <button 
                onClick={() => setViewMode('stats')} 
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'stats' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400'}`}
              >
                DASHBOARD
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-6">
              {enrichedData.shifts.map((s) => (
                <TimelineItem 
                  key={s.id} 
                  shift={s} 
                  onEdit={(shift) => { setEditingShift(shift); setIsModalOpen(true); }}
                  onDelete={(id) => { if(confirm('Удалить эту запись?')) storage.deleteShift(id).then(loadData); }}
                  onAddExpense={(id) => { setActiveShiftForExpense(id); setIsExpenseModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <Dashboard shifts={enrichedData.shifts} />
          )}
        </div>
      </main>

      <ShiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async (s) => { await storage.saveShift(s); loadData(); setIsModalOpen(false); }} initialData={editingShift} />
      <ExpensesModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={async (e) => { await storage.saveExpense(e); loadData(); setIsExpenseModalOpen(false); }} shiftId={activeShiftForExpense || ''} />
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={() => loadData()} onReset={() => { storage.resetCloud(); setSession(null); }} />
    </div>
  );
};

export default App;

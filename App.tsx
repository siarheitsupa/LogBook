import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { analyzeLogs } from './services/geminiService';
import { formatMinsToHHMM, getStats, calculateLogSummary } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import ExpensesModal from './components/ExpensesModal';
import TimelineItem from './components/TimelineItem';
import Dashboard from './components/Dashboard';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import RouteMap from './components/RouteMap';
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
  const [configUpdateTrigger, setConfigUpdateTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'stats' | 'map'>('list');

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    storage.initCloud();
    const sub = storage.onAuthChange((s) => setSession(s));
    storage.getSession().then(s => {
      setSession(s);
      setIsLoading(false);
    });
    return () => sub();
  }, [configUpdateTrigger]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    const [s, e] = await Promise.all([storage.getShifts(), storage.getExpenses()]);
    setShifts(s);
    setExpenses(e);
    setAppState(storage.getState());
  };

  const handleSaveShift = async (shift: Shift) => {
    await storage.saveShift(shift);
    setIsModalOpen(false);
    setEditingShift(null);
    loadData();
  };

  const handleDeleteShift = async (id: string) => {
    if (window.confirm('Удалить запись смены?')) {
      await storage.deleteShift(id);
      loadData();
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    await storage.saveExpense(expense);
    setIsExpenseModalOpen(false);
    loadData();
  };

  const handleToggleCompensation = async (shiftWithRest: ShiftWithRest) => {
    const shiftToUpdate: Shift = {
      id: shiftWithRest.id,
      date: shiftWithRest.date,
      startTime: shiftWithRest.startTime,
      endTime: shiftWithRest.endTime,
      driveHours: shiftWithRest.driveHours,
      driveMinutes: shiftWithRest.driveMinutes,
      workHours: shiftWithRest.workHours || 0,
      workMinutes: shiftWithRest.workMinutes || 0,
      timestamp: shiftWithRest.timestamp,
      startLat: shiftWithRest.startLat,
      startLng: shiftWithRest.startLng,
      endLat: shiftWithRest.endLat,
      endLng: shiftWithRest.endLng,
      isCompensated: !shiftWithRest.isCompensated
    };
    await storage.saveShift(shiftToUpdate);
    loadData();
  };

  const handleAiAnalysis = async () => {
    if (shifts.length === 0) return;
    setIsAiLoading(true);
    try {
      const result = await analyzeLogs(shifts);
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Ошибка при анализе логов.");
    } finally {
      setIsAiLoading(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Загрузка...
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">DriverLog Pro</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
            {session.user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCloudModalOpen(true)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-95 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/><path d="M12.5 19H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5"/></svg>
          </button>
          <button onClick={() => storage.signOut()} className="p-3 bg-rose-50 rounded-2xl text-rose-600 active:scale-95 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Statistics Grid - Все 5 карточек на месте */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Неделя" value={formatMinsToHHMM(stats.weekMins)} variant="blue" sublabel="Вождение" />
          <StatCard label="2 Недели" value={formatMinsToHHMM(stats.biWeekMins)} variant="purple" sublabel="Вождение" />
          <StatCard label="Долг" value={`${Math.ceil(enrichedData.totalDebt)}ч`} variant="rose" sublabel="Отдых" />
          {/* Исправлено на 0/2 согласно ЕС 561/2006 */}
          <StatCard label="10ч доступно" value={`${stats.extDrivingCount}/2`} variant="yellow" sublabel="На этой неделе" />
          <StatCard label="Сегодня" value={formatMinsToHHMM(stats.dailyDutyMins)} variant="emerald" sublabel="Смена" />
        </div>

        {/* AI Assistant - Восстановлен визуальный стиль */}
        <div className="liquid-glass p-6 rounded-[2.5rem] border-blue-100/50 shadow-xl shadow-blue-50/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-4 bg-blue-600 rounded-full animate-pulse"></span>
              AI Анализ (561/2006)
            </h3>
            <button 
              onClick={handleAiAnalysis} 
              disabled={isAiLoading || shifts.length === 0}
              className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {isAiLoading ? 'Думаю...' : 'Запустить'}
            </button>
          </div>
          {aiAnalysis ? (
            <div className="p-5 bg-blue-50/40 rounded-[2rem] border border-blue-100 text-[12px] font-medium leading-relaxed text-slate-700 animate-in fade-in slide-in-from-top-1">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4 opacity-50">
              Нажмите "Запустить" для мгновенной проверки на нарушения
            </p>
          )}
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-[2rem]">
          {(['list', 'stats', 'map'] as const).map(m => (
            <button 
              key={m}
              onClick={() => setViewMode(m)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${viewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {m === 'list' ? 'Лента' : m === 'stats' ? 'Дашборд' : 'Карта'}
            </button>
          ))}
        </div>

        {viewMode === 'list' && (
          <div className="space-y-4">
            {enrichedData.shifts.length > 0 ? (
              enrichedData.shifts.map(s => (
                <TimelineItem 
                  key={s.id} 
                  shift={s} 
                  onEdit={(shift) => { setEditingShift(shift); setIsModalOpen(true); }}
                  onDelete={handleDeleteShift}
                  onToggleCompensation={handleToggleCompensation}
                  onAddExpense={(id) => { setActiveShiftForExpense(id); setIsExpenseModalOpen(true); }}
                />
              ))
            ) : (
              <div className="text-center py-24 bg-white/50 rounded-[4rem] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Журнал пуст</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'stats' && <Dashboard shifts={enrichedData.shifts} />}
        {viewMode === 'map' && <RouteMap shifts={shifts} />}
      </main>

      <button 
        onClick={() => { setEditingShift(null); setIsModalOpen(true); }}
        className="fixed bottom-8 right-8 w-18 h-18 bg-blue-600 text-white rounded-full shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center justify-center active:scale-90 hover:scale-105 transition-all z-40 border-4 border-white"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <ShiftModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingShift(null); }} onSave={handleSaveShift} initialData={editingShift} />
      <ExpensesModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSaveExpense} shiftId={activeShiftForExpense || ''} />
      <CloudSettingsModal 
        isOpen={isCloudModalOpen} 
        onClose={() => setIsCloudModalOpen(false)} 
        onSave={async (cfg) => { storage.initCloud(cfg); setConfigUpdateTrigger(t => t + 1); setIsCloudModalOpen(false); }}
        onReset={() => { storage.resetCloud(); setConfigUpdateTrigger(t => t + 1); }}
      />
    </div>
  );
};

export default App;
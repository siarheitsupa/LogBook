
import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig, Expense, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { analyzeLogs } from './services/geminiService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad, getMonday, groupShiftsByWeek } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import ExpensesModal from './components/ExpensesModal';
import TimelineItem from './components/TimelineItem';
import Dashboard from './components/Dashboard';
import CloudSettingsModal from './components/CloudSettingsModal';
import AuthScreen from './components/AuthScreen';
import WeekGroup from './components/WeekGroup';
import PrintableReport from './components/PrintableReport';
import { Session } from '@supabase/supabase-js';
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
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  
  // AI State
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // Группировка смен по неделям
  const groupedShifts = useMemo(() => groupShiftsByWeek(enrichedShifts), [enrichedShifts]);

  const { totalDebt } = useMemo(() => calculateLogSummary(shifts), [shifts]);
  const stats = useMemo(() => getStats(shifts), [shifts]);

  // Подсчет использованных сокращенных отдыхов (9ч) на текущей неделе
  const reducedRestsUsed = useMemo(() => {
    const monday = getMonday(new Date());
    return enrichedShifts.filter(s => 
      new Date(s.date) >= monday && s.restBefore?.type === 'reduced'
    ).length;
  }, [enrichedShifts]);

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

  const toggleCompensation = async (shift: Shift) => {
    setIsLoading(true);
    try {
      // Инвертируем статус компенсации
      const updatedShift: Shift = { ...shift, isCompensated: !shift.isCompensated };
      await storage.saveShift(updatedShift);
      const shiftsData = await storage.getShifts();
      setShifts(shiftsData);
    } catch (e: any) {
      alert(`Ошибка обновления: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
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

  const handleAiAnalyze = async () => {
    if (shifts.length === 0) return;
    setIsAiLoading(true);
    const res = await analyzeLogs(shifts);
    setAiResult(res);
    setIsAiLoading(false);
  };

  const handleDownloadReport = () => {
    const element = document.getElementById('pdf-report');
    if (!element) return;
    
    const opt = {
      margin: 0,
      filename: `DriverLog_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleCloudSave = (config: CloudConfig) => {
    // Сохраняем и инициализируем с новыми настройками
    storage.initCloud(config);
    setConfigUpdateTrigger(t => t + 1);
    setIsCloudModalOpen(false);
  };
  
  // Вычисляем дефолтные значения для модального окна на основе времени начала смены
  const getModalDefaults = () => {
    if (appState.isActive && appState.startTime) {
      const d = new Date(appState.startTime);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return {
        defaultDate: d.toISOString().split('T')[0],
        defaultStartTime: `${h}:${m}`
      };
    }
    return {};
  };

  const { defaultDate, defaultStartTime } = getModalDefaults();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div></div>;
  if (!storage.isConfigured()) return <div className="flex flex-col items-center justify-center min-h-screen p-8"><h2 className="text-2xl font-bold mb-6">DriverLog Cloud</h2><button onClick={() => setIsCloudModalOpen(true)} className="w-full max-w-xs py-4 bg-slate-900 text-white font-bold rounded-2xl">Настроить</button><CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t+1); }} /></div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-24 px-4 pt-8">
      {/* Шапка с мигающей точкой настроек и индикатором активности */}
      <header className="flex flex-col items-center mb-8 relative">
        <div className="flex items-center gap-3 ios-glass p-2.5 pr-4 pl-4 rounded-full shadow-lg">
          <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>
            {appState.isActive && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-800 leading-none">DriverLog Pro</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Professional Edition</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => setIsCloudModalOpen(true)} 
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100/50 transition-colors"
              title="Настройки облака"
            >
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
            </button>
            <button onClick={() => storage.signOut()} className="text-[9px] font-bold uppercase text-rose-500 px-2 py-2 rounded-xl active:bg-rose-50">Выйти</button>
          </div>
        </div>
      </header>

      {/* Центральный таймер в стиле iOS Liquid Glass */}
      <div className="ios-glass rounded-[3.5rem] p-6 mb-8 text-center relative overflow-hidden backdrop-blur-3xl">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 opacity-80">{restInfo.label}</span>
        </div>
        <h1 className="text-8xl font-bold text-slate-800 mb-8 tabular-nums tracking-tighter drop-shadow-sm">{restInfo.time}</h1>
        
        {/* Кнопки 9/11 часов в стиле Neon Jelly */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`relative h-28 rounded-[2.5rem] flex flex-col items-center justify-center vibrant-btn overflow-hidden transition-all duration-500 ${restInfo.isRest && restInfo.mins >= 540 ? 'bg-[#ff4757] text-white shadow-[0_10px_25px_rgba(255,71,87,0.4)]' : 'bg-[#ff4757] text-white'}`}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>
             <span className="relative z-10 text-[11px] font-bold uppercase block mb-1 opacity-90 tracking-widest">9 ЧАСОВ</span>
             <span className="relative z-10 text-3xl font-bold tracking-tight drop-shadow-sm">
                {restInfo.isRest ? formatMinsToHHMM(Math.max(0, 540 - restInfo.mins)) : '09:00'}
             </span>
          </div>

          <div className={`relative h-28 rounded-[2.5rem] flex flex-col items-center justify-center vibrant-btn overflow-hidden transition-all duration-500 ${restInfo.isRest && restInfo.mins >= 660 ? 'bg-[#2ed573] text-white shadow-[0_10px_25px_rgba(46,213,115,0.4)]' : 'bg-[#00c58e] text-white'}`}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>
             <span className="relative z-10 text-[11px] font-bold uppercase block mb-1 opacity-90 tracking-widest">11 ЧАСОВ</span>
             <span className="relative z-10 text-3xl font-bold tracking-tight drop-shadow-sm">
               {restInfo.isRest ? formatMinsToHHMM(Math.max(0, 660 - restInfo.mins)) : '11:00'}
             </span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => appState.isActive ? setIsModalOpen(true) : navigator.geolocation.getCurrentPosition(p => { setAppState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); storage.saveState({ isActive: true, startTime: Date.now(), startLat: p.coords.latitude, startLng: p.coords.longitude }); })}
        className={`w-full py-6 px-8 rounded-full flex items-center justify-between text-xl font-bold text-white shadow-2xl transition-all mb-10 overflow-hidden relative group vibrant-btn ${appState.isActive ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-200' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-200'}`}
      >
        <div className="shimmer-liquid opacity-30"></div>
        <span className="uppercase tracking-tight pl-2 relative z-10">{appState.isActive ? 'Завершить смену' : 'Начать смену'}</span>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 relative z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {appState.isActive ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <path d="M8 5v14l11-7z" />}
          </svg>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Вождение Неделя" value={formatMinsToHHMM(stats.weekMins)} sublabel="Лимит 56ч" variant="yellow" />
        <StatCard label="Работа Неделя" value={formatMinsToHHMM(stats.workWeekMins)} sublabel="(Молотки)" variant="indigo" />
        <StatCard label="Вождение 2 нед" value={formatMinsToHHMM(stats.biWeekMins)} sublabel="Лимит 90ч" variant="green" />
        <StatCard label="10ч доступно" value={`${Math.max(0, 2 - stats.extDrivingCount)}/2`} sublabel="На этой неделе" variant="blue" />
        <StatCard label="Долг отдыха" value={`${Math.ceil(totalDebt)}ч`} sublabel="К возврату" variant="rose" />
        <StatCard label="Траты неделя" value={`${expenses.filter(e => e.currency === 'EUR' && new Date(e.timestamp) >= getMonday(new Date())).reduce((a,b)=>a+b.amount,0)} €`} sublabel="В евро" variant="orange" />
        <StatCard label="9ч Отдых" value={`${Math.max(0, 3 - reducedRestsUsed)}/3`} sublabel="Доступно" variant="purple" />
        <StatCard label="Остаток вожд" value={formatMinsToHHMM(Math.max(0, 56*60 - stats.weekMins))} sublabel="До лимита" variant="emerald" />
      </div>

      {/* AI Assistant Block */}
      <div className="mb-10 px-1">
        {!aiResult ? (
          <button
            onClick={handleAiAnalyze}
            disabled={isAiLoading || shifts.length === 0}
            className="w-full py-5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-3xl shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group vibrant-btn"
          >
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
             {isAiLoading ? (
               <span className="animate-pulse">Анализ логов...</span>
             ) : (
               <>
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                 <span>AI Ассистент (Проверка нарушений)</span>
               </>
             )}
          </button>
        ) : (
          <div className="ios-glass p-6 rounded-[2.5rem] relative animate-in fade-in zoom-in duration-300 shadow-xl">
             <button 
               onClick={() => setAiResult(null)} 
               className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
             >
               ✕
             </button>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">AI Отчет</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gemini 3 Flash</p>
               </div>
             </div>
             <div className="prose prose-sm prose-slate leading-relaxed text-slate-600 whitespace-pre-line font-medium">
               {aiResult}
             </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 mb-6">
          <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tighter">История логов</h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadReport}
              className="w-10 h-10 flex items-center justify-center bg-white/60 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm text-slate-600 hover:bg-white/80 active:scale-95 transition-all"
              title="Скачать PDF отчет"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <div className="flex p-1 bg-white/60 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm">
              <button onClick={() => setViewMode('list')} className={`px-5 py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Лог</button>
              <button onClick={() => setViewMode('stats')} className={`px-5 py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === 'stats' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Dashboard</button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          groupedShifts.map(group => (
            <WeekGroup key={group.weekStart} group={group}>
              {group.shifts.map((s) => (
                <TimelineItem 
                  key={s.id} 
                  shift={s} 
                  onEdit={setEditingShift} 
                  onDelete={deleteShift} 
                  onAddExpense={setActiveShiftForExpense} 
                  onToggleCompensation={toggleCompensation} 
                  isInitiallyExpanded={false}
                />
              ))}
            </WeekGroup>
          ))
        ) : (
          <Dashboard shifts={enrichedShifts} />
        )}
      </div>

      <ShiftModal 
        isOpen={isModalOpen || !!editingShift} 
        onClose={() => { setIsModalOpen(false); setEditingShift(null); }} 
        onSave={handleSaveShift} 
        initialData={editingShift}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
      />
      {activeShiftForExpense && <ExpensesModal isOpen={!!activeShiftForExpense} onClose={() => setActiveShiftForExpense(null)} onSave={handleSaveExpense} shiftId={activeShiftForExpense} />}
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t+1); }} />
      
      {/* Скрытый компонент для генерации PDF */}
      <div className="absolute left-[-9999px] top-0">
        <PrintableReport shifts={enrichedShifts} stats={{...stats, totalDebt}} userEmail={session?.user?.email || 'Driver'} />
      </div>
    </div>
  );
};

export default App;

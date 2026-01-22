
import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, ShiftWithRest } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary } from './utils/timeUtils';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
import TimelineItem from './components/TimelineItem';
import AuthScreen from './components/AuthScreen';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

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
    const s = await storage.getShifts();
    setShifts(s);
    setAppState(storage.getState());
  };

  const enrichedData = useMemo(() => calculateLogSummary(shifts), [shifts]);
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">ЗАГРУЗКА...</div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20 px-4 pt-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">DriverLog</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Личный журнал</p>
        </div>
        <button onClick={() => storage.signOut()} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Выйти</button>
      </header>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Текущий отдых</p>
        <h2 className="text-6xl font-black text-slate-900 tabular-nums">{restTimer}</h2>
      </div>

      <button 
        onClick={() => {
          if (appState.isActive) {
            setEditingShift(null);
            setIsModalOpen(true);
          } else {
            const st = Date.now();
            setAppState({ isActive: true, startTime: st });
            storage.saveState({ isActive: true, startTime: st });
          }
        }}
        className={`w-full py-6 rounded-2xl font-black text-xl uppercase tracking-tight shadow-lg transition-all active:scale-95 mb-8 ${appState.isActive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
      >
        {appState.isActive ? 'Завершить смену' : 'Начать смену'}
      </button>

      <div className="grid grid-cols-2 gap-3 mb-10">
        <StatCard label="Вождение Неделя" value={formatMinsToHHMM(stats.weekMins)} variant="yellow" />
        <StatCard label="Работа Неделя" value={formatMinsToHHMM(stats.workWeekMins)} variant="blue" />
        <StatCard label="Вождение 2 нед" value={formatMinsToHHMM(stats.biWeekMins)} variant="green" />
        <StatCard label="Долг отдыха" value={`${Math.ceil(enrichedData.totalDebt)}ч`} variant="rose" />
      </div>

      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">История смен</h3>
      <div className="space-y-4">
        {enrichedData.shifts.map(s => (
          <TimelineItem 
            key={s.id} 
            shift={s} 
            onEdit={(shift) => { setEditingShift(shift); setIsModalOpen(true); }}
            onDelete={(id) => { if(confirm('Удалить?')) storage.deleteShift(id).then(loadData); }}
          />
        ))}
      </div>

      <ShiftModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={async (s) => { await storage.saveShift(s); loadData(); setIsModalOpen(false); if (!editingShift) { setAppState({isActive:false, startTime:null}); storage.clearState(); } }} 
        initialData={editingShift} 
      />
    </div>
  );
};

export default App;

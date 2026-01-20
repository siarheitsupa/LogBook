import React, { useState, useEffect, useMemo } from 'react';
import { Shift, AppState, CloudConfig } from './types';
import { storage } from './services/storageService';
import { formatMinsToHHMM, getStats, calculateLogSummary, pad, getMonday } from './utils/timeUtils';
import { analyzeLogs } from './services/geminiService';
import StatCard from './components/StatCard';
import ShiftModal from './components/ShiftModal';
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
  const [appState, setAppState] = useState<AppState>({ isActive: false, startTime: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
  }, [configUpdateTrigger]);

  useEffect(() => {
    if (session) {
      storage.getShifts().then(setShifts);
    } else {
      setShifts([]);
    }
  }, [session]);

  const { shifts: enrichedShifts, totalDebt } = useMemo(() => {
    return calculateLogSummary(shifts);
  }, [shifts]);

  const stats = useMemo(() => {
    return getStats(shifts);
  }, [shifts]);

  const { weekMins, workWeekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount } = stats;

  const currentWeekShifts = useMemo(() => {
    const monday = getMonday(new Date());
    return enrichedShifts.filter(s => new Date(s.date) >= monday);
  }, [enrichedShifts]);

  const handleGeneratePDF = async () => {
    if (currentWeekShifts.length === 0) {
      alert("Нет данных за текущую неделю для экспорта.");
      return;
    }
    
    setIsGeneratingPDF(true);
    const element = document.getElementById('pdf-report');
    if (!element) {
      alert("Ошибка: шаблон отчета не найден.");
      setIsGeneratingPDF(false);
      return;
    }

    // Fix: Explicitly cast orientation to literal type 'portrait' as const to satisfy Html2PdfOptions.
    const opt = {
      margin: 0,
      filename: `driver-log-week-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      const exporter = typeof html2pdf === 'function' ? html2pdf() : html2pdf;
      await exporter.from(element).set(opt).save();
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("Ошибка при создании PDF. Попробуйте обновить страницу.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleMainAction = () => {
    if (!appState.isActive) {
      const startShift = (lat?: number, lng?: number) => {
        const newState = { 
          isActive: true, 
          startTime: Date.now(),
          startLat: lat,
          startLng: lng
        };
        setAppState(newState);
        storage.saveState(newState);
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => startShift(pos.coords.latitude, pos.coords.longitude),
        () => startShift(),
        { timeout: 5000 }
      );
    } else {
      setEditingShift(null);
      setIsModalOpen(true);
    }
  };

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
        console.error("Critical save error:", e);
        // Если это ошибка схемы, выводим подробности
        if (e.message.includes("SQL")) {
           alert(e.message);
        } else {
           alert(`Ошибка при сохранении: ${e.message}.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (editingShift) {
       await finishSave();
    } else {
      const geoPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 });
      });

      try {
        const pos = await geoPromise;
        await finishSave(pos.coords.latitude, pos.coords.longitude);
      } catch (e) {
        await finishSave();
      }
    }
  };

  const handleCloudSave = async (config: CloudConfig) => {
    if (storage.initCloud(config)) {
      setIsLoading(true);
      setConfigUpdateTrigger(prev => prev + 1);
      setIsCloudModalOpen(false);
    } else {
      alert('Ошибка конфигурации. Проверьте данные.');
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

  const runAiAnalysis = async () => {
    if (shifts.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeLogs(shifts);
    setAiAnalysis(result);
    setIsAnalyzing(false);
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
        <p className="text-slate-500 text-sm mb-10 max-w-xs font-medium">Подключите базу данных для синхронизации логов между устройствами.</p>
        <button 
          onClick={() => setIsCloudModalOpen(true)}
          className="w-full max-w-xs py-5 bg-slate-900 text-white font-bold rounded-2xl shadow-2xl active:scale-95 transition-all"
        >
          Настроить подключение
        </button>
        <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t + 1); }} />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const lastShift = shifts[0];
  const lastShiftEndTime = (lastShift && lastShift.date && lastShift.endTime) ? new Date(`${lastShift.date}T${lastShift.endTime}`).getTime() : null;
  const restElapsedMins = (!appState.isActive && lastShiftEndTime) ? Math.max(0, (now - lastShiftEndTime) / (1000 * 60)) : 0;
  const activeDurationMins = (appState.isActive && appState.startTime) ? Math.max(0, (now - appState.startTime) / (1000 * 60)) : 0;

  const restProgress11 = Math.min(100, (restElapsedMins / (11 * 60)) * 100);

  const autoFillStartTime = appState.startTime ? (() => {
    const d = new Date(appState.startTime);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })() : undefined;

  return (
    <div className="max-w-xl mx-auto min-h-screen pb-16 px-4 pt-8 animate-in fade-in duration-500">
      <div className="fixed -top-[10000px] -left-[10000px]">
        <PrintableReport shifts={currentWeekShifts} stats={{ weekMins, totalDebt }} userEmail={session?.user?.email || 'Driver'} />
      </div>

      <header className="flex flex-col items-center mb-8 relative">
        <div className="flex items-center gap-3 liquid-glass p-2.5 pr-5 pl-4 rounded-full shadow-lg">
          <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent"></div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-slate-800 leading-none">DriverLog Pro</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Professional Edition</span>
          </div>
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200/50">
            <button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className={`p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all ${isGeneratingPDF ? 'animate-pulse opacity-50' : ''}`}
              title="Экспорт в PDF"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button 
              onClick={() => setIsCloudModalOpen(true)}
              className="p-1.5 hover:bg-white/50 rounded-xl transition-all"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${session ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-300'}`}></div>
            </button>
            <button 
              onClick={() => storage.signOut()} 
              className="text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50/50 px-2 py-1.5 rounded-lg transition-all"
            >
              Выйти
            </button>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-40">{session?.user?.email}</div>
      </header>

      <div className={`liquid-glass rounded-[3rem] p-8 mb-8 transition-all duration-700 ${appState.isActive ? 'shadow-[0_20px_50px_rgba(16,185,129,0.1)]' : ''}`}>
        <div className={`mb-8 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden ${appState.isActive ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-slate-500/5 border border-slate-500/10'}`}>
          <div className="flex items-center gap-3 relative z-10">
            {appState.isActive ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                <span className="uppercase text-[12px] tracking-[0.25em] text-emerald-600 font-black">В РАБОТЕ</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-liquid-moon">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.3" />
                  </svg>
                </div>
                <span className="uppercase text-[12px] tracking-[0.25em] text-slate-400 font-black">ОТДЫХ</span>
              </div>
            )}
          </div>
          
          {appState.isActive && (
            <div className="mt-4 text-6xl font-black tabular-nums tracking-tighter text-slate-900 drop-shadow-xl">
              {formatMinsToHHMM(activeDurationMins)}
            </div>
          )}
          
          {!appState.isActive && lastShiftEndTime && (
            <div className="mt-5 w-full space-y-6">
              <div className="text-6xl font-black text-slate-900 text-center tabular-nums tracking-tighter drop-shadow-2xl">
                {formatMinsToHHMM(restElapsedMins)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`relative h-20 overflow-hidden rounded-3xl border transition-all duration-500 flex flex-col items-center justify-center shadow-lg ${restElapsedMins >= 9 * 60 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300' : 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300'}`}>
                   {restElapsedMins >= 9 * 60 && <div className="shimmer-liquid"></div>}
                   <div className="relative z-10 text-center">
                     <span className="text-[10px] block font-black uppercase text-white/70 tracking-widest mb-1">9 ЧАСОВ</span>
                     <span className="text-lg font-black tabular-nums text-white">
                       {restElapsedMins >= 9 * 60 ? 'ГОТОВО' : formatMinsToHHMM(Math.max(0, 9 * 60 - restElapsedMins))}
                     </span>
                   </div>
                </div>

                <div className={`relative h-20 overflow-hidden rounded-3xl border transition-all duration-500 flex flex-col items-center justify-center shadow-lg ${restElapsedMins >= 11 * 60 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300' : 'bg-white/50 border-white/80'}`}>
                   {restElapsedMins >= 11 * 60 && <div className="shimmer-liquid"></div>}
                   {restElapsedMins < 11 * 60 && (
                     <div 
                       className="absolute inset-y-0 left-0 bg-emerald-500/15 transition-all duration-1000" 
                       style={{ width: `${restProgress11}%` }}
                     />
                   )}
                   <div className="relative z-10 text-center">
                     <span className={`text-[10px] block font-black uppercase tracking-widest mb-1 ${restElapsedMins >= 11 * 60 ? 'text-white/70' : 'text-slate-400'}`}>11 ЧАСОВ</span>
                     <span className={`text-lg font-black tabular-nums ${restElapsedMins >= 11 * 60 ? 'text-white' : 'text-slate-700'}`}>
                       {restElapsedMins >= 11 * 60 ? 'ГОТОВО' : formatMinsToHHMM(Math.max(0, 11 * 60 - restElapsedMins))}
                     </span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleMainAction}
          className={`w-full py-6 rounded-[2rem] text-xl font-black text-white jelly-button flex items-center justify-center gap-4 relative overflow-hidden ${appState.isActive ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}
        >
          <div className="shimmer-liquid opacity-30"></div>
          {appState.isActive ? (
            <>
              <span>ЗАВЕРШИТЬ СМЕНУ</span>
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>
              </div>
            </>
          ) : (
            <>
              <span>НАЧАТЬ СМЕНУ</span>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center pl-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-10">
        <StatCard label="Вождение неделя" value={formatMinsToHHMM(weekMins)} sublabel="Лимит 56ч" variant="yellow" />
        <StatCard label="Работа неделя" value={formatMinsToHHMM(workWeekMins)} sublabel="⚒️ (Молотки)" variant="orange" />
        <StatCard label="За 2 недели" value={formatMinsToHHMM(biWeekMins)} sublabel="Лимит 90ч" variant="green" />
        <StatCard label="10ч Вождение" value={`${extDrivingCount} / 2`} sublabel="Доступно" variant="blue" />
        <StatCard label="15ч Смены" value={`${extDutyCount} / 3`} sublabel="Доступно" variant="indigo" />
        <StatCard label="Долг (Отдых)" value={`${Math.ceil(totalDebt)}ч`} sublabel="К возврату" variant="purple" />
      </div>

      {shifts.length > 0 && (
        <div className="mb-10 liquid-glass rounded-[2.5rem] p-8 relative overflow-hidden group border-indigo-200/50">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
          <div className="flex items-center justify-between mb-5 relative z-10">
            <h3 className="font-black text-xl tracking-tight flex items-center gap-3">
              <span className="text-2xl">✨</span>
              AI Аналитик
            </h3>
            <button 
              onClick={runAiAnalysis} 
              disabled={isAnalyzing} 
              className={`text-[10px] bg-slate-900 text-white px-5 py-2.5 rounded-full font-black active:scale-95 transition-all disabled:opacity-50 shadow-xl ${isAnalyzing ? 'animate-pulse' : ''}`}
            >
              {isAnalyzing ? 'АНАЛИЗ...' : 'ОБНОВИТЬ'}
            </button>
          </div>
          <div className="text-[13px] leading-relaxed font-semibold text-slate-700 relative z-10 p-5 bg-white/40 rounded-[2rem] border border-white/60 shadow-inner">
            {aiAnalysis ? (
              <div className="whitespace-pre-wrap">{aiAnalysis}</div>
            ) : (
              <span className="opacity-50 italic">Нажмите обновить, чтобы я проверил ваши логи на соответствие регламенту ЕС 561/2006.</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <span className="w-2 h-8 bg-slate-900 rounded-full"></span>
                {viewMode === 'stats' ? 'Аналитика' : 'Логи и Маршрут'}
              </h3>
              <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-inner overflow-x-auto">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  Список
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'map' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  Карта
                </button>
                <button 
                  onClick={() => setViewMode('stats')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'stats' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  Dashboard
                </button>
              </div>
          </div>

          {viewMode === 'map' && <RouteMap shifts={shifts} />}
          {viewMode === 'stats' && <Dashboard shifts={enrichedShifts} />}
          {viewMode === 'list' && (
            <div className="space-y-4">
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
          )}
        </div>
      </div>

      <ShiftModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveShift} 
        initialData={editingShift} 
        defaultStartTime={autoFillStartTime}
      />
      <CloudSettingsModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} onSave={handleCloudSave} onReset={() => { storage.resetCloud(); setSession(null); setConfigUpdateTrigger(t => t + 1); }} />
    </div>
  );
};

export default App;

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig, Expense } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const EXPENSES_KEY = 'driverlog_expenses_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

// --- НАСТРОЙКИ ПОДКЛЮЧЕНИЯ (HARDCODED) ---
const DEFAULT_URL = 'https://onxpylvydjyhlvsaacur.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueHB5bHZ5ZGp5aGx2c2FhY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDY1OTksImV4cCI6MjA4MzEyMjU5OX0.O1nLUMSSY8VfSGdoa8u_06eKRV0B-yTodLWOMnscZFA';

let supabaseInstance: SupabaseClient | null = null;

// Получение текущей конфигурации с абсолютным приоритетом констант
const getConfig = () => {
  // 1. Если заданы константы в коде - используем их всегда
  if (DEFAULT_URL && DEFAULT_KEY && DEFAULT_URL.startsWith('http')) {
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  }
  
  // 2. Иначе смотрим localStorage (для разработки)
  const localUrl = localStorage.getItem(`${CLOUD_CONFIG_KEY}_url`);
  const localKey = localStorage.getItem(`${CLOUD_CONFIG_KEY}_key`);
  
  if (localUrl && localKey) {
    return { url: localUrl, key: localKey };
  }

  return null;
};

export const storage = {
  // Проверка: настроено ли приложение. Если ключи в коде есть - всегда true.
  isConfigured: () => {
    if (supabaseInstance) return true;
    return !!getConfig();
  },

  // Инициализация подключения
  initCloud: (manualConfig?: CloudConfig): boolean => {
    let config = manualConfig 
      ? { url: manualConfig.url, key: manualConfig.key }
      : getConfig();

    if (!config) return false;

    // Если экземпляр уже есть и URL не изменился - не пересоздаем
    if (supabaseInstance) return true;

    try {
      supabaseInstance = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      });
      
      // Если это была ручная настройка (через модалку), сохраняем в LS
      if (manualConfig) {
        localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, config.url);
        localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, config.key);
      }
      
      return true;
    } catch (e) {
      console.error('Supabase init critical error:', e);
      return false;
    }
  },

  signUp: async (email: string, pass: string) => {
    if (!storage.initCloud()) throw new Error('Ошибка конфигурации облака');
    return await supabaseInstance!.auth.signUp({ email, password: pass });
  },

  signIn: async (email: string, pass: string) => {
    if (!storage.initCloud()) throw new Error('Ошибка конфигурации облака');
    return await supabaseInstance!.auth.signInWithPassword({ email, password: pass });
  },

  signOut: async () => {
    if (supabaseInstance) {
      try {
        await supabaseInstance.auth.signOut();
      } catch (e) {
        console.warn("Sign out error", e);
      }
    }
    // Очищаем только сессию, но не конфиг, если он хардкодный
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase.auth.token') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!storage.initCloud()) return null;
    try {
      const { data, error } = await supabaseInstance!.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (e) {
      console.error("Session error:", e);
      return null;
    }
  },

  getUser: async () => {
    if (!storage.initCloud()) return { data: { user: null }, error: new Error('Offline') };
    try {
      return await supabaseInstance!.auth.getUser();
    } catch (e) {
      return { data: { user: null }, error: e };
    }
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!storage.initCloud()) return () => {};
    const { data: { subscription } } = supabaseInstance!.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') callback(null);
      else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') callback(session);
    });
    return () => subscription.unsubscribe();
  },

  getShifts: async (): Promise<Shift[]> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    if (storage.initCloud()) {
      try {
        const { data, error } = await supabaseInstance!
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && data) {
          const cloudData = data.map((item: any) => ({
            id: item.id,
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            driveHours: Number(item.drive_hours || 0),
            driveMinutes: Number(item.drive_minutes || 0),
            workHours: Number(item.work_hours || 0),
            workMinutes: Number(item.work_minutes || 0),
            timestamp: Number(item.timestamp),
            startLat: item.start_lat,
            startLng: item.start_lng,
            endLat: item.end_lat,
            endLng: item.end_lng,
            isCompensated: item.is_compensated || false
          }));
          localStorage.setItem(SHIFTS_KEY, JSON.stringify(cloudData));
          return cloudData;
        }
      } catch (e) { console.warn("Sync shifts error", e); }
    }
    return local;
  },

  saveShift: async (shift: Shift): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const idx = local.findIndex((s: any) => s.id === shift.id);
    if (idx > -1) local[idx] = shift; else local.unshift(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local));

    if (storage.initCloud()) {
      const { data: { session } } = await supabaseInstance!.auth.getSession();
      if (!session?.user) return;
      
      const payload: any = {
        id: shift.id,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        drive_hours: shift.driveHours,
        drive_minutes: shift.driveMinutes,
        work_hours: shift.workHours,
        work_minutes: shift.workMinutes,
        timestamp: shift.timestamp,
        user_id: session.user.id,
        start_lat: shift.startLat,
        start_lng: shift.startLng,
        end_lat: shift.endLat,
        end_lng: shift.endLng,
        is_compensated: shift.isCompensated || false
      };
      await supabaseInstance!.from('shifts').upsert(payload);
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
    if (storage.initCloud()) {
      await supabaseInstance!.from('shifts').delete().eq('id', id);
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    if (storage.initCloud()) {
      try {
        const { data, error } = await supabaseInstance!.from('expenses').select('*');
        if (!error && data) {
          const cloudData: Expense[] = data.map((item: any) => ({
            id: item.id,
            shiftId: item.shift_id,
            category: item.category,
            amount: Number(item.amount),
            currency: item.currency,
            timestamp: Number(item.timestamp),
            description: item.description
          }));
          localStorage.setItem(EXPENSES_KEY, JSON.stringify(cloudData));
          return cloudData;
        }
      } catch (e) { console.warn("Sync expenses error", e); }
    }
    return local;
  },

  saveExpense: async (expense: Expense): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    const idx = local.findIndex((e: any) => e.id === expense.id);
    if (idx > -1) local[idx] = expense; else local.unshift(expense);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local));

    if (storage.initCloud()) {
      const { data: { session } } = await supabaseInstance!.auth.getSession();
      if (!session?.user) return;
      const payload = {
        id: expense.id,
        shift_id: expense.shiftId,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        timestamp: expense.timestamp,
        description: expense.description,
        user_id: session.user.id
      };
      await supabaseInstance!.from('expenses').upsert(payload);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local.filter((e: any) => e.id !== id)));
    if (storage.initCloud()) {
      await supabaseInstance!.from('expenses').delete().eq('id', id);
    }
  },

  getState: (): AppState => {
    const d = localStorage.getItem(STATE_KEY);
    return d ? JSON.parse(d) : { isActive: false, startTime: null };
  },
  saveState: (s: AppState) => localStorage.setItem(STATE_KEY, JSON.stringify(s)),
  clearState: () => localStorage.removeItem(STATE_KEY),
  
  // Дополнительная утилита для проверки статуса
  getConnectionStatus: () => !!supabaseInstance,
  
  resetCloud: () => {
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
    supabaseInstance = null;
    // Если есть хардкод, он восстановится при следующем initCloud, 
    // но это ожидаемое поведение (сброс просто переподключит defaults)
  }
};

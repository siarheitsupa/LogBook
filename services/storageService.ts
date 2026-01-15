
import { createClient, SupabaseClient, Session, UserResponse, AuthResponse } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

let supabase: SupabaseClient | null = null;

const getEnv = (key: string): string => {
  // Расширенный поиск по всем возможным префиксам и глобальным объектам
  const env = (window as any).process?.env || (process as any)?.env || {};
  const metaEnv = (import.meta as any)?.env || {};
  
  return (
    env[key] || 
    env[`VITE_${key}`] || 
    env[`NEXT_PUBLIC_${key}`] ||
    metaEnv[key] ||
    metaEnv[`VITE_${key}`] ||
    localStorage.getItem(`${CLOUD_CONFIG_KEY}_${key.toLowerCase()}`) ||
    ''
  );
};

export const storage = {
  initCloud: (manualConfig?: CloudConfig) => {
    // Приоритет: 1. Ручной ввод, 2. Переменные окружения, 3. LocalStorage
    const url = manualConfig?.url || getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
    const key = manualConfig?.key || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
    
    if (url && key && url.startsWith('http')) {
      try {
        supabase = createClient(url, key);
        if (manualConfig) {
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, manualConfig.url);
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, manualConfig.key);
        }
        console.log('✅ Supabase initialized successfully');
        return true;
      } catch (e) {
        console.error('❌ Supabase: Init Error', e);
        return false;
      }
    }
    return false;
  },

  signUp: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabase) {
      // Пытаемся инициализироваться перед действием, если ключи появились позже
      if (!storage.initCloud()) return { data: { user: null, session: null }, error: { message: 'Облачное хранилище не настроено. Проверьте переменные окружения.' } as any };
    }
    return await supabase!.auth.signUp({ email, password: pass });
  },

  signIn: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabase) {
      if (!storage.initCloud()) return { data: { user: null, session: null }, error: { message: 'Облачное хранилище не настроено. Проверьте переменные окружения.' } as any };
    }
    return await supabase!.auth.signInWithPassword({ email, password: pass });
  },

  signOut: async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Sign out error", e);
      }
    }
    
    // Очистка сессии
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('auth'))) {
        localStorage.removeItem(key);
      }
    }
    
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabase) {
      if (!storage.initCloud()) return null;
    }
    const { data } = await supabase!.auth.getSession();
    return data.session;
  },

  getUser: async (): Promise<UserResponse> => {
    if (!supabase) {
      if (!storage.initCloud()) return { data: { user: null }, error: new Error('No client') as any };
    }
    return await supabase!.auth.getUser();
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!supabase) {
      if (!storage.initCloud()) return () => {};
    }
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  },

  getShifts: async (): Promise<Shift[]> => {
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && data) {
          return data.map((item: any) => ({
            id: item.id,
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            driveHours: item.drive_hours,
            driveMinutes: item.drive_minutes,
            timestamp: typeof item.timestamp === 'string' ? parseInt(item.timestamp) : item.timestamp
          }));
        }
      } catch (e) {
        console.error('🔴 Load error:', e);
      }
    }
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const index = localShifts.findIndex((s: Shift) => s.id === shift.id);
    if (index > -1) localShifts[index] = shift;
    else localShifts.push(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));

    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase.from('shifts').upsert({
          id: shift.id,
          date: shift.date,
          start_time: shift.startTime,
          end_time: shift.endTime,
          drive_hours: shift.driveHours,
          drive_minutes: shift.driveMinutes,
          timestamp: shift.timestamp,
          user_id: user.id
        });
        return !error;
      } catch (e) {
        return false;
      }
    }
    return true;
  },

  deleteShift: async (id: string): Promise<boolean> => {
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts.filter((s: Shift) => s.id !== id)));
    if (supabase) {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      return !error;
    }
    return true;
  },

  getState: (): AppState => {
    const data = localStorage.getItem(STATE_KEY);
    return data ? JSON.parse(data) : { isActive: false, startTime: null };
  },
  saveState: (state: AppState) => localStorage.setItem(STATE_KEY, JSON.stringify(state)),
  clearState: () => localStorage.removeItem(STATE_KEY),
  isCloudEnabled: () => {
    if (!supabase) storage.initCloud();
    return !!supabase;
  },
  resetCloud: () => {
    supabase = null;
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
  },
  getEnvStatus: () => ({
    url: !!getEnv('SUPABASE_URL'),
    key: !!getEnv('SUPABASE_ANON_KEY'),
    gemini: !!process.env.API_KEY || !!(window as any).process?.env?.API_KEY
  })
};

// Пробуем инициализироваться сразу при импорте
storage.initCloud();

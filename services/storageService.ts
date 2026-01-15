
import { createClient, SupabaseClient, Session, UserResponse, AuthResponse } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

let supabase: SupabaseClient | null = null;

const getEnv = (key: string): string => {
  const env = (window as any).process?.env || (process as any)?.env || {};
  const metaEnv = (import.meta as any)?.env || {};
  
  // Приводим ключ к нижнему регистру для соответствия формату сохранения
  const storageSuffix = key.toLowerCase().replace('supabase_', '');
  
  return (
    env[key] || 
    env[`VITE_${key}`] || 
    env[`NEXT_PUBLIC_${key}`] ||
    metaEnv[key] ||
    metaEnv[`VITE_${key}`] ||
    localStorage.getItem(`${CLOUD_CONFIG_KEY}_${storageSuffix}`) ||
    ''
  );
};

export const storage = {
  isConfigured: () => {
    const url = getEnv('SUPABASE_URL');
    const key = getEnv('SUPABASE_ANON_KEY');
    return !!(url && key && url.startsWith('http'));
  },

  initCloud: (manualConfig?: CloudConfig) => {
    const url = manualConfig?.url || getEnv('SUPABASE_URL');
    const key = manualConfig?.key || getEnv('SUPABASE_ANON_KEY');
    
    if (url && key && url.startsWith('http')) {
      try {
        supabase = createClient(url, key);
        // Сохраняем в localStorage только если это ручной ввод или если в localStorage еще нет данных
        if (manualConfig || !localStorage.getItem(`${CLOUD_CONFIG_KEY}_url`)) {
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, url);
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, key);
        }
        return true;
      } catch (e) {
        console.error('❌ Supabase: Init Error', e);
        return false;
      }
    }
    return false;
  },

  signUp: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabase && !storage.initCloud()) {
      return { data: { user: null, session: null }, error: { message: 'Настройте подключение к облаку в настройках (иконка шестеренки).' } as any };
    }
    return await supabase!.auth.signUp({ email, password: pass });
  },

  signIn: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabase && !storage.initCloud()) {
      return { data: { user: null, session: null }, error: { message: 'Настройте подключение к облаку в настройках (иконка шестеренки).' } as any };
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
    
    // Очистка сессии (не трогаем ключи конфигурации, чтобы не вводить их заново)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('supabase.auth.token') || key.toLowerCase().includes('sb-'))) {
        localStorage.removeItem(key);
      }
    }
    
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabase && !storage.initCloud()) return null;
    try {
      const { data } = await supabase!.auth.getSession();
      return data.session;
    } catch (e) {
      return null;
    }
  },

  getUser: async (): Promise<UserResponse> => {
    if (!supabase && !storage.initCloud()) return { data: { user: null }, error: new Error('No client') as any };
    return await supabase!.auth.getUser();
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!supabase && !storage.initCloud()) return () => {};
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
    if (!supabase) return storage.initCloud();
    return true;
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

storage.initCloud();

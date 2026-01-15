
import { createClient, SupabaseClient, Session, UserResponse, AuthResponse } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

let supabaseInstance: SupabaseClient | null = null;

const getEnvValue = (key: string): string => {
  // 1. Проверяем глобальный объект process (инжектится платформой)
  const processEnv = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : {});
  // 2. Проверяем ESM окружение
  const metaEnv = (import.meta as any)?.env || {};
  
  // Маппинг для LocalStorage
  const storageMap: Record<string, string> = {
    'SUPABASE_URL': `${CLOUD_CONFIG_KEY}_url`,
    'SUPABASE_ANON_KEY': `${CLOUD_CONFIG_KEY}_key`
  };

  return (
    processEnv[key] || 
    processEnv[`VITE_${key}`] || 
    metaEnv[key] ||
    metaEnv[`VITE_${key}`] ||
    localStorage.getItem(storageMap[key] || '') ||
    ''
  );
};

export const storage = {
  isConfigured: () => {
    if (supabaseInstance) return true;
    const url = getEnvValue('SUPABASE_URL');
    const key = getEnvValue('SUPABASE_ANON_KEY');
    return !!(url && key && url.startsWith('http') && key.length > 10);
  },

  initCloud: (manualConfig?: CloudConfig): boolean => {
    const url = manualConfig?.url || getEnvValue('SUPABASE_URL');
    const key = manualConfig?.key || getEnvValue('SUPABASE_ANON_KEY');
    
    if (url && key && url.startsWith('http')) {
      try {
        supabaseInstance = createClient(url, key);
        
        // Сохраняем только ручные настройки
        if (manualConfig) {
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, url);
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, key);
        }
        
        return true;
      } catch (e) {
        console.error('Supabase init error:', e);
        return false;
      }
    }
    return false;
  },

  signUp: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabaseInstance && !storage.initCloud()) throw new Error('Not initialized');
    return await supabaseInstance!.auth.signUp({ email, password: pass });
  },

  signIn: async (email: string, pass: string): Promise<AuthResponse> => {
    if (!supabaseInstance && !storage.initCloud()) throw new Error('Not initialized');
    return await supabaseInstance!.auth.signInWithPassword({ email, password: pass });
  },

  signOut: async () => {
    if (supabaseInstance) await supabaseInstance.auth.signOut();
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase.auth.token') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabaseInstance && !storage.initCloud()) return null;
    const { data } = await supabaseInstance!.auth.getSession();
    return data.session;
  },

  getUser: async (): Promise<UserResponse> => {
    if (!supabaseInstance && !storage.initCloud()) return { data: { user: null }, error: new Error('Offline') as any };
    return await supabaseInstance!.auth.getUser();
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!supabaseInstance && !storage.initCloud()) return () => {};
    const { data: { subscription } } = supabaseInstance!.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  },

  getShifts: async (): Promise<Shift[]> => {
    if (supabaseInstance) {
      const { data, error } = await supabaseInstance
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
    }
    const local = localStorage.getItem(SHIFTS_KEY);
    return local ? JSON.parse(local) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const idx = local.findIndex((s: any) => s.id === shift.id);
    if (idx > -1) local[idx] = shift; else local.push(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local));

    if (supabaseInstance) {
      const { data: { user } } = await supabaseInstance.auth.getUser();
      if (!user) return false;
      const { error } = await supabaseInstance.from('shifts').upsert({
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
    }
    return true;
  },

  deleteShift: async (id: string): Promise<boolean> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
    if (supabaseInstance) {
      const { error } = await supabaseInstance.from('shifts').delete().eq('id', id);
      return !error;
    }
    return true;
  },

  getState: (): AppState => {
    const d = localStorage.getItem(STATE_KEY);
    return d ? JSON.parse(d) : { isActive: false, startTime: null };
  },
  saveState: (s: AppState) => localStorage.setItem(STATE_KEY, JSON.stringify(s)),
  clearState: () => localStorage.removeItem(STATE_KEY),
  isCloudEnabled: () => !!supabaseInstance,
  resetCloud: () => {
    supabaseInstance = null;
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
  },
  getEnvStatus: () => ({
    url: !!getEnvValue('SUPABASE_URL'),
    key: !!getEnvValue('SUPABASE_ANON_KEY'),
    gemini: !!(window as any).process?.env?.API_KEY
  })
};

// Авто-инициализация
storage.initCloud();

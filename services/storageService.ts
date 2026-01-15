
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

let supabase: SupabaseClient | null = null;

const getEnv = (key: string): string => {
  return (
    (process.env as any)[key] || 
    (process.env as any)[`VITE_${key}`] || 
    (process.env as any)[`NEXT_PUBLIC_${key}`] ||
    (window as any).process?.env?.[key] ||
    ''
  );
};

export const storage = {
  initCloud: (manualConfig?: CloudConfig) => {
    const url = manualConfig?.url || getEnv('SUPABASE_URL') || localStorage.getItem(`${CLOUD_CONFIG_KEY}_url`);
    const key = manualConfig?.key || getEnv('SUPABASE_ANON_KEY') || localStorage.getItem(`${CLOUD_CONFIG_KEY}_key`);
    
    if (url && key) {
      try {
        supabase = createClient(url, key);
        if (manualConfig) {
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, manualConfig.url);
          localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, manualConfig.key);
        }
        return true;
      } catch (e) {
        console.error('❌ Supabase: Init Error', e);
        return false;
      }
    }
    return false;
  },

  // Auth Methods
  // Fixed return type to be consistent with Supabase AuthResponse to avoid destructuring errors in components
  signUp: async (email: string, pass: string) => {
    if (!supabase) return { data: { user: null, session: null }, error: { message: 'Cloud not configured' } as any };
    return await supabase.auth.signUp({ email, password: pass });
  },

  // Fixed return type to be consistent with Supabase AuthResponse to avoid destructuring errors in components
  signIn: async (email: string, pass: string) => {
    if (!supabase) return { data: { user: null, session: null }, error: { message: 'Cloud not configured' } as any };
    return await supabase.auth.signInWithPassword({ email, password: pass });
  },

  signOut: async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Sign out error", e);
      }
    }
    // Очищаем сессионные куки и локальные ключи принудительно
    localStorage.removeItem('supabase.auth.token'); 
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  // Fixed return type to be consistent with Supabase UserResponse
  getUser: async () => {
    if (!supabase) return { data: { user: null }, error: { message: 'No client' } as any };
    return await supabase.auth.getUser();
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!supabase) return () => {};
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    // Local backup
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
          user_id: user.id // Explicit user_id though RLS handles it
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
  isCloudEnabled: () => !!supabase,
  resetCloud: () => {
    supabase = null;
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
  }
};

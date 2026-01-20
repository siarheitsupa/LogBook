import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

let supabaseInstance: SupabaseClient | null = null;

const getEnvValue = (key: 'URL' | 'KEY'): string => {
  try {
    if (key === 'URL') return process.env.SUPABASE_URL || localStorage.getItem(`${CLOUD_CONFIG_KEY}_url`) || '';
    if (key === 'KEY') return process.env.SUPABASE_ANON_KEY || localStorage.getItem(`${CLOUD_CONFIG_KEY}_key`) || '';
  } catch (e) {
    return '';
  }
  return '';
};

export const storage = {
  isConfigured: () => {
    if (supabaseInstance) return true;
    const url = getEnvValue('URL');
    const key = getEnvValue('KEY');
    return !!(url && key && url.startsWith('http'));
  },

  initCloud: (manualConfig?: CloudConfig): boolean => {
    const url = manualConfig?.url || getEnvValue('URL');
    const key = manualConfig?.key || getEnvValue('KEY');
    
    if (url && key && url.startsWith('http')) {
      try {
        supabaseInstance = createClient(url, key);
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

  signUp: async (email: string, pass: string) => {
    if (!supabaseInstance && !storage.initCloud()) throw new Error('Database connection not configured');
    return await supabaseInstance!.auth.signUp({ email, password: pass });
  },

  signIn: async (email: string, pass: string) => {
    if (!supabaseInstance && !storage.initCloud()) throw new Error('Database connection not configured');
    return await supabaseInstance!.auth.signInWithPassword({ email, password: pass });
  },

  signOut: async () => {
    if (supabaseInstance) await supabaseInstance.auth.signOut();
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase.auth.token') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabaseInstance && !storage.initCloud()) return null;
    try {
      const { data } = await supabaseInstance!.auth.getSession();
      return data.session;
    } catch (e) {
      return null;
    }
  },

  getUser: async () => {
    if (!supabaseInstance && !storage.initCloud()) return { data: { user: null }, error: new Error('Offline') };
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
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    
    if (supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          const cloudData = data.map((item: any) => ({
            id: item.id,
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            driveHours: item.drive_hours,
            driveMinutes: item.drive_minutes,
            workHours: item.work_hours || 0,
            workMinutes: item.work_minutes || 0,
            timestamp: Number(item.timestamp),
            startLat: item.start_lat,
            startLng: item.start_lng,
            endLat: item.end_lat,
            endLng: item.end_lng
          }));
          
          localStorage.setItem(SHIFTS_KEY, JSON.stringify(cloudData));
          return cloudData;
        }
      } catch (e) {
        console.warn("Supabase fetch failed", e);
      }
    }
    return local;
  },

  saveShift: async (shift: Shift): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const idx = local.findIndex((s: any) => s.id === shift.id);
    if (idx > -1) local[idx] = shift; else local.unshift(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local));

    if (supabaseInstance) {
      const { data: { session } } = await supabaseInstance.auth.getSession();
      if (!session?.user) throw new Error('Пользователь не авторизован');

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
        end_lng: shift.endLng
      };

      const { error } = await supabaseInstance.from('shifts').upsert(payload);
      
      if (error) {
        // Если база ругается на колонки координат или новых полей работы, пробуем сохранить с минимальным набором
        console.warn("Schema mismatch, retrying without geo/work columns...");
        const fallbackPayload = { ...payload };
        delete fallbackPayload.start_lat;
        delete fallbackPayload.start_lng;
        delete fallbackPayload.end_lat;
        delete fallbackPayload.end_lng;
        delete fallbackPayload.work_hours;
        delete fallbackPayload.work_minutes;
        
        const { error: retryError } = await supabaseInstance.from('shifts').upsert(fallbackPayload);
        if (retryError) throw new Error(`Ошибка БД: ${retryError.message}`);
      }
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
    
    if (supabaseInstance) {
      const { error } = await supabaseInstance.from('shifts').delete().eq('id', id);
      if (error) throw error;
    }
  },

  getState: (): AppState => {
    const d = localStorage.getItem(STATE_KEY);
    return d ? JSON.parse(d) : { isActive: false, startTime: null };
  },
  saveState: (s: AppState) => localStorage.setItem(STATE_KEY, JSON.stringify(s)),
  clearState: () => localStorage.removeItem(STATE_KEY),
  getEnvStatus: () => ({
    url: !!getEnvValue('URL'),
    key: !!getEnvValue('KEY')
  }),
  resetCloud: () => {
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`);
    localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`);
    supabaseInstance = null;
  }
};
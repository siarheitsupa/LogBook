import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig, Expense } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const EXPENSES_KEY = 'driverlog_expenses_v1';
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
        supabaseInstance = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
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
    if (supabaseInstance) {
      try {
        await supabaseInstance.auth.signOut();
      } catch (e) {
        console.warn("Sign out error", e);
      }
    }
    // Полная очистка хранилища от следов Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase.auth.token') || key.includes('sb-') || key.includes('driverlog_cloud_config_v1')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  },

  getSession: async (): Promise<Session | null> => {
    if (!supabaseInstance && !storage.initCloud()) return null;
    try {
      const { data, error } = await supabaseInstance!.auth.getSession();
      if (error) {
        if (error.message.includes('refresh_token') || error.message.includes('not found')) {
          console.warn("Stale session detected in getSession, clearing...");
          await storage.signOut();
          return null;
        }
        throw error;
      }
      return data.session;
    } catch (e) {
      console.error("Session error:", e);
      return null;
    }
  },

  getUser: async () => {
    if (!supabaseInstance && !storage.initCloud()) return { data: { user: null }, error: new Error('Offline') };
    try {
      const result = await supabaseInstance!.auth.getUser();
      if (result.error && (result.error.message.includes('refresh_token') || result.error.status === 401)) {
        console.warn("User fetch failed due to auth error, signing out...");
        await storage.signOut();
      }
      return result;
    } catch (e) {
      return { data: { user: null }, error: e };
    }
  },

  onAuthChange: (callback: (session: Session | null) => void) => {
    if (!supabaseInstance && !storage.initCloud()) return () => {};
    const { data: { subscription } } = supabaseInstance!.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        callback(null);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        callback(session);
      }
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
      } catch (e) { console.warn("Supabase shifts fetch failed", e); }
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
      await supabaseInstance.from('shifts').upsert(payload);
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
    if (supabaseInstance) {
      await supabaseInstance.from('shifts').delete().eq('id', id);
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    if (supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('expenses').select('*');
        if (error) throw error;
        if (data) {
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
      } catch (e) { console.warn("Supabase expenses fetch failed", e); }
    }
    return local;
  },

  saveExpense: async (expense: Expense): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    const idx = local.findIndex((e: any) => e.id === expense.id);
    if (idx > -1) local[idx] = expense; else local.unshift(expense);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local));

    if (supabaseInstance) {
      const { data: { session } } = await supabaseInstance.auth.getSession();
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
      await supabaseInstance.from('expenses').upsert(payload);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local.filter((e: any) => e.id !== id)));
    if (supabaseInstance) {
      await supabaseInstance.from('expenses').delete().eq('id', id);
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
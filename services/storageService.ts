
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Shift, AppState } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';

// Helper to safely get env variables in browser
const getEnv = (key: string): string => {
  try {
    return (typeof process !== 'undefined' && process.env && (process.env as any)[key]) || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const storage = {
  getShifts: async (): Promise<Shift[]> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && data) return data;
        console.warn('Supabase fetch warning, falling back to local:', error);
      }
    } catch (e) {
      console.error('Supabase connection failed:', e);
    }
    
    // Fallback to localStorage
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    // Save locally first for reliability
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const index = localShifts.findIndex((s: Shift) => s.id === shift.id);
    if (index > -1) {
      localShifts[index] = shift;
    } else {
      localShifts.push(shift);
    }
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));

    // Sync with Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('shifts')
          .upsert({
            id: shift.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            driveHours: shift.driveHours,
            driveMinutes: shift.driveMinutes,
            timestamp: shift.timestamp
          });
        return !error;
      } catch (e) {
        console.error('Supabase sync error:', e);
        return false;
      }
    }
    return true;
  },

  deleteShift: async (id: string): Promise<boolean> => {
    // Delete locally
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const filtered = localShifts.filter((s: Shift) => s.id !== id);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(filtered));

    // Sync with Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', id);
        return !error;
      } catch (e) {
        console.error('Supabase delete error:', e);
        return false;
      }
    }
    return true;
  },

  getState: (): AppState => {
    const data = localStorage.getItem(STATE_KEY);
    return data ? JSON.parse(data) : { isActive: false, startTime: null };
  },
  saveState: (state: AppState) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  },
  clearState: () => {
    localStorage.removeItem(STATE_KEY);
  },
  
  isCloudEnabled: () => !!supabase
};

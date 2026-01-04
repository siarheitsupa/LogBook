
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Shift, AppState } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';

// Initialize Supabase only if environment variables are present
const supabaseUrl = (process.env as any).SUPABASE_URL || '';
const supabaseKey = (process.env as any).SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const storage = {
  getShifts: async (): Promise<Shift[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (!error && data) return data;
      console.error('Supabase fetch error:', error);
    }
    
    // Fallback to localStorage
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    // Save locally first
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
      const { error } = await supabase
        .from('shifts')
        .upsert(shift);
      return !error;
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
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
      return !error;
    }
    return true;
  },

  // State is still kept locally as it's volatile/session-based
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

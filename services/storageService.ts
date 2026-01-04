import { createClient } from '@supabase/supabase-js';
import { Shift, AppState } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';

// Функция для безопасного получения переменных окружения в браузере
const getEnv = (key: string): string => {
  try {
    // Сначала проверяем наш shim в window, затем нативный process (если он есть)
    const env = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : {});
    return env[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

// Инициализируем только при наличии ключей, чтобы избежать ошибок внутри библиотеки
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const storage = {
  getShifts: async (): Promise<Shift[]> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && data) return data;
        if (error) console.warn('Supabase fetch warning:', error.message);
      }
    } catch (e) {
      console.error('Supabase connection failed:', e);
    }
    
    // Резервное копирование в localStorage
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    // Сохраняем локально сразу для мгновенного отклика UI
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const index = localShifts.findIndex((s: Shift) => s.id === shift.id);
    if (index > -1) {
      localShifts[index] = shift;
    } else {
      localShifts.push(shift);
    }
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));

    // Синхронизация с Supabase
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
    // Удаляем локально
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const filtered = localShifts.filter((s: Shift) => s.id !== id);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(filtered));

    // Удаляем в Supabase
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
    try {
      const data = localStorage.getItem(STATE_KEY);
      return data ? JSON.parse(data) : { isActive: false, startTime: null };
    } catch {
      return { isActive: false, startTime: null };
    }
  },
  saveState: (state: AppState) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  },
  clearState: () => {
    localStorage.removeItem(STATE_KEY);
  },
  
  isCloudEnabled: () => !!supabase
};
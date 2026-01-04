import { createClient } from '@supabase/supabase-js';
import { Shift, AppState } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';

// Пытаемся получить переменные окружения из разных возможных мест (process.env или window.process.env)
const getEnv = (key: string): string => {
  const value = process.env[key] || (window as any).process?.env?.[key];
  return value || '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase: Инициализирован успешно.');
  } catch (e) {
    console.error('❌ Supabase: Ошибка при создании клиента:', e);
  }
} else {
  console.warn('⚠️ Supabase: Ключи не найдены. Работает только локальное хранилище.');
  console.log('Доступные ключи:', Object.keys(process.env));
}

export const storage = {
  getShifts: async (): Promise<Shift[]> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (error) {
          console.error('❌ Supabase Fetch Error:', error.message);
        } else if (data) {
          return data;
        }
      }
    } catch (e) {
      console.error('❌ Supabase Connection Failed:', e);
    }
    
    // Резервное копирование в localStorage
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    // 1. Сначала сохраняем локально
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const index = localShifts.findIndex((s: Shift) => s.id === shift.id);
    if (index > -1) {
      localShifts[index] = shift;
    } else {
      localShifts.push(shift);
    }
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));

    // 2. Если облако включено, синхронизируем
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

        if (error) {
          console.error('❌ Supabase Upsert Error:', error.message, error.details);
          return false;
        }
        console.log('☁️ Данные успешно синхронизированы с облаком');
        return true;
      } catch (e) {
        console.error('❌ Supabase Sync Exception:', e);
        return false;
      }
    }
    return true;
  },

  deleteShift: async (id: string): Promise<boolean> => {
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const filtered = localShifts.filter((s: Shift) => s.id !== id);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(filtered));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('❌ Supabase Delete Error:', error.message);
          return false;
        }
      } catch (e) {
        console.error('❌ Supabase Delete Exception:', e);
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
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
        console.log('✅ Supabase: Инициализирован');
        return true;
      } catch (e) {
        console.error('❌ Supabase: Ошибка инициализации', e);
        return false;
      }
    }
    return false;
  },

  getShifts: async (): Promise<Shift[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && data) {
          // Маппинг из snake_case (БД) обратно в camelCase (Приложение)
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
        if (error) console.error('🔴 Ошибка загрузки:', error.message);
      } catch (e) {
        console.error('🔴 Исключение при загрузке:', e);
      }
    }
    
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveShift: async (shift: Shift): Promise<boolean> => {
    // Сначала локально
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const index = localShifts.findIndex((s: Shift) => s.id === shift.id);
    if (index > -1) localShifts[index] = shift;
    else localShifts.push(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));

    // Синхронизация: Маппинг в snake_case для БД
    if (supabase) {
      try {
        const { error } = await supabase.from('shifts').upsert({
          id: shift.id,
          date: shift.date,
          start_time: shift.startTime,
          end_time: shift.endTime,
          drive_hours: shift.driveHours,
          drive_minutes: shift.driveMinutes,
          timestamp: shift.timestamp
        });

        if (error) {
          console.error('🔴 ОШИБКА SUPABASE:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.error('🔴 Критическая ошибка:', e);
        return false;
      }
    }
    return true;
  },

  deleteShift: async (id: string): Promise<boolean> => {
    const localShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts.filter((s: Shift) => s.id !== id)));

    if (supabase) {
      try {
        const { error } = await supabase.from('shifts').delete().eq('id', id);
        return !error;
      } catch (e) {
        return false;
      }
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
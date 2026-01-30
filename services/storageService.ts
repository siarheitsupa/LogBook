
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Shift, AppState, CloudConfig, Expense } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const EXPENSES_KEY = 'driverlog_expenses_v1';
const STATE_KEY = 'driverlog_state_v1';
const CLOUD_CONFIG_KEY = 'driverlog_cloud_config_v1';

const DEFAULT_URL = 'https://onxpylvydjyhlvsaacur.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueHB5bHZ5ZGp5aGx2c2FhY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDY1OTksImV4cCI6MjA4MzEyMjU5OX0.O1nLUMSSY8VfSGdoa8u_06eKRV0B-yTodLWOMnscZFA';

let supabaseInstance: SupabaseClient | null = null;

const getConfig = () => {
  if (DEFAULT_URL && DEFAULT_KEY && DEFAULT_URL.startsWith('http')) return { url: DEFAULT_URL, key: DEFAULT_KEY };
  const localUrl = localStorage.getItem(`${CLOUD_CONFIG_KEY}_url`);
  const localKey = localStorage.getItem(`${CLOUD_CONFIG_KEY}_key`);
  if (localUrl && localKey) return { url: localUrl, key: localKey };
  return null;
};

export const storage = {
  isConfigured: () => !!supabaseInstance || !!getConfig(),
  initCloud: (manualConfig?: CloudConfig): boolean => {
    let config = manualConfig ? { url: manualConfig.url, key: manualConfig.key } : getConfig();
    if (!config) return false;
    if (supabaseInstance) return true;
    try {
      supabaseInstance = createClient(config.url, config.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
      });
      if (manualConfig) {
        localStorage.setItem(`${CLOUD_CONFIG_KEY}_url`, config.url);
        localStorage.setItem(`${CLOUD_CONFIG_KEY}_key`, config.key);
      }
      return true;
    } catch (e) { return false; }
  },
  signUp: async (e: string, p: string) => { storage.initCloud(); return await supabaseInstance!.auth.signUp({ email: e, password: p }); },
  signIn: async (e: string, p: string) => { storage.initCloud(); return await supabaseInstance!.auth.signInWithPassword({ email: e, password: p }); },
  signOut: async () => {
    if (supabaseInstance) await supabaseInstance.auth.signOut();
    Object.keys(localStorage).forEach(key => { if (key.includes('supabase.auth.token') || key.includes('sb-')) localStorage.removeItem(key); });
    window.location.reload();
  },
  getSession: async () => { storage.initCloud(); return (await supabaseInstance?.auth.getSession())?.data.session || null; },
  getUser: async () => { storage.initCloud(); return await supabaseInstance!.auth.getUser(); },
  onAuthChange: (cb: any) => { storage.initCloud(); return supabaseInstance!.auth.onAuthStateChange((ev, ses) => cb(ses)).data.subscription.unsubscribe; },

  getShifts: async (): Promise<Shift[]> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    if (storage.initCloud()) {
      try {
        const { data, error } = await supabaseInstance!.from('shifts').select('*').order('timestamp', { ascending: false });
        if (!error && data) {
          const cloudData = data.map((item: any) => ({
            id: item.id,
            startDate: item.date,
            endDate: item.end_date || item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            driveHours: Number(item.drive_hours || 0),
            driveMinutes: Number(item.drive_minutes || 0),
            driveHoursDay2: Number(item.drive_hours_day2 || 0),
            driveMinutesDay2: Number(item.drive_minutes_day2 || 0),
            workHours: Number(item.work_hours || 0),
            workMinutes: Number(item.work_minutes || 0),
            timestamp: Number(item.timestamp),
            startLat: item.start_lat, startLng: item.start_lng,
            endLat: item.end_lat, endLng: item.end_lng,
            isCompensated: item.is_compensated || false
          }));
          localStorage.setItem(SHIFTS_KEY, JSON.stringify(cloudData));
          return cloudData;
        }
      } catch (e) {}
    }
    return local;
  },

  saveShift: async (shift: Shift): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    const idx = local.findIndex((s: any) => s.id === shift.id);
    if (idx > -1) local[idx] = shift; else local.unshift(shift);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local));

    if (storage.initCloud()) {
      const { data: { session } } = await supabaseInstance!.auth.getSession();
      if (!session?.user) return;
      const payload: any = {
        id: shift.id,
        date: shift.startDate,
        end_date: shift.endDate,
        start_time: shift.startTime,
        end_time: shift.endTime,
        drive_hours: shift.driveHours,
        drive_minutes: shift.driveMinutes,
        drive_hours_day2: shift.driveHoursDay2 || 0,
        drive_minutes_day2: shift.driveMinutesDay2 || 0,
        work_hours: shift.workHours,
        work_minutes: shift.workMinutes,
        timestamp: shift.timestamp,
        user_id: session.user.id,
        start_lat: shift.startLat, start_lng: shift.startLng,
        end_lat: shift.endLat, end_lng: shift.endLng,
        is_compensated: shift.isCompensated || false
      };
      await supabaseInstance!.from('shifts').upsert(payload);
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    const local = JSON.parse(localStorage.getItem(SHIFTS_KEY) || '[]');
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(local.filter((s: any) => s.id !== id)));
    if (storage.initCloud()) await supabaseInstance!.from('shifts').delete().eq('id', id);
  },

  getExpenses: async () => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    if (storage.initCloud()) {
      const { data, error } = await supabaseInstance!.from('expenses').select('*');
      if (!error && data) {
        const cloudData = data.map((i: any) => ({ id: i.id, shiftId: i.shift_id, category: i.category, amount: Number(i.amount), currency: i.currency, timestamp: Number(i.timestamp), description: i.description }));
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(cloudData));
        return cloudData;
      }
    }
    return local;
  },
  saveExpense: async (e: any) => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    local.unshift(e);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local));
    if (storage.initCloud()) {
      const { data: { session } } = await supabaseInstance!.auth.getSession();
      if (session?.user) await supabaseInstance!.from('expenses').upsert({ id: e.id, shift_id: e.shiftId, category: e.category, amount: e.amount, currency: e.currency, timestamp: e.timestamp, description: e.description, user_id: session.user.id });
    }
  },
  deleteExpense: async (id: string) => {
    const local = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(local.filter((e: any) => e.id !== id)));
    if (storage.initCloud()) await supabaseInstance!.from('expenses').delete().eq('id', id);
  },
  getState: (): AppState => JSON.parse(localStorage.getItem(STATE_KEY) || '{"isActive":false,"startTime":null}'),
  saveState: (s: AppState) => localStorage.setItem(STATE_KEY, JSON.stringify(s)),
  clearState: () => localStorage.removeItem(STATE_KEY),
  resetCloud: () => { localStorage.removeItem(`${CLOUD_CONFIG_KEY}_url`); localStorage.removeItem(`${CLOUD_CONFIG_KEY}_key`); supabaseInstance = null; }
};

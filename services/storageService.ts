
import { Shift, AppState } from '../types';

const SHIFTS_KEY = 'driverlog_shifts_v1';
const STATE_KEY = 'driverlog_state_v1';

export const storage = {
  getShifts: (): Shift[] => {
    const data = localStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveShifts: (shifts: Shift[]) => {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
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
  }
};

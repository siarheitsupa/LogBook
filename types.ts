export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  driveHours: number;
  driveMinutes: number;
  workHours: number; // Новое поле: прочая работа (молотки)
  workMinutes: number; // Новое поле: прочая работа (молотки)
  timestamp: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

export interface AppState {
  isActive: boolean;
  startTime: number | null;
  startLat?: number;
  startLng?: number;
}

export interface RestEvent {
  type: 'regular' | 'reduced' | 'long_pause';
  durationHours: number;
  durationMinutes: number;
  debtHours: number;
}

export interface ShiftWithRest extends Shift {
  restBefore?: RestEvent;
}

export interface CloudConfig {
  url: string;
  key: string;
  geminiKey?: string;
}
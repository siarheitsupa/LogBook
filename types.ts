
export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  driveHours: number;
  driveMinutes: number;
  timestamp: number;
}

export interface AppState {
  isActive: boolean;
  startTime: number | null;
}

export interface RestEvent {
  type: 'regular' | 'reduced';
  durationHours: number;
  durationMinutes: number;
  debtHours: number;
}

export interface ShiftWithRest extends Shift {
  restBefore?: RestEvent;
}

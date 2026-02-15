
export interface Shift {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  driveHours: number;
  driveMinutes: number;
  driveHoursDay2?: number; // Вождение после 00:00 второго дня
  driveMinutesDay2?: number;
  workHours: number; 
  workMinutes: number; 
  timestamp: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  isCompensated?: boolean;
  startMileage?: number; // Пробег на старте
  endMileage?: number;   // Пробег на финише
}

export type ExpenseCategory = 'Parking' | 'Customs' | 'Fuel' | 'Wash' | 'Toll' | 'Food' | 'Other';
export type Currency = 'EUR' | 'PLN' | 'BYN' | 'HUF' | 'USD';

export interface Expense {
  id: string;
  shiftId: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  timestamp: number;
  description?: string;
}

export interface AppState {
  isActive: boolean;
  startTime: number | null;
  startLat?: number;
  startLng?: number;
  startDate?: string;
  startMileage?: number; // Храним пробег старта в состоянии
}

export interface RestEvent {
  type: 'regular' | 'reduced' | 'weekly_reduced' | 'long_pause';
  durationHours: number;
  durationMinutes: number;
  debtHours: number;
  compensationDeadline?: number | null;
  isCompensated?: boolean;
}

export interface ShiftWithRest extends Shift {
  restBefore?: RestEvent;
  expenses?: Expense[];
}

export interface CloudConfig {
  url: string;
  key: string;
  geminiKey?: string;
}

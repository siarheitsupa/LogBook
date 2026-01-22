
// Интерфейс для хранения информации о паузах внутри смены
export interface Break {
  durationMinutes: number;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  driveHours: number;
  driveMinutes: number;
  workHours: number;
  workMinutes: number;
  timestamp: number;
  isCompensated?: boolean;
  // Дополнительные поля для расширенной функциональности (паузы и геолокация)
  breaks?: Break[];
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

export interface AppState {
  isActive: boolean;
  startTime: number | null;
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
}

// Конфигурация для ручного подключения к облаку Supabase
export interface CloudConfig {
  url: string;
  key: string;
}

// Типы для модуля управления расходами
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

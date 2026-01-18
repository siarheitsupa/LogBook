import { Shift, RestEvent, ShiftWithRest } from '../types';

export const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * Исправленная функция форматирования. 
 * Сначала округляет общее время до минут, затем делит на часы/минуты.
 * Это гарантирует, что 539.99 мин станет 09:00, а не 08:60.
 */
export const formatMinsToHHMM = (totalMinutes: number) => {
  if (isNaN(totalMinutes) || totalMinutes < 0) return "00:00";
  const roundedTotalMins = Math.round(totalMinutes);
  const h = Math.floor(roundedTotalMins / 60);
  const m = roundedTotalMins % 60;
  return `${pad(h)}:${pad(m)}`;
};

export const getMonday = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const calculateShiftDurationMins = (shift: Shift): number => {
  const start = new Date(`${shift.date}T${shift.startTime}`).getTime();
  const end = new Date(`${shift.date}T${shift.endTime}`).getTime();
  
  let diff = end - start;
  if (diff < 0) {
    diff += 24 * 60 * 60 * 1000;
  }
  return diff / (1000 * 60);
};

/**
 * Расчет итогов с учетом правил ЕС 561/2006:
 * - Регулярный недельный отдых: 45+ ч (долг 0)
 * - Сокращенный недельный отдых: 24-45 ч (долг = 45 - факт)
 * - Регулярный ежедневный отдых: 11+ ч (долг 0)
 * - Сокращенный ежедневный отдых: 9-11 ч (долг = 11 - факт)
 */
export const calculateLogSummary = (shifts: Shift[]) => {
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  const enriched: ShiftWithRest[] = [];
  let totalDebt = 0;

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    let restEvent: RestEvent | undefined;

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevEnd = new Date(`${prev.date}T${prev.endTime}`);
      const currStart = new Date(`${curr.date}T${curr.startTime}`);
      
      const diffMs = currStart.getTime() - prevEnd.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Если отдых больше 9 часов, это значимое событие отдыха
      if (diffHours >= 9) {
        const h = Math.floor(diffHours);
        const m = Math.round((diffHours - h) * 60);
        
        if (diffHours >= 45) {
          // Регулярный недельный
          restEvent = { type: 'regular', durationHours: h, durationMinutes: m, debtHours: 0 };
        } else if (diffHours >= 24) {
          // Сокращенный недельный (Компенсация обязательна)
          const debt = 45 - diffHours;
          totalDebt += debt;
          restEvent = { type: 'reduced', durationHours: h, durationMinutes: m, debtHours: debt };
        } else if (diffHours >= 11) {
          // Регулярный ежедневный
          restEvent = { type: 'regular', durationHours: h, durationMinutes: m, debtHours: 0 };
        } else {
          // Сокращенный ежедневный (9-11ч)
          // Технически 561/2006 не требует компенсации ежедневного отдыха в часы, 
          // но многие водители его отслеживают. Оставляем по просьбе пользователя.
          const debt = 11 - diffHours;
          totalDebt += debt;
          restEvent = { type: 'reduced', durationHours: h, durationMinutes: m, debtHours: debt };
        }
      }
    }
    
    enriched.push({ ...curr, restBefore: restEvent });
  }

  return {
    shifts: enriched.reverse(),
    totalDebt
  };
};

export const getStats = (shifts: Shift[]) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const currentWeekStart = getMonday(now).getTime();
  const prevWeekStart = currentWeekStart - (7 * 24 * 60 * 60 * 1000);

  let weekMins = 0;
  let biWeekMins = 0;
  let dailyDutyMins = 0;
  let extDrivingCount = 0;
  let extDutyCount = 0;

  shifts.forEach(s => {
    const shiftTimestamp = new Date(s.date).getTime();
    const driveMins = s.driveHours * 60 + s.driveMinutes;
    const dutyMins = calculateShiftDurationMins(s);

    if (shiftTimestamp >= currentWeekStart) {
      weekMins += driveMins;
      if (driveMins > 9 * 60) extDrivingCount++;
      if (dutyMins > 13 * 60) extDutyCount++;
    }
    
    if (shiftTimestamp >= prevWeekStart) {
      biWeekMins += driveMins;
    }

    if (shiftTimestamp >= todayStart) {
      dailyDutyMins += dutyMins;
    }
  });

  return { weekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount };
};

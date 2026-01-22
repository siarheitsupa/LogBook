import { Shift, RestEvent, ShiftWithRest } from '../types';
 
export const pad = (n: number) => n.toString().padStart(2, '0');
 
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
 
// Получение номера недели для группировки
const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
 
export const calculateLogSummary = (shifts: Shift[]) => {
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  const enriched: ShiftWithRest[] = [];
  let totalDebt = 0;
 
  // Группируем смены по неделям для анализа отдыха
  const weeklyRests: Record<string, number> = {};
 
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    const prevStartTs = new Date(`${prev.date}T${prev.startTime}`).getTime();
    const prevEndTs = new Date(`${prev.date}T${prev.endTime}`).getTime();
    let realPrevEndTs = prevEndTs <= prevStartTs ? prevEndTs + 86400000 : prevEndTs;
    
    const currStartTs = new Date(`${curr.date}T${curr.startTime}`).getTime();
    const diffHours = (currStartTs - realPrevEndTs) / 3600000;
 
    if (diffHours >= 24) {
      const weekKey = `${new Date(currStartTs).getFullYear()}-W${getWeekNumber(new Date(currStartTs))}`;
      if (!weeklyRests[weekKey] || diffHours > weeklyRests[weekKey]) {
        weeklyRests[weekKey] = diffHours;
      }
    }
  }
 
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    let restEvent: RestEvent | undefined;
 
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevStartTs = new Date(`${prev.date}T${prev.startTime}`).getTime();
      const prevEndTs = new Date(`${prev.date}T${prev.endTime}`).getTime();
      let realPrevEndTs = prevEndTs <= prevStartTs ? prevEndTs + 86400000 : prevEndTs;
      
      const currStartTs = new Date(`${curr.date}T${curr.startTime}`).getTime();
      const diffMs = currStartTs - realPrevEndTs;
      const diffHours = diffMs / 3600000;
 
      if (diffHours >= 9) {
        const h = Math.floor(diffHours);
        const m = Math.round((diffHours - h) * 60);
        const weekKey = `${new Date(currStartTs).getFullYear()}-W${getWeekNumber(new Date(currStartTs))}`;
        
        let type: 'regular' | 'reduced' | 'weekly_reduced' | 'long_pause' = 'regular';
        let debt = 0;
        let deadline: number | null = null;
 
        if (diffHours >= 45) {
          type = 'regular';
        } else if (diffHours >= 24) {
          if (weeklyRests[weekKey] === diffHours) {
            type = 'weekly_reduced';
            debt = 45 - diffHours;
            
            // Дедлайн: Конец текущей недели + 21 день
            const sunday = new Date(currStartTs);
            const day = sunday.getDay();
            const diffToSunday = day === 0 ? 0 : 7 - day;
            sunday.setDate(sunday.getDate() + diffToSunday);
            sunday.setHours(23, 59, 59, 999);
            
            deadline = sunday.getTime() + (21 * 24 * 60 * 60 * 1000);
          } else {
            type = 'long_pause';
            debt = 0;
          }
        } else if (diffHours >= 11) {
          type = 'regular';
        } else {
          type = 'reduced';
          debt = 11 - diffHours;
        }
 
        if (!curr.isCompensated) {
           totalDebt += debt;
        }
        
        restEvent = { 
          type, 
          durationHours: h, 
          durationMinutes: m, 
          debtHours: debt,
          compensationDeadline: deadline,
          isCompensated: curr.isCompensated || false
        };
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
  let workWeekMins = 0;
  let biWeekMins = 0;
  let dailyDutyMins = 0;
  let extDrivingCount = 0;
  let extDutyCount = 0;
 
  shifts.forEach(s => {
    const shiftTimestamp = new Date(s.date).getTime();
    const driveMins = s.driveHours * 60 + s.driveMinutes;
    const workMins = (s.workHours || 0) * 60 + (s.workMinutes || 0);
    const dutyMins = calculateShiftDurationMins(s);
 
    if (shiftTimestamp >= currentWeekStart) {
      weekMins += driveMins;
      workWeekMins += workMins;
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
 
  return { weekMins, workWeekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount };
};
 
// ==========================================
// ВАЛИДАЦИЯ СМЕН ПО ПРАВИЛАМ ЕС 561/2006
// ==========================================
export const validateShift = (newShift: Shift, existingShifts: Shift[]): { valid: boolean; error?: string } => {
  const monday = getMonday(new Date(newShift.date));
  const currentWeekStart = monday.getTime();
  const prevWeekStart = currentWeekStart - (7 * 24 * 60 * 60 * 1000);
  
  const shiftTimestamp = new Date(newShift.date).getTime();
  const driveMins = newShift.driveHours * 60 + newShift.driveMinutes;
  const dutyMins = calculateShiftDurationMins(newShift);
  
  // Если редактируем - исключаем старую версию смены из подсчета
  const shiftsToCount = newShift.id 
    ? existingShifts.filter(s => s.id !== newShift.id) 
    : existingShifts;
  
  // Подсчет для текущей недели
  let weekMins = 0;
  let extDrivingCount = 0; // количество смен > 9 часов
  
  shiftsToCount.forEach(s => {
    const sTimestamp = new Date(s.date).getTime();
    const sDriveMins = s.driveHours * 60 + s.driveMinutes;
    
    if (sTimestamp >= currentWeekStart) {
      weekMins += sDriveMins;
      if (sDriveMins > 9 * 60) extDrivingCount++;
    }
  });
  
  // Добавляем новую смену в подсчет
  if (shiftTimestamp >= currentWeekStart) {
    weekMins += driveMins;
    if (driveMins > 9 * 60) extDrivingCount++;
  }
  
  // Подсчет для 2 недель
  let biWeekMins = 0;
  [...shiftsToCount, newShift].forEach(s => {
    const sTimestamp = new Date(s.date).getTime();
    if (sTimestamp >= prevWeekStart) {
      biWeekMins += s.driveHours * 60 + s.driveMinutes;
    }
  });
  
  // === ПРОВЕРКИ ===
  
  // 1. Проверка: не превышает ли смена 13 часов
  if (dutyMins > 13 * 60) {
    return { valid: false, error: `❌ Смена превышает 13 часов (${formatMinsToHHMM(dutyMins)}).` };
  }
  
  // 2. Проверка: вождение > 10 часов
  if (driveMins > 10 * 60) {
    return { valid: false, error: '❌ Вождение не может превышать 10 часов за смену.' };
  }
  
  // 3. Проверка: уже 3 смены > 9 часов на этой неделе
  if (extDrivingCount > 3) {
    return { valid: false, error: '❌ Максимум 3 смены > 9 часов в неделю. Уже использовано.' };
  }
  
  // 4. Проверка: недельный лимит 56 часов
  if (weekMins > 56 * 60) {
    return { valid: false, error: `❌ Лимит 56 часов в неделю превышен (${formatMinsToHHMM(weekMins)}).` };
  }
  
  // 5. Проверка: двухнедельный лимит 90 часов
  if (biWeekMins > 90 * 60) {
    return { valid: false, error: `❌ Лимит 90 часов за 2 недели превышен (${formatMinsToHHMM(biWeekMins)}).` };
  }
  
  return { valid: true };
};

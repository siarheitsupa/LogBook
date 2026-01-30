
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

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const calculateShiftDurationMins = (shift: Shift): number => {
  const start = new Date(`${shift.startDate}T${shift.startTime}`).getTime();
  const end = new Date(`${shift.endDate}T${shift.endTime}`).getTime();
  
  const diff = end - start;
  return Math.max(0, diff / (1000 * 60));
};

export interface WeekGroupData {
  weekStart: number; // timestamp понедельника
  weekEnd: number;   // timestamp воскресенья
  totalDriveMins: number;
  shifts: ShiftWithRest[];
  isCurrentWeek: boolean;
}

export const groupShiftsByWeek = (shifts: ShiftWithRest[]): WeekGroupData[] => {
  const groups: Record<number, WeekGroupData> = {};
  const currentMonday = getMonday(new Date()).getTime();

  shifts.forEach(shift => {
    // Группируем по startDate (как по началу рабочего цикла)
    const date = new Date(shift.startDate);
    const monday = getMonday(date).getTime();

    if (!groups[monday]) {
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      groups[monday] = {
        weekStart: monday,
        weekEnd: sunday.getTime(),
        totalDriveMins: 0,
        shifts: [],
        isCurrentWeek: monday === currentMonday
      };
    }

    groups[monday].shifts.push(shift);
    // Для группировки в списке используем упрощенный подсчет, 
    // детальный сплит будет в getStats для лимитов
    groups[monday].totalDriveMins += (shift.driveHours * 60) + shift.driveMinutes;
  });

  return Object.values(groups).sort((a, b) => b.weekStart - a.weekStart);
};

export const calculateLogSummary = (shifts: Shift[]) => {
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  const enriched: ShiftWithRest[] = [];
  let totalDebt = 0;
  const now = Date.now();

  const weeklyRests: Record<string, number> = {};

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    const prevEndTs = new Date(`${prev.endDate}T${prev.endTime}`).getTime();
    const currStartTs = new Date(`${curr.startDate}T${curr.startTime}`).getTime();
    const diffHours = (currStartTs - prevEndTs) / 3600000;

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
      const prevEndTs = new Date(`${prev.endDate}T${prev.endTime}`).getTime();
      const currStartTs = new Date(`${curr.startDate}T${curr.startTime}`).getTime();
      const diffMs = currStartTs - prevEndTs;
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
          debt = 0;
        } else if (diffHours >= 24) {
          if (weeklyRests[weekKey] === diffHours) {
            type = 'weekly_reduced';
            debt = 45 - diffHours;
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
          debt = 0;
        } else {
          type = 'reduced';
          debt = 0;
        }

        if (!curr.isCompensated && debt > 0) {
           if (!deadline || deadline > now) {
             totalDebt += debt;
           }
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
    totalDebt: Math.max(0, totalDebt)
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
    const startTs = new Date(`${s.startDate}T${s.startTime}`).getTime();
    const endTs = new Date(`${s.endDate}T${s.endTime}`).getTime();
    
    const driveMinsTotal = s.driveHours * 60 + s.driveMinutes;
    const workMinsTotal = (s.workHours || 0) * 60 + (s.workMinutes || 0);
    const dutyMinsTotal = calculateShiftDurationMins(s);

    // Умное распределение времени вождения по неделям (Sunday/Monday split)
    const calculatePortion = (threshold: number) => {
        if (startTs >= threshold) return driveMinsTotal; // Смена целиком в этой неделе
        if (endTs <= threshold) return 0; // Смена целиком в прошлой неделе
        
        // Смена пересекает границу. Распределяем вождение пропорционально времени смены.
        const duration = endTs - startTs;
        const portionAfter = endTs - threshold;
        return (driveMinsTotal * portionAfter) / duration;
    };

    const driveInCurrentWeek = calculatePortion(currentWeekStart);
    const driveInPrevWeek = calculatePortion(prevWeekStart) - driveInCurrentWeek;

    weekMins += driveInCurrentWeek;
    biWeekMins += calculatePortion(prevWeekStart);

    if (startTs >= currentWeekStart) {
        workWeekMins += workMinsTotal;
        if (driveMinsTotal > 9 * 60) extDrivingCount++;
        if (dutyMinsTotal > 13 * 60) extDutyCount++;
    }
    
    if (startTs >= todayStart) {
      dailyDutyMins += dutyMinsTotal;
    }
  });

  return { weekMins, workWeekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount };
};

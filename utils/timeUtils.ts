
import { Shift, RestEvent, ShiftWithRest } from '../types';

export const pad = (n: number) => n.toString().padStart(2, '0');

export const formatDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTimeHHMM = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

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

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const getShiftStartTimestamp = (shift: Shift) => new Date(`${shift.date}T${shift.startTime}`).getTime();

export const getShiftEndDate = (shift: Shift) => {
  if (shift.endDate) return shift.endDate;
  const startMinutes = toMinutes(shift.startTime);
  const endMinutes = toMinutes(shift.endTime);
  if (endMinutes < startMinutes) {
    const nextDay = new Date(`${shift.date}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    return formatDateInput(nextDay);
  }
  return shift.date;
};

export const getShiftEndTimestamp = (shift: Shift) => {
  const startTs = getShiftStartTimestamp(shift);
  const endDate = getShiftEndDate(shift);
  let endTs = new Date(`${endDate}T${shift.endTime}`).getTime();
  if (endTs <= startTs) {
    endTs += 24 * 60 * 60 * 1000;
  }
  return endTs;
};

export interface ShiftDailyAllocation {
  date: string;
  driveMins: number;
  workMins: number;
  dutyMins: number;
}

export const getShiftDailyAllocations = (shift: Shift): ShiftDailyAllocation[] => {
  const startTs = getShiftStartTimestamp(shift);
  const endTs = getShiftEndTimestamp(shift);
  const totalDutyMins = Math.max(1, (endTs - startTs) / 60000);
  const driveMins = (shift.driveHours || 0) * 60 + (shift.driveMinutes || 0);
  const workMins = (shift.workHours || 0) * 60 + (shift.workMinutes || 0);
  const allocations: ShiftDailyAllocation[] = [];

  let current = startTs;
  while (current < endTs) {
    const nextMidnight = new Date(current);
    nextMidnight.setHours(24, 0, 0, 0);
    const segmentEnd = Math.min(endTs, nextMidnight.getTime());
    const segmentMins = (segmentEnd - current) / 60000;
    const ratio = segmentMins / totalDutyMins;
    allocations.push({
      date: formatDateInput(new Date(current)),
      driveMins: driveMins * ratio,
      workMins: workMins * ratio,
      dutyMins: segmentMins
    });
    current = segmentEnd;
  }

  return allocations;
};

export interface ShiftDailySegment extends ShiftDailyAllocation {
  startTime: string;
  endTime: string;
  isFirstDay: boolean;
  isLastDay: boolean;
}

export const getShiftDailySegments = (shift: Shift): ShiftDailySegment[] => {
  const startTs = getShiftStartTimestamp(shift);
  const endTs = getShiftEndTimestamp(shift);
  const totalDutyMins = Math.max(1, (endTs - startTs) / 60000);
  const driveMins = (shift.driveHours || 0) * 60 + (shift.driveMinutes || 0);
  const workMins = (shift.workHours || 0) * 60 + (shift.workMinutes || 0);
  const segments: ShiftDailySegment[] = [];

  let current = startTs;
  let index = 0;
  while (current < endTs) {
    const nextMidnight = new Date(current);
    nextMidnight.setHours(24, 0, 0, 0);
    const segmentEnd = Math.min(endTs, nextMidnight.getTime());
    const segmentMins = (segmentEnd - current) / 60000;
    const ratio = segmentMins / totalDutyMins;
    const segmentStartDate = new Date(current);
    const segmentEndDate = new Date(segmentEnd);
    const isEndOfDay = segmentEndDate.getHours() === 0 && segmentEndDate.getMinutes() === 0 && segmentEnd > current;
    const isFirstDay = index === 0;
    const isLastDay = segmentEnd === endTs;

    segments.push({
      date: formatDateInput(segmentStartDate),
      startTime: formatTimeHHMM(segmentStartDate),
      endTime: isEndOfDay ? '24:00' : formatTimeHHMM(segmentEndDate),
      driveMins: driveMins * ratio,
      workMins: workMins * ratio,
      dutyMins: segmentMins,
      isFirstDay,
      isLastDay
    });
    current = segmentEnd;
    index += 1;
  }

  return segments;
};

// Получение номера недели для группировки
const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const calculateShiftDurationMins = (shift: Shift): number => {
  const start = getShiftStartTimestamp(shift);
  const end = getShiftEndTimestamp(shift);
  return Math.max(0, (end - start) / (1000 * 60));
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
    const allocations = getShiftDailyAllocations(shift);
    const weeksForShift = new Set<number>();

    allocations.forEach(allocation => {
      const allocationDate = new Date(`${allocation.date}T00:00:00`);
      const monday = getMonday(allocationDate).getTime();
      weeksForShift.add(monday);

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

      groups[monday].totalDriveMins += allocation.driveMins;
    });

    weeksForShift.forEach(monday => {
      if (!groups[monday]) return;
      if (!groups[monday].shifts.find(s => s.id === shift.id)) {
        groups[monday].shifts.push(shift);
      }
    });
  });

  // Превращаем в массив и сортируем от новых к старым
  return Object.values(groups).sort((a, b) => b.weekStart - a.weekStart);
};

export const calculateLogSummary = (shifts: Shift[]) => {
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  const enriched: ShiftWithRest[] = [];
  let totalDebt = 0;
  const now = Date.now();

  // Группируем смены по неделям для анализа отдыха
  const weeklyRests: Record<string, number> = {};

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    const realPrevEndTs = getShiftEndTimestamp(prev);
    const currStartTs = getShiftStartTimestamp(curr);
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
      const realPrevEndTs = getShiftEndTimestamp(prev);
      const currStartTs = getShiftStartTimestamp(curr);
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
          debt = 0;
        } else if (diffHours >= 24) {
          if (weeklyRests[weekKey] === diffHours) {
            type = 'weekly_reduced';
            debt = 45 - diffHours;
            
            // Дедлайн: Конец текущей недели + 21 день (3 недели)
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
          debt = 0; // Сокращенный ежедневный отдых не требует компенсации
        }

        if (!curr.isCompensated && debt > 0) {
           // Если дедлайн установлен и еще не прошел - считаем долг
           // Если дедлайн прошел - это уже не "долг к возврату", а старое нарушение
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
    totalDebt: Math.max(0, totalDebt) // Защита от отрицательных значений
  };
};

export const getStats = (shifts: Shift[]) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const currentWeekStart = getMonday(now).getTime();
  const prevWeekStart = currentWeekStart - (7 * 24 * 60 * 60 * 1000);
  const todayEnd = todayStart + (24 * 60 * 60 * 1000);

  let weekMins = 0;
  let workWeekMins = 0;
  let biWeekMins = 0;
  let dailyDutyMins = 0;
  let extDrivingCount = 0;
  let extDutyCount = 0;

  shifts.forEach(s => {
    const driveMins = s.driveHours * 60 + s.driveMinutes;
    const workMins = (s.workHours || 0) * 60 + (s.workMinutes || 0);
    const dutyMins = calculateShiftDurationMins(s);
    const allocations = getShiftDailyAllocations(s);
    const inCurrentWeek = allocations.some(allocation => new Date(`${allocation.date}T00:00:00`).getTime() >= currentWeekStart);

    allocations.forEach(allocation => {
      const allocationTs = new Date(`${allocation.date}T00:00:00`).getTime();
      if (allocationTs >= currentWeekStart) {
        weekMins += allocation.driveMins;
        workWeekMins += allocation.workMins;
      }
      if (allocationTs >= prevWeekStart) {
        biWeekMins += allocation.driveMins;
      }
      if (allocationTs >= todayStart && allocationTs < todayEnd) {
        dailyDutyMins += allocation.dutyMins;
      }
    });

    if (inCurrentWeek) {
      if (driveMins > 9 * 60) extDrivingCount++;
      if (dutyMins > 13 * 60) extDutyCount++;
    }
  });

  return { weekMins, workWeekMins, biWeekMins, dailyDutyMins, extDrivingCount, extDutyCount };
};

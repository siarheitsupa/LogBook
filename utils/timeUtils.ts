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
  let biWeekMins = 0;
  let dailyDutyMins = 0;
  let extDrivingCount = 0;

  shifts.forEach(s => {
    const shiftTimestamp = new Date(s.date).getTime();
    const driveMins = s.driveHours * 60 + s.driveMinutes;

    if (shiftTimestamp >= currentWeekStart) {
      weekMins += driveMins;
      // Правило ЕС 561/2006: не более 2 раз по 10 часов в неделю
      if (driveMins > 9 * 60) extDrivingCount++;
    }
    
    if (shiftTimestamp >= prevWeekStart) {
      biWeekMins += driveMins;
    }

    if (shiftTimestamp >= todayStart) {
      dailyDutyMins += calculateShiftDurationMins(s);
    }
  });

  return { weekMins, biWeekMins, dailyDutyMins, extDrivingCount };
};
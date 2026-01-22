
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

export const calculateShiftDurationMins = (shift: Shift): number => {
  const start = new Date(`${shift.date}T${shift.startTime}`).getTime();
  const end = new Date(`${shift.date}T${shift.endTime}`).getTime();
  let diff = end - start;
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return diff / (1000 * 60);
};

export const calculateLogSummary = (shifts: Shift[]) => {
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  const enriched: ShiftWithRest[] = [];
  let totalDebt = 0;

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
        let type: 'regular' | 'reduced' | 'weekly_reduced' | 'long_pause' = 'regular';
        let debt = 0;

        if (diffHours >= 45) type = 'regular';
        else if (diffHours >= 24) { type = 'weekly_reduced'; debt = 45 - diffHours; }
        else if (diffHours >= 11) type = 'regular';
        else { type = 'reduced'; debt = 11 - diffHours; }

        if (!curr.isCompensated) totalDebt += debt;
        restEvent = { type, durationHours: h, durationMinutes: m, debtHours: debt, isCompensated: curr.isCompensated || false };
      }
    }
    enriched.push({ ...curr, restBefore: restEvent });
  }
  return { shifts: enriched.reverse(), totalDebt };
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

  shifts.forEach(s => {
    const shiftTimestamp = new Date(s.date + 'T00:00:00').getTime();
    const driveMins = (Number(s.driveHours) || 0) * 60 + (Number(s.driveMinutes) || 0);
    const workMins = (Number(s.workHours) || 0) * 60 + (Number(s.workMinutes) || 0);

    if (shiftTimestamp >= currentWeekStart) {
      weekMins += driveMins;
      workWeekMins += workMins;
      if (driveMins > 9 * 60) extDrivingCount++;
    }
    if (shiftTimestamp >= prevWeekStart) biWeekMins += driveMins;
    if (shiftTimestamp >= todayStart) dailyDutyMins += calculateShiftDurationMins(s);
  });

  return { weekMins, workWeekMins, biWeekMins, dailyDutyMins, extDrivingCount };
};

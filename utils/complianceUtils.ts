
import { Shift } from '../types';

export const validateDrivingCycle = (shifts: Shift[]): Record<string, string> => {
  const violations: Record<string, string> = {};
  const sorted = [...shifts].sort((a, b) => a.timestamp - b.timestamp);

  let cycleStartTime: number | null = null;

  sorted.forEach((shift, index) => {
    const shiftStartTs = new Date(`${shift.date}T${shift.startTime}`).getTime();
    const shiftEndTs = new Date(`${shift.date}T${shift.endTime}`).getTime();
    
    // 1. Правило 4.5 часов вождения
    const driveMins = (shift.driveHours * 60) + shift.driveMinutes;
    if (driveMins > 270) {
      const breaks = shift.breaks || [];
      const hasFullBreak = breaks.some(b => b.durationMinutes >= 45);
      const has15 = breaks.some(b => b.durationMinutes >= 15);
      const has30 = breaks.some(b => b.durationMinutes >= 30);
      
      if (!hasFullBreak && !(has15 && has30)) {
        violations[shift.id] = "Нарушение: Превышено 4.5ч вождения без паузы 45 мин (или 15+30)";
      }
    }

    // 2. Правило 6-дневного цикла
    if (index > 0) {
      const prev = sorted[index - 1];
      const prevEndTs = new Date(`${prev.date}T${prev.endTime}`).getTime();
      const restHours = (shiftStartTs - (prevEndTs > shiftStartTs ? prevEndTs - 86400000 : prevEndTs)) / 3600000;
      
      if (restHours >= 24) {
        cycleStartTime = shiftStartTs;
      }
    } else {
      cycleStartTime = shiftStartTs;
    }

    if (cycleStartTime) {
      const hoursInCycle = (shiftEndTs - cycleStartTime) / 3600000;
      if (hoursInCycle > 144) {
        const existing = violations[shift.id] ? violations[shift.id] + ". " : "";
        violations[shift.id] = existing + "Нарушение: Еженедельный отдых не взят до конца 6-го дня";
      }
    }
  });

  return violations;
};

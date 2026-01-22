
import { Shift } from '../types';

export interface ViolationMap {
  [shiftId: string]: string;
}

export const validateDrivingCycle = (shifts: Shift[]): ViolationMap => {
  const violations: ViolationMap = {};
  const sortedShifts = [...shifts].sort((a, b) => a.timestamp - b.timestamp);

  // Переменные для отслеживания 6-дневного цикла
  let cycleStartTime: number | null = null;
  
  // Переменные для отслеживания предыдущего отдыха
  let lastRestEndTime = 0;

  sortedShifts.forEach((shift, index) => {
    const shiftStartTs = new Date(`${shift.date}T${shift.startTime}`).getTime();
    const shiftEndTs = new Date(`${shift.date}T${shift.endTime}`).getTime();
    
    // --- Правило 1: 4.5 часа непрерывного вождения ---
    const totalDriveMinutes = (shift.driveHours * 60) + shift.driveMinutes;
    
    if (totalDriveMinutes > 270) { // > 4.5 часа
      const breaks = shift.breaks || [];
      
      // Ищем валидный перерыв: либо один >= 45, либо сплит 15+30
      let hasFullBreak = breaks.some(b => b.durationMinutes >= 45);
      
      if (!hasFullBreak) {
        // Проверяем сплит 15+30
        const has15 = breaks.some(b => b.durationMinutes >= 15);
        const has30 = breaks.some(b => b.durationMinutes >= 30);
        
        // В реальном тахографе важен порядок, здесь упрощаем до наличия обоих, 
        // так как UI позволяет вводить их в любом порядке, но логически они должны быть
        if (!(has15 && has30)) {
           violations[shift.id] = "Нарушение: Превышено 4.5ч вождения без паузы 45 мин (или 15+30)";
        }
      }
    }

    // --- Правило 2: 6-дневный рабочий цикл ---
    
    // Определяем отдых перед этой сменой
    if (index > 0) {
        const prevShift = sortedShifts[index - 1];
        const prevEnd = new Date(`${prevShift.date}T${prevShift.endTime}`).getTime();
        let diffHours = (shiftStartTs - (prevEnd > shiftStartTs ? prevEnd - 86400000 : prevEnd)) / 3600000;
        
        // Если был еженедельный отдых (>24ч), сбрасываем цикл
        if (diffHours >= 24) {
            cycleStartTime = shiftStartTs;
        }
    } else {
        cycleStartTime = shiftStartTs;
    }

    if (cycleStartTime) {
        // Время от начала цикла до конца текущей смены
        const cycleDurationMs = shiftEndTs - cycleStartTime;
        const cycleDurationHours = cycleDurationMs / 3600000;
        
        // 6 дней = 144 часа
        if (cycleDurationHours > 144) {
             // Если уже есть нарушение по вождению, добавляем это
             const existing = violations[shift.id] ? violations[shift.id] + ". " : "";
             violations[shift.id] = existing + "Нарушение: Не сделан еженедельный отдых после 6 рабочих дней";
        }
    }
  });

  return violations;
};

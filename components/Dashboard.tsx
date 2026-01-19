import React, { useMemo } from 'react';
import { ShiftWithRest } from '../types';
import WeeklyActivityChart from './WeeklyActivityChart';
import RestDebtChart from './RestDebtChart';
import { getMonday } from '../utils/timeUtils';

interface DashboardProps {
  shifts: ShiftWithRest[];
}

const Dashboard: React.FC<DashboardProps> = ({ shifts }) => {
  const weeklyData = useMemo(() => {
    const monday = getMonday(new Date());
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const result = days.map(day => ({ day, hours: 0 }));

    shifts.forEach(s => {
      const shiftDate = new Date(s.date);
      if (shiftDate >= monday) {
        // JS getDay(): 0 (Вс) to 6 (Сб) -> преобразуем в Пн-Вс
        let dayIdx = shiftDate.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        
        result[dayIdx].hours += s.driveHours + (s.driveMinutes / 60);
      }
    });

    return result.map(d => ({ ...d, hours: Math.round(d.hours * 10) / 10 }));
  }, [shifts]);

  const debtTrendData = useMemo(() => {
    // Берем последние 10 смен (в обратном порядке для графика времени)
    const recentShifts = [...shifts].reverse().slice(-10);
    let cumulativeDebt = 0;
    
    return recentShifts.map((s, idx) => {
      if (s.restBefore?.type === 'reduced') {
        cumulativeDebt += s.restBefore.debtHours;
      }
      return {
        name: `Смена ${idx + 1}`,
        debt: Math.max(0, Math.round(cumulativeDebt * 10) / 10)
      };
    });
  }, [shifts]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="liquid-glass rounded-[3rem] p-8 border-emerald-200/50">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
          Нагрузка за неделю (Часы)
        </h3>
        <WeeklyActivityChart data={weeklyData} />
      </div>

      <div className="liquid-glass rounded-[3rem] p-8 border-rose-200/50">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
          Тренд долга по отдыху
        </h3>
        <RestDebtChart data={debtTrendData} />
        <p className="mt-4 text-[11px] font-bold text-slate-400 text-center uppercase tracking-widest opacity-60">
          Данные за последние 10 рабочих циклов
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
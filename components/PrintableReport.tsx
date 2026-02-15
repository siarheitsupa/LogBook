
import React from 'react';
import { Shift, ShiftWithRest } from '../types';
import { calculateShiftDurationMins, formatMinsToHHMM } from '../utils/timeUtils';

interface PrintableReportProps {
  shifts: ShiftWithRest[];
  stats: {
    weekMins: number;
    totalDebt: number;
  };
  userEmail: string;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ shifts, stats, userEmail }) => {
  const sortedShifts = [...shifts].sort((a, b) => a.timestamp - b.timestamp);
  
  const periodStart = sortedShifts.length > 0 ? sortedShifts[0].startDate : '-';
  const periodEnd = sortedShifts.length > 0 ? sortedShifts[sortedShifts.length - 1].endDate : '-';

  return (
    <div id="pdf-report" className="p-10 bg-white text-black font-serif" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">DriverLog Pro</h1>
          <p className="text-sm font-bold mt-1">Отчет по регламенту ЕС 561/2006</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase font-bold text-gray-500">Водитель</p>
          <p className="text-lg font-bold">{userEmail}</p>
          <p className="text-xs uppercase font-bold text-gray-500 mt-2">Период</p>
          <p className="text-sm font-bold">{periodStart} — {periodEnd}</p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold uppercase mb-4 border-l-8 border-black pl-4">Итоговые показатели за неделю</h2>
        <table className="w-full border-collapse border-2 border-black">
          <tbody>
            <tr className="bg-gray-100">
              <td className="border border-black p-3 font-bold w-1/2">Общее время вождения</td>
              <td className="border border-black p-3 text-xl font-bold">{formatMinsToHHMM(stats.weekMins)}</td>
            </tr>
            <tr>
              <td className="border border-black p-3 font-bold">Долг по компенсации отдыха</td>
              <td className="border border-black p-3 text-xl font-bold text-red-600">{Math.ceil(stats.totalDebt)} ч</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Shifts Detail Section */}
      <div>
        <h2 className="text-xl font-bold uppercase mb-4 border-l-8 border-black pl-4">Подробный лог смен</h2>
        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead className="bg-black text-white">
            <tr>
              <th className="border border-black p-1 text-left">Дата</th>
              <th className="border border-black p-1 text-center">Время (S-E)</th>
              <th className="border border-black p-1 text-right">Работа</th>
              <th className="border border-black p-1 text-right">Вождение</th>
              <th className="border border-black p-1 text-right">Одо старт</th>
              <th className="border border-black p-1 text-right">Одо финиш</th>
              <th className="border border-black p-1 text-right">Пройдено</th>
            </tr>
          </thead>
          <tbody>
            {sortedShifts.map((s, idx) => {
              const driveTotalMins = (s.driveHours * 60) + s.driveMinutes;
              const isMulti = s.startDate !== s.endDate;
              const dist = (s.endMileage && s.startMileage) ? (s.endMileage - s.startMileage) : 0;

              return (
                <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1 font-bold">{s.startDate}{isMulti ? ` / ${s.endDate}` : ''}</td>
                  <td className="border border-black p-1 text-center">{s.startTime} - {s.endTime}</td>
                  <td className="border border-black p-1 text-right">{s.workHours || 0}ч {s.workMinutes || 0}м</td>
                  <td className="border border-black p-1 text-right font-bold">{formatMinsToHHMM(driveTotalMins)}</td>
                  <td className="border border-black p-1 text-right">{s.startMileage || 0}</td>
                  <td className="border border-black p-1 text-right">{s.endMileage || 0}</td>
                  <td className="border border-black p-1 text-right font-bold text-blue-800">{dist} км</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Signature */}
      <div className="mt-20 flex justify-between items-end">
        <div className="w-1/2 border-t border-black pt-4">
          <p className="text-xs uppercase font-bold text-gray-500 mb-8">Подпись водителя</p>
          <div className="h-10"></div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 italic">Сформировано автоматически в DriverLog Pro</p>
          <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-1">Дата выгрузки: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;

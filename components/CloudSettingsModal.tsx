
import React, { useState, useEffect } from 'react';
import { CloudConfig } from '../types';
import { storage } from '../services/storageService';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CloudConfig) => void;
  onReset: () => void;
}

const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({ isOpen, onClose, onSave, onReset }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    setUrl(localStorage.getItem('driverlog_cloud_config_v1_url') || '');
    setKey(localStorage.getItem('driverlog_cloud_config_v1_key') || '');
  }, [isOpen]);

  if (!isOpen) return null;

  const fullSql = `-- КОПИРУЙТЕ ЭТОТ СКРИПТ В SQL EDITOR В SUPABASE

-- 1. Таблица смен (Создание со всеми полями)
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  date TEXT,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  drive_hours INT,
  drive_minutes INT,
  drive_hours_day2 INT DEFAULT 0,
  drive_minutes_day2 INT DEFAULT 0,
  work_hours INT,
  work_minutes INT,
  timestamp BIGINT,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  start_lat FLOAT8, 
  start_lng FLOAT8,
  end_lat FLOAT8, 
  end_lng FLOAT8,
  is_compensated BOOLEAN DEFAULT FALSE,
  start_mileage INT DEFAULT 0,
  end_mileage INT DEFAULT 0,
  truck_id TEXT,
  notes TEXT
);

-- 2. Миграция (Если таблица уже есть, добавим недостающие поля)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS drive_hours_day2 INT DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS drive_minutes_day2 INT DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_mileage INT DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_mileage INT DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS truck_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_lat FLOAT8;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_lng FLOAT8;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_lat FLOAT8;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_lng FLOAT8;

-- 3. Таблица расходов
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  shift_id TEXT REFERENCES shifts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount FLOAT8 NOT NULL,
  currency TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 4. Включение защиты (RLS)
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. Политики доступа
DROP POLICY IF EXISTS "Users can manage their own shifts" ON shifts;
CREATE POLICY "Users can manage their own shifts" ON shifts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own expenses" ON expenses;
CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Облако Supabase</h3>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
             <p className="text-[10px] text-blue-600 font-bold uppercase leading-tight">
               Важно: После обновления приложения обязательно выполните SQL скрипт в панели Supabase, чтобы добавить новые колонки для пробега и номера машины.
             </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Project URL</label>
              <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Anon Key</label>
              <input type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none" value={key} onChange={e => setKey(e.target.value)} />
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <button onClick={() => setShowSql(!showSql)} className="text-[10px] font-bold text-amber-700 uppercase flex items-center justify-between w-full">SQL для базы {showSql ? '↑' : '↓'}</button>
            {showSql && (
              <div className="mt-3">
                <pre className="p-3 bg-white rounded-lg text-[8px] overflow-x-auto font-mono text-slate-700 border border-amber-200">{fullSql}</pre>
                <button 
                  onClick={() => { navigator.clipboard.writeText(fullSql); alert('Скопировано!'); }}
                  className="mt-2 w-full py-2 bg-amber-600 text-white text-[10px] font-bold rounded-lg uppercase"
                >
                  Копировать код
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-8">
          <button onClick={() => onSave({ url: url.trim(), key: key.trim() })} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">Сохранить</button>
          <button onClick={() => { onReset(); onClose(); }} className="w-full py-3 text-rose-500 font-bold text-sm">Сбросить настройки</button>
        </div>
      </div>
    </div>
  );
};

export default CloudSettingsModal;

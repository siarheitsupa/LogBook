
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

  const fullSql = `-- 1. Таблица смен (ОБНОВЛЕНА: добавлено поле breaks)
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  drive_hours INT,
  drive_minutes INT,
  work_hours INT,
  work_minutes INT,
  breaks JSONB DEFAULT '[]'::jsonb, -- Хранение перерывов
  timestamp BIGINT,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  start_lat FLOAT8, start_lng FLOAT8,
  end_lat FLOAT8, end_lng FLOAT8,
  is_compensated BOOLEAN DEFAULT FALSE
);

-- Если таблица уже существует, добавьте колонку:
-- ALTER TABLE shifts ADD COLUMN IF NOT EXISTS breaks JSONB DEFAULT '[]'::jsonb;

-- 2. Таблица расходов
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

-- 3. Защита данных (RLS)
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Политики доступа
DROP POLICY IF EXISTS "Users can manage their own shifts" ON shifts;
CREATE POLICY "Users can manage their own shifts" ON shifts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own expenses" ON expenses;
CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Облако и Данные</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Project URL</label>
              <input 
                type="text" 
                placeholder="https://xyz.supabase.co"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-blue-500"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Anon Key</label>
              <input 
                type="password" 
                placeholder="eyJhbG..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-blue-500"
                value={key}
                onChange={e => setKey(e.target.value)}
              />
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <button 
              onClick={() => setShowSql(!showSql)} 
              className="text-[10px] font-black text-amber-700 uppercase flex items-center justify-between w-full"
            >
              Инструкция SQL (Настройка базы) {showSql ? '↑' : '↓'}
            </button>
            {showSql && (
              <div className="mt-3">
                <p className="text-[9px] text-amber-800 font-bold mb-2">Выполните это в Supabase SQL Editor:</p>
                <pre className="p-3 bg-white rounded-lg text-[8px] overflow-x-auto font-mono text-slate-700 border border-amber-200 leading-relaxed shadow-inner">
                  {fullSql}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-8">
          <button 
            onClick={() => onSave({ url, key })}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Сохранить настройки
          </button>
          <button 
            onClick={() => { onReset(); setUrl(''); setKey(''); onClose(); }}
            className="w-full py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
          >
            Сбросить настройки
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSettingsModal;

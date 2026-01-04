import React, { useState } from 'react';
import { CloudConfig } from '../types';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CloudConfig) => void;
  onReset: () => void;
}

const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({ isOpen, onClose, onSave, onReset }) => {
  const [url, setUrl] = useState(localStorage.getItem('driverlog_cloud_config_v1_url') || '');
  const [key, setKey] = useState(localStorage.getItem('driverlog_cloud_config_v1_key') || '');
  const [showSql, setShowSql] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Настройка Облака</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Project URL</label>
            <input 
              type="text" 
              placeholder="https://xyz.supabase.co"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 ring-blue-500 outline-none"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Anon Key</label>
            <input 
              type="password" 
              placeholder="eyJhbG..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 ring-blue-500 outline-none"
              value={key}
              onChange={e => setKey(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <button 
            onClick={() => setShowSql(!showSql)}
            className="text-[10px] font-bold text-amber-700 uppercase flex items-center justify-between w-full"
          >
            Инструкция SQL (Нажми) {showSql ? '↑' : '↓'}
          </button>
          {showSql && (
            <div className="mt-2 space-y-2">
              <p className="text-[10px] text-amber-800 font-medium">Запустите в SQL Editor для исправления:</p>
              <pre className="p-2 bg-white rounded-lg text-[9px] overflow-x-auto text-slate-600 font-mono leading-tight border border-amber-200">
                {`DROP TABLE IF EXISTS shifts;
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  date DATE,
  start_time TEXT,
  end_time TEXT,
  drive_hours INT,
  drive_minutes INT,
  timestamp BIGINT
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p" ON shifts FOR ALL USING (true) WITH CHECK (true);`}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-8">
          <button 
            onClick={() => onSave({ url, key })}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            Сохранить и подключить
          </button>
          <button 
            onClick={() => { onReset(); setUrl(''); setKey(''); onClose(); }}
            className="w-full py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
          >
            Сбросить всё
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudSettingsModal;
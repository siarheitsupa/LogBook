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
  const [envStatus, setEnvStatus] = useState({ url: false, key: false });

  useEffect(() => {
    setUrl(localStorage.getItem('driverlog_cloud_config_v1_url') || '');
    setKey(localStorage.getItem('driverlog_cloud_config_v1_key') || '');
    setEnvStatus(storage.getEnvStatus());
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Облако и Данные</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Supabase (База данных)</h4>
              {envStatus.url && envStatus.key && (
                <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">AUTO</span>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                  <span>Project URL</span>
                  {envStatus.url && <span className="text-emerald-500 lowercase">из системы</span>}
                </label>
                <input 
                  type="text" 
                  placeholder={envStatus.url ? "Определено автоматически" : "https://xyz.supabase.co"}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 ring-blue-500 outline-none disabled:opacity-60"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  disabled={envStatus.url}
                />
              </div>
              <div>
                <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                  <span>Anon Key</span>
                  {envStatus.key && <span className="text-emerald-500 lowercase">из системы</span>}
                </label>
                <input 
                  type="password" 
                  placeholder={envStatus.key ? "••••••••••••••••" : "eyJhbG..."}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 ring-blue-500 outline-none disabled:opacity-60"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  disabled={envStatus.key}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <button 
            onClick={() => setShowSql(!showSql)}
            className="text-[10px] font-bold text-amber-700 uppercase flex items-center justify-between w-full"
          >
            Инструкция SQL (ВАЖНО!) {showSql ? '↑' : '↓'}
          </button>
          {showSql && (
            <div className="mt-2 space-y-2">
              <p className="text-[9px] text-amber-800 font-bold mb-2">Чтобы "молотки" и координаты сохранялись, выполните это в SQL Editor:</p>
              <pre className="p-3 bg-white rounded-lg text-[8px] overflow-x-auto text-slate-800 font-mono leading-relaxed border border-amber-300 shadow-inner">
                {`ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS start_lat FLOAT8,
ADD COLUMN IF NOT EXISTS start_lng FLOAT8,
ADD COLUMN IF NOT EXISTS end_lat FLOAT8,
ADD COLUMN IF NOT EXISTS end_lng FLOAT8,
ADD COLUMN IF NOT EXISTS work_hours INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_minutes INT4 DEFAULT 0;`}
              </pre>
            </div>
          )}
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
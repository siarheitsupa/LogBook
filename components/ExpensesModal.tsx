
import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Currency } from '../types';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  shiftId: string;
  initialData?: Expense | null;
}

const CATEGORIES: { id: ExpenseCategory; icon: React.ReactNode; label: string }[] = [
  { id: 'Parking', label: 'Паркинг', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 17V7h4a3 3 0 1 1 0 6H9" /></svg>
  )},
  { id: 'Customs', label: 'Таможня', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  )},
  { id: 'Fuel', label: 'Топливо', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 13V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16H3a2 2 0 0 1-2-2v-4" /><path d="M15 13h6" /><path d="M18 10V5" /></svg>
  )},
  { id: 'Wash', label: 'Мойка', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 16.3c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4z" /><path d="M14 12l2-2" /><path d="M17 15l3-3" /></svg>
  )},
  { id: 'Toll', label: 'Дороги', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 22h18" /><path d="M6 18v-4" /><path d="M18 18v-4" /><path d="M12 18v-8" /><path d="M3 10h18" /></svg>
  )},
  { id: 'Food', label: 'Еда', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8V4" /><path d="M18 12v8" /><path d="M12 10V4" /><path d="M12 14v6" /><path d="M6 12V4" /><path d="M6 16v4" /></svg>
  )},
  { id: 'Other', label: 'Другое', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
  )},
];

const CURRENCIES: Currency[] = ['EUR', 'PLN', 'BYN', 'HUF', 'USD'];

const ExpensesModal: React.FC<ExpensesModalProps> = ({ isOpen, onClose, onSave, shiftId, initialData }) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [category, setCategory] = useState<ExpenseCategory>('Parking');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setCurrency(initialData.currency);
        setCategory(initialData.category);
        setDescription(initialData.description || '');
      } else {
        setAmount('');
        setCurrency('EUR');
        setCategory('Parking');
        setDescription('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md safe-p-bottom">
      <div className="bg-white w-full max-w-md rounded-[2.8rem] shadow-2xl animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
        <div className="p-7">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">Добавить расход</h3>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400">✕</button>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold transition-all ${currency === c ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="relative mb-8">
            <input 
              type="number" 
              placeholder="0.00" 
              className="w-full text-5xl font-bold text-center py-8 bg-slate-50 rounded-[2rem] outline-none focus:bg-white focus:ring-4 ring-slate-50 transition-all tabular-nums" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              inputMode="decimal"
            />
            <span className="absolute bottom-4 right-8 text-[10px] font-bold text-slate-300 uppercase">{currency}</span>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setCategory(cat.id)} 
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${category === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                <div className="mb-2">{cat.icon}</div>
                <span className="text-[8px] font-bold uppercase tracking-tighter text-center leading-none">{cat.label}</span>
              </button>
            ))}
          </div>

          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm mb-8 focus:bg-white outline-none resize-none h-20" 
            placeholder="Заметка (где, за что...)" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
          />

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 rounded-2xl">Отмена</button>
            <button 
              onClick={() => {
                const val = parseFloat(amount);
                if (val > 0) onSave({ id: Date.now().toString(), shiftId, category, amount: val, currency, timestamp: Date.now(), description });
              }} 
              className="flex-2 py-4 px-10 text-[10px] font-bold uppercase text-white bg-slate-900 rounded-2xl shadow-xl shadow-slate-200"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesModal;

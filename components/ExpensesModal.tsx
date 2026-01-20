import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Currency } from '../types';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  shiftId: string;
  initialData?: Expense | null;
}

const CATEGORIES: { id: ExpenseCategory; icon: string; label: string }[] = [
  { id: 'Parking', icon: '🅿️', label: 'Паркинг' },
  { id: 'Customs', icon: '🛂', label: 'Таможня' },
  { id: 'Fuel', icon: '⛽', label: 'Топливо' },
  { id: 'Wash', icon: '🧽', label: 'Мойка' },
  { id: 'Toll', icon: '🛣️', label: 'Дороги' },
  { id: 'Food', icon: '🍽️', label: 'Еда' },
  { id: 'Other', icon: '📦', label: 'Другое' },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('Введите корректную сумму');

    const expense: Expense = {
      id: initialData?.id || Date.now().toString(),
      shiftId,
      category,
      amount: val,
      currency,
      timestamp: Date.now(),
      description
    };
    onSave(expense);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md safe-p-bottom">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90dvh] overflow-hidden">
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Добавить расход</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${currency === c ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full text-5xl font-black text-center p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all tabular-nums"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                inputMode="decimal"
              />
              <span className="absolute bottom-4 right-6 text-slate-300 font-black uppercase text-[10px] tracking-widest">{currency}</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${category === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                  <span className="text-2xl mb-1">{cat.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-none">{cat.label}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Заметка (опционально)</label>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white outline-none resize-none"
                rows={2}
                placeholder="Где, за что..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-black text-slate-400 bg-slate-50 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 py-4 font-black text-white bg-slate-900 rounded-2xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpensesModal;

import React, { useState } from 'react';
import { storage } from '../services/storageService';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = isLogin 
        ? await storage.signIn(email, password)
        : await storage.signUp(email, password);

      if (authError) {
        // Fix: handle both string and AuthError types for authError as storage methods return a mix of both
        const errorMessage = typeof authError === 'string' ? authError : authError.message;
        setError(errorMessage || 'Произошла ошибка при аутентификации');
      }
    } catch (e) {
      setError('Критическая ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-slate-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">DriverLog Pro</h2>
          <p className="text-slate-500 mt-2 font-medium">Для работы необходимо войти в аккаунт</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Вход
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 ring-slate-900 outline-none transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Пароль</label>
              <input 
                type="password" 
                required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 ring-slate-900 outline-none transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[11px] font-bold leading-tight">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
        
        {!isLogin && (
          <p className="text-center text-[10px] text-slate-400 px-4 leading-relaxed font-medium">
            Регистрируясь, вы соглашаетесь с тем, что ваши логи будут храниться в зашифрованном виде в облаке.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;

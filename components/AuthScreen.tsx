
import React, { useState } from 'react';
import { storage } from '../services/storageService';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error: authError } = await storage.signIn(email, password);
        if (authError) {
          const errorMessage = typeof authError === 'string' ? authError : authError.message;
          setError(errorMessage || 'Неверный логин или пароль');
        }
      } else {
        const { data, error: authError } = await storage.signUp(email, password);
        if (authError) {
          const errorMessage = typeof authError === 'string' ? authError : authError.message;
          setError(errorMessage || 'Ошибка при регистрации');
        } else if (data?.user && data?.session === null) {
          // Если сессия null, значит включено подтверждение по почте
          setIsVerificationSent(true);
        }
      }
    } catch (e) {
      setError('Критическая ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  if (isVerificationSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-slate-50">
        <div className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100">
          <div className="mx-auto h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Подтвердите Email</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Мы отправили ссылку для подтверждения на <span className="font-bold text-slate-800">{email}</span>. 
            Пожалуйста, перейдите по ней, чтобы активировать аккаунт.
          </p>
          <button 
            onClick={() => setIsVerificationSent(false)}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Вернуться ко входу
          </button>
        </div>
      </div>
    );
  }

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

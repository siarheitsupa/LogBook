import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Регистрация Service Worker для PWA режима (Android/iOS)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('DriverLog: ServiceWorker зарегистрирован успешно:', registration.scope);
        
        // Проверка на наличие обновлений
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('DriverLog: Доступно новое обновление, пожалуйста, перезапустите приложение.');
                }
              }
            };
          }
        };
      })
      .catch(error => {
        console.error('DriverLog: Ошибка регистрации ServiceWorker:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
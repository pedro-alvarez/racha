import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// service worker: só para as notificações no celular (não guarda o app em cache)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

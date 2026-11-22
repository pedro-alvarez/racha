import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// iPhone/iPad: impede o zoom automático ao tocar num campo. No iOS isso não
// bloqueia o zoom com dois dedos (o Safari ignora o limite para o gesto),
// por isso vale só lá; no Android o limite travaria o zoom e fica de fora.
const ehIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const viewport = document.querySelector('meta[name="viewport"]');
if (ehIOS && viewport && !/maximum-scale/.test(viewport.content)) {
  viewport.content += ', maximum-scale=1';
}

// service worker: só para as notificações no celular (não guarda o app em cache)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

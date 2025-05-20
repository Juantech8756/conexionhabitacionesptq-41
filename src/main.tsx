import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/responsive-fixes.css';
import './styles/mobile-fixes.css';
import './styles/chat-fixes.css';
import './styles/select-fixes.css';
import './styles/tabs-override.css';
import './styles/header-fix.css';
import './styles/menu-center.css';
import './styles/bottom-tabs-fix.css';
import './styles/input-panel-fix.css';
import './styles/guest-chat-fix.css';
import './styles/chat-color-fix.css';
import './styles/back-button-fix.css';
import './styles/client-info-header-fix.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar el service worker para PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Hay una nueva versión disponible. ¿Desea actualizar?')) {
      updateSW();
    }
  },
  onOfflineReady() {
    console.log('La aplicación está lista para trabajar sin conexión');
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

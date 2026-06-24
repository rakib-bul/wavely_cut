import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign container dev-environment WebSocket connection failure rejections from causing annoying overlays.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const msg = typeof reason === 'string' ? reason : (reason.message || '');
      if (
        msg.includes('WebSocket') || 
        msg.includes('websocket') || 
        msg.includes('vite') || 
        msg.includes('Connection failed')
      ) {
        event.preventDefault();
        console.debug('Ignored benign development environment WebSocket rejection:', msg);
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('failed to connect')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


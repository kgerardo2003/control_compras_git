import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevenir que errores no capturados de red, extensiones o promesas canceladas interrumpan la app
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.warn('Advertencia: Promesa no capturada prevenida:', event.reason);
});

// Manejo de advertencias benignas de renderizado o scripts
window.addEventListener('error', (event) => {
  event.preventDefault();
  console.warn('Aviso: Error interceptado a nivel de ventana:', event.message || event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log('App initializing...');

const updateSW = registerSW({
  onNeedRefresh() {
    // Show an update toast if you want, or auto update
  },
  onOfflineReady() {
    console.log('PWA is ready to work offline');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find root element');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

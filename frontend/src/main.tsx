import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function renderApp(): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Root element #root not found');
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

try {
  renderApp();
} catch (err) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="min-height:100vh;background:#0F172A;color:#F8FAFC;padding:2rem;font-family:system-ui,sans-serif">
        <h1 style="color:#F87171;margin-bottom:1rem">Failed to load app</h1>
        <p style="color:#94A3B8;margin-bottom:1rem">Open the browser console (F12 → Console) for details.</p>
        <pre style="background:#1E293B;border:1px solid rgba(248,113,113,0.5);border-radius:0.5rem;padding:1rem;overflow:auto;color:#FCA5A5;font-size:0.875rem">${String(err instanceof Error ? err.message : err)}</pre>
      </div>
    `;
  }
  console.error('App failed to load:', err);
}

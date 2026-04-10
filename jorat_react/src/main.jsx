import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// ✅ AVANT le render — intercepte tous les fetch
const originalFetch = window.fetch;
window.fetch = (url, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const csrfToken = isMutation
    ? document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1]
    : undefined;
  return originalFetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });
};

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
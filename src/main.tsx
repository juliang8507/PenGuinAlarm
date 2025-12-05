import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { StatisticsProvider } from './contexts/StatisticsContext'
import ErrorBoundary from './components/ErrorBoundary'
import { registerSW } from 'virtual:pwa-register'
import {
  pwaManager,
  audioAutoplayManager,
  wakeLockManager,
} from './utils/notifications'

// Register service worker via VitePWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event that UpdateBanner can listen to
    window.dispatchEvent(new CustomEvent('sw-update-available'))
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

// Make updateSW available globally for UpdateBanner
window.__updateSW = updateSW

// Initialize PWA and notification managers
pwaManager.init()
audioAutoplayManager.init()
wakeLockManager.setupVisibilityHandler()

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser handling (which might show an error in console)
  event.preventDefault();
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <StatisticsProvider>
          <App />
        </StatisticsProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)

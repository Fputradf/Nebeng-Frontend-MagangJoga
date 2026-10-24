import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TicketsProvider } from './context/TicketsContext.jsx'
import { GPSProvider } from './context/GPSContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { NotificationAuthHandler } from './components/NotificationAuthHandler'
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <NotificationAuthHandler />
          <GPSProvider>
            <ToastProvider>
              <TicketsProvider>
                <App />
              </TicketsProvider>
            </ToastProvider>
          </GPSProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  </StrictMode>,
)

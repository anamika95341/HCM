import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import './styles/globals.css'
import './shared/i18n/i18n.js'
import App from './app/App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { PortalThemeProvider } from './shared/theme/portalTheme.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import { NotificationProvider } from './shared/notifications/NotificationContext.jsx'
import AppErrorBoundary from './shared/errors/AppErrorBoundary.jsx'
import { LanguageProvider } from './shared/i18n/LanguageContext.jsx'
createRoot(document.getElementById('root')).render(
  <PortalThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  </PortalThemeProvider>,
)

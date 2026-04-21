import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import './styles/globals.css'
import App from './app/App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { PortalThemeProvider } from './shared/theme/portalTheme.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import { NotificationProvider } from './shared/notifications/NotificationContext.jsx'
import AppErrorBoundary from './shared/errors/AppErrorBoundary.jsx'
createRoot(document.getElementById('root')).render(
  <PortalThemeProvider>
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  </PortalThemeProvider>,
)

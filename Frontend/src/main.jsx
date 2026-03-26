import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { PortalGlobalStyles, PortalThemeProvider } from './shared/theme/portalTheme.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import AppErrorBoundary from './shared/errors/AppErrorBoundary.jsx'
createRoot(document.getElementById('root')).render(
  <PortalThemeProvider>
    <PortalGlobalStyles />
    <AuthProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  </PortalThemeProvider>,
)

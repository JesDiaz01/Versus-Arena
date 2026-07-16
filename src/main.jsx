import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from "@vercel/analytics/react";
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { AuthProvider } from './AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Analytics />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

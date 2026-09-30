import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './utils/initLeaflet';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Ensure any legacy dark mode class or stored preference is cleared
try {
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('urbanpulse_theme');
} catch {
  // Ignore in restricted environments
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);



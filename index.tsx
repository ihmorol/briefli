import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#4f46e5', // Matches primary-600
          colorBackground: '#0f172a', // Matches slate-900
          colorText: '#e2e8f0', // Matches slate-200
        }
      }}
    >
      <ToastProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ToastProvider>
    </ClerkProvider>
  </React.StrictMode>
);
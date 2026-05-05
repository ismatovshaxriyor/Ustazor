import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './styles.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY topilmadi. frontend/.env faylga Clerk kalitini qo`shing.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>,
);

import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppProvider>
          <RouterProvider router={router} />
          <Toaster
            position="bottom-right"
            closeButton
            richColors
            toastOptions={{
              duration: 5000,
              style: {
                background: 'white',
                border: '1px solid #bfc0c5',
                color: '#444',
                fontSize: '14px',
              },
            }}
          />
        </AppProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

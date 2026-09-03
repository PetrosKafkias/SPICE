import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'Municipality Staff' | 'Facilitator' | 'Citizen' | 'Admin';

interface AppContextType {
  accessibilityOpen: boolean;
  setAccessibilityOpen: (open: boolean) => void;
  fontSize: 'normal' | 'large' | 'x-large';
  setFontSize: (size: 'normal' | 'large' | 'x-large') => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  currentPilot: string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const currentPilot = 'Thessaloniki Pilot - Public Space Co-Creation';

  return (
    <AppContext.Provider
      value={{
        accessibilityOpen,
        setAccessibilityOpen,
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        reducedMotion,
        setReducedMotion,
        currentPilot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

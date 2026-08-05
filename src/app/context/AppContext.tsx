import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Mode } from '../data/tools';
import { useAuth } from './AuthContext';
import { apiRequest, jsonBody } from '../lib/api';

export type UserRole = 'Municipality Staff' | 'Facilitator' | 'Citizen' | 'Admin';

export interface ProcessSetupState {
  stage: string;
  objectives: string[];
  level: string;
  goal: string;
  groupSize: string;
  duration: string;
  facilitator: string;
  mode: Mode;
}

interface AppContextType {
  accessibilityOpen: boolean;
  setAccessibilityOpen: (open: boolean) => void;
  fontSize: 'normal' | 'large' | 'x-large';
  setFontSize: (size: 'normal' | 'large' | 'x-large') => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  myProcessTools: string[];
  addToolToProcess: (toolId: string) => void;
  removeToolFromProcess: (toolId: string) => void;
  currentPilot: string;
  processSetup: ProcessSetupState;
  updateProcessSetup: (patch: Partial<ProcessSetupState>) => void;
  saveProcessDraft: () => Promise<void>;
  draftSavedAt?: string;
}

const PROCESS_DRAFT_KEY = 'spice-process-setup-draft';
const PROCESS_TOOLS_KEY = 'spice-my-process-tools';

const DEFAULT_PROCESS_TOOLS: string[] = [];

const DEFAULT_PROCESS_SETUP: ProcessSetupState = {
  stage: '',
  objectives: [],
  level: '',
  goal: '',
  groupSize: '',
  duration: '',
  facilitator: '',
  mode: 'Hybrid',
};

const AppContext = createContext<AppContextType | null>(null);

function readStoredSetup(): ProcessSetupState {
  try {
    const stored = localStorage.getItem(PROCESS_DRAFT_KEY);
    if (!stored) return DEFAULT_PROCESS_SETUP;
    return { ...DEFAULT_PROCESS_SETUP, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PROCESS_SETUP;
  }
}

function readStoredTools(): string[] {
  try {
    const stored = localStorage.getItem(PROCESS_TOOLS_KEY);
    if (!stored) return DEFAULT_PROCESS_TOOLS;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_PROCESS_TOOLS;
  } catch {
    return DEFAULT_PROCESS_TOOLS;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [myProcessTools, setMyProcessTools] = useState<string[]>(readStoredTools);
  const [processSetup, setProcessSetup] = useState<ProcessSetupState>(readStoredSetup);
  const [draftSavedAt, setDraftSavedAt] = useState<string | undefined>();
  const [remoteDraftReady, setRemoteDraftReady] = useState(false);
  const currentPilot = 'Thessaloniki Pilot - Public Space Co-Creation';

  useEffect(() => {
    localStorage.setItem(PROCESS_TOOLS_KEY, JSON.stringify(myProcessTools));
  }, [myProcessTools]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!user) {
      setRemoteDraftReady(false);
      setMyProcessTools(DEFAULT_PROCESS_TOOLS);
      setProcessSetup(DEFAULT_PROCESS_SETUP);
      localStorage.removeItem(PROCESS_TOOLS_KEY);
      localStorage.removeItem(PROCESS_DRAFT_KEY);
      return;
    }

    let cancelled = false;
    setRemoteDraftReady(false);
    void apiRequest<{ setup: Partial<ProcessSetupState>; tools: string[]; updatedAt: string | null }>('/api/process-draft')
      .then(async (draft) => {
        if (cancelled) return;
        if (draft.updatedAt) {
          setProcessSetup({ ...DEFAULT_PROCESS_SETUP, ...draft.setup });
          setMyProcessTools(Array.isArray(draft.tools) ? draft.tools : []);
          setDraftSavedAt(draft.updatedAt);
        } else {
          const localSetup = readStoredSetup();
          const localTools = readStoredTools();
          setProcessSetup(localSetup);
          setMyProcessTools(localTools);
          if (Object.values(localSetup).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)) || localTools.length > 0) {
            const saved = await apiRequest<{ updatedAt: string }>('/api/process-draft', {
              method: 'PUT', body: jsonBody({ setup: localSetup, tools: localTools }),
            });
            if (!cancelled) setDraftSavedAt(saved.updatedAt);
          }
        }
        if (!cancelled) setRemoteDraftReady(true);
      })
      .catch(() => {
        if (!cancelled) setRemoteDraftReady(true);
      });

    return () => { cancelled = true; };
  }, [authStatus, user]);

  useEffect(() => {
    if (!user || !remoteDraftReady) return;
    const timer = window.setTimeout(() => {
      void apiRequest('/api/process-draft', {
        method: 'PUT', body: jsonBody({ setup: processSetup, tools: myProcessTools }),
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [myProcessTools, processSetup, remoteDraftReady, user]);

  const addToolToProcess = (toolId: string) => {
    setMyProcessTools((prev) => (prev.includes(toolId) ? prev : [...prev, toolId]));
  };

  const removeToolFromProcess = (toolId: string) => {
    setMyProcessTools((prev) => prev.filter((id) => id !== toolId));
  };

  const updateProcessSetup = (patch: Partial<ProcessSetupState>) => {
    setProcessSetup((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PROCESS_DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveProcessDraft = useCallback(async () => {
    localStorage.setItem(PROCESS_DRAFT_KEY, JSON.stringify(processSetup));
    localStorage.setItem(PROCESS_TOOLS_KEY, JSON.stringify(myProcessTools));
    const saved = await apiRequest<{ updatedAt: string }>('/api/process-draft', {
      method: 'PUT', body: jsonBody({ setup: processSetup, tools: myProcessTools }),
    });
    setDraftSavedAt(saved.updatedAt);
  }, [myProcessTools, processSetup]);

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
        myProcessTools,
        addToolToProcess,
        removeToolFromProcess,
        currentPilot,
        processSetup,
        updateProcessSetup,
        saveProcessDraft,
        draftSavedAt,
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

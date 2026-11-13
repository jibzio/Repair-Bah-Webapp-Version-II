import React, { createContext, useContext } from 'react';
import { AppAction, AppState, SnackbarMessage } from '../types/repairbah';

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  notify: (text: string, tone?: SnackbarMessage['tone']) => void;
  syncJobToSupabase: (patch: Record<string, unknown>) => Promise<void>;
}

export const AppCtx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

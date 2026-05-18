'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { User } from './api';
import { Locale, t as translate } from './i18n';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  toast: (message: string, type?: Toast['type']) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
}

export const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  toast: () => {},
  darkMode: true,
  setDarkMode: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  locale: 'vi',
  setLocale: () => {},
  t: (key) => translate(key, 'vi'),
});

export function useApp() {
  return useContext(AppContext);
}

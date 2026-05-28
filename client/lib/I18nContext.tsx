'use client';

import { createContext, useContext } from 'react';
import { Locale, t as translate } from './i18n';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'vi',
  setLocale: () => {},
  t: (key) => translate(key, 'vi'),
});

export function useI18n() {
  return useContext(I18nContext);
}

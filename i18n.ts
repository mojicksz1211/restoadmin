import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ko from './locales/ko.json';

export const defaultNS = 'common';
export const supportedLngs = ['en', 'ko'] as const;
export type SupportedLocale = (typeof supportedLngs)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { [defaultNS]: en.common },
      ko: { [defaultNS]: ko.common },
    },
    defaultNS,
    fallbackLng: 'en',
    supportedLngs: [...supportedLngs],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'restoadmin_lang',
    },
  });

export default i18n;

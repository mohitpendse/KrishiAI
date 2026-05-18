import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslations from '../locales/en.json'
import hiTranslations from '../locales/hi.json'
import taTranslations from '../locales/ta.json'
import teTranslations from '../locales/te.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      ta: { translation: taTranslations },
      te: { translation: teTranslations },
    },
    fallbackLng: 'en',
    lng: 'en',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

type Language = 'en' | 'hi' | 'ta' | 'te'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: ReactNode
}

const getSavedLanguage = (): Language => {
  const saved = localStorage.getItem('language') as Language | null
  if (saved && ['en', 'hi', 'ta', 'te'].includes(saved)) return saved
  return 'en'
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getSavedLanguage)

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem('language', newLanguage)
    i18n.changeLanguage(newLanguage)
  }

  const t = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      String(i18n.t(key, { ...options, lng: language })),
    [language]
  )

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/**
 * i18n Context Provider
 * Manages language state and provides translation functions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, defaultLanguage } from "@/i18n";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from localStorage or use default
    const savedLanguage = localStorage.getItem("app_language") as Language;
    return savedLanguage && (savedLanguage === "hindi" || savedLanguage === "english")
      ? savedLanguage
      : defaultLanguage;
  });

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Translation function - supports nested paths like "home.hero.title"
  const t = (path: string): string => {
    const keys = path.split(".");
    let value: any = translations[language];

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        // Fallback to default language if key not found
        value = translations[defaultLanguage];
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return path; // Return path if translation not found
          }
        }
        break;
      }
    }

    return typeof value === "string" ? value : path;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};


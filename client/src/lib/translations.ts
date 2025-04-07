import { useState, useEffect } from 'react';

type TranslationConfig = {
  [key: string]: {
    en: string;
    fr: string;
  };
};

// Translation dictionary
const translations: TranslationConfig = {
  "autoCheckoutNotice": {
    en: "For security purposes, all visitors will be automatically checked out at midnight. If you need to stay longer, please check in again the next day.",
    fr: "Pour des raisons de sécurité, tous les visiteurs seront automatiquement déconnectés à minuit. Si vous avez besoin de rester plus longtemps, veuillez vous enregistrer à nouveau le lendemain."
  }
};

export function useTranslation() {
  // Default to the browser language
  const [language, setLanguage] = useState<'en' | 'fr'>('en');

  useEffect(() => {
    // Check localStorage for language preference
    const storedLang = localStorage.getItem('isEnglish');
    if (storedLang !== null) {
      setLanguage(storedLang === 'true' ? 'en' : 'fr');
    }
  }, []);

  const t = (key: string, fallback?: string): string => {
    // If the key exists in our translations, return the appropriate language version
    if (translations[key]) {
      return translations[key][language];
    }
    
    // Return the fallback or the key itself if no fallback provided
    return fallback || key;
  };

  return { t, language };
}
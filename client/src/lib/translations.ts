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
  },
  "searchByNameOrBadge": {
    en: "Search by name or badge ID...",
    fr: "Rechercher par nom ou numéro de badge..."
  },
  "remove": {
    en: "Remove",
    fr: "Supprimer"
  },
  "success": {
    en: "Success",
    fr: "Succès"
  },
  "partnerAssigned": {
    en: "Partner assigned successfully",
    fr: "Partenaire assigné avec succès"
  },
  "currentPartner": {
    en: "Current partner",
    fr: "Partenaire actuel"
  },
  "partnerRemoved": {
    en: "Partner removed successfully",
    fr: "Partenaire supprimé avec succès"
  },
  "minutes": {
    en: "minutes",
    fr: "minutes"
  },
  "averageVisitDuration": {
    en: "Average Visit Duration",
    fr: "Durée moyenne de visite"
  },
  "totalRegisteredVisitors": {
    en: "Total Registered Visitors",
    fr: "Total des visiteurs enregistrés"
  },
  "resetAvgDuration": {
    en: "Reset Counter",
    fr: "Réinitialiser"
  },
  "resetAvgDurationTooltip": {
    en: "Reset the average visit duration counter",
    fr: "Réinitialiser le compteur de durée moyenne de visite"
  },
  "resetSuccess": {
    en: "Average visit duration reset successfully",
    fr: "Durée moyenne de visite réinitialisée avec succès"
  },
  "error": {
    en: "Error",
    fr: "Erreur"
  },
  "failedToResetDuration": {
    en: "Failed to reset average visit duration counter",
    fr: "Échec de la réinitialisation du compteur de durée moyenne de visite"
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
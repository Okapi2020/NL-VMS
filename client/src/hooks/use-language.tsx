import { 
  createContext, 
  useContext, 
  ReactNode, 
  useState, 
  useEffect 
} from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

type Language = 'en' | 'fr';

interface TranslationMap {
  [key: string]: {
    en: string;
    fr: string;
  };
}

// Common translations shared across all components
export const translations: TranslationMap = {
  // Navigation
  home: {
    en: 'Home',
    fr: 'Accueil'
  },
  dashboard: {
    en: 'Dashboard',
    fr: 'Tableau de bord'
  },
  settings: {
    en: 'Settings',
    fr: 'Paramètres'
  },
  visitors: {
    en: 'Visitors',
    fr: 'Visiteurs'
  },
  profile: {
    en: 'Profile',
    fr: 'Profil'
  },
  logout: {
    en: 'Logout',
    fr: 'Déconnexion'
  },
  
  // Common actions
  save: {
    en: 'Save',
    fr: 'Enregistrer'
  },
  cancel: {
    en: 'Cancel',
    fr: 'Annuler'
  },
  delete: {
    en: 'Delete',
    fr: 'Supprimer'
  },
  edit: {
    en: 'Edit',
    fr: 'Modifier'
  },
  add: {
    en: 'Add',
    fr: 'Ajouter'
  },
  view: {
    en: 'View',
    fr: 'Voir'
  },
  back: {
    en: 'Back',
    fr: 'Retour'
  },
  next: {
    en: 'Next',
    fr: 'Suivant'
  },
  previous: {
    en: 'Previous',
    fr: 'Précédent'
  },
  submit: {
    en: 'Submit',
    fr: 'Soumettre'
  },
  
  // Authentication
  login: {
    en: 'Login',
    fr: 'Connexion'
  },
  register: {
    en: 'Register',
    fr: 'S\'inscrire'
  },
  username: {
    en: 'Username',
    fr: 'Nom d\'utilisateur'
  },
  password: {
    en: 'Password',
    fr: 'Mot de passe'
  },
  
  // Visitor check-in
  firstName: {
    en: 'First Name',
    fr: 'Prénom'
  },
  middleName: {
    en: 'Middle Name',
    fr: 'Deuxième prénom'
  },
  lastName: {
    en: 'Last Name',
    fr: 'Nom de famille'
  },
  yearOfBirth: {
    en: 'Year of Birth',
    fr: 'Année de naissance'
  },
  phoneNumber: {
    en: 'Phone Number',
    fr: 'Numéro de téléphone'
  },
  email: {
    en: 'Email',
    fr: 'Courriel'
  },
  purpose: {
    en: 'Purpose of Visit',
    fr: 'Raison de la visite'
  },
  checkIn: {
    en: 'Check In',
    fr: 'Enregistrement'
  },
  checkOut: {
    en: 'Check Out',
    fr: 'Départ'
  },
  visitor: {
    en: 'Visitor',
    fr: 'Visiteur'
  },
  verified: {
    en: 'Verified',
    fr: 'Vérifié'
  },
  unverified: {
    en: 'Unverified',
    fr: 'Non vérifié'
  },
  
  // Welcome page
  welcome: {
    en: 'Welcome',
    fr: 'Bienvenue'
  },
  visitorCheckIn: {
    en: 'Visitor Check-In',
    fr: 'Enregistrement des visiteurs'
  },
  adminPortal: {
    en: 'Admin Portal',
    fr: 'Portail administrateur'
  },
  
  // Admin dashboard
  overview: {
    en: 'Overview',
    fr: 'Aperçu'
  },
  analytics: {
    en: 'Analytics',
    fr: 'Analytique'
  },
  currentVisitors: {
    en: 'Current Visitors',
    fr: 'Visiteurs actuels'
  },
  visitorHistory: {
    en: 'Visitor History',
    fr: 'Historique des visiteurs'
  },
  recyclebin: {
    en: 'Recycle Bin',
    fr: 'Corbeille'
  },
  emptyBin: {
    en: 'Empty Bin',
    fr: 'Vider la corbeille'
  },
  restore: {
    en: 'Restore',
    fr: 'Restaurer'
  },
  permanentlyDelete: {
    en: 'Permanently Delete',
    fr: 'Supprimer définitivement'
  },
  
  // Analytics
  visitorsByDay: {
    en: 'Visitors by Day',
    fr: 'Visiteurs par jour'
  },
  visitorsByHour: {
    en: 'Visitors by Hour',
    fr: 'Visiteurs par heure'
  },
  todayStats: {
    en: 'Today\'s Stats',
    fr: 'Statistiques du jour'
  },
  totalVisitors: {
    en: 'Total Visitors',
    fr: 'Total des visiteurs'
  },
  activeVisits: {
    en: 'Active Visits',
    fr: 'Visites actives'
  },
  avgDuration: {
    en: 'Avg. Duration',
    fr: 'Durée moyenne'
  },

  // Settings
  appearance: {
    en: 'Appearance',
    fr: 'Apparence'
  },
  branding: {
    en: 'Branding',
    fr: 'Image de marque'
  },
  appName: {
    en: 'Application Name',
    fr: 'Nom de l\'application'
  },
  headerAppName: {
    en: 'Header Name',
    fr: 'Nom de l\'en-tête'
  },
  footerAppName: {
    en: 'Footer Name',
    fr: 'Nom du pied de page'
  },
  logoUrl: {
    en: 'Logo URL',
    fr: 'URL du logo'
  },
  theme: {
    en: 'Theme',
    fr: 'Thème'
  },
  adminTheme: {
    en: 'Admin Theme',
    fr: 'Thème de l\'administrateur'
  },
  visitorTheme: {
    en: 'Visitor Theme',
    fr: 'Thème du visiteur'
  },
  light: {
    en: 'Light',
    fr: 'Clair'
  },
  dark: {
    en: 'Dark',
    fr: 'Sombre'
  },
  twilight: {
    en: 'Twilight',
    fr: 'Crépuscule'
  },
  system: {
    en: 'System',
    fr: 'Système'
  },
  language: {
    en: 'Language',
    fr: 'Langue'
  },
  defaultLanguage: {
    en: 'Default Language',
    fr: 'Langue par défaut'
  },
  preferredLanguage: {
    en: 'Preferred Language',
    fr: 'Langue préférée'
  },
  english: {
    en: 'English',
    fr: 'Anglais'
  },
  french: {
    en: 'French',
    fr: 'Français'
  },
  languageDescription: {
    en: 'Choose your preferred language for the admin interface',
    fr: 'Choisissez votre langue préférée pour l\'interface d\'administration'
  },
  defaultLanguageDescription: {
    en: 'Set the default language for the visitor-facing interface',
    fr: 'Définir la langue par défaut pour l\'interface destinée aux visiteurs'
  },
  
  // Toast messages
  settingsSaved: {
    en: 'Settings saved successfully',
    fr: 'Paramètres enregistrés avec succès'
  },
  errorSavingSettings: {
    en: 'Error saving settings',
    fr: 'Erreur lors de l\'enregistrement des paramètres'
  },
  languageUpdated: {
    en: 'Language preference updated',
    fr: 'Préférence de langue mise à jour'
  },
  errorUpdatingLanguage: {
    en: 'Error updating language preference',
    fr: 'Erreur lors de la mise à jour de la préférence de langue'
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  updateLanguagePreference: (lang: Language) => void;
  isUpdating: boolean;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({ 
  children, 
  defaultLanguage = 'en' 
}: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const { toast } = useToast();
  
  // Use default language as the initial value
  useEffect(() => {
    // Check if there's a stored language preference in localStorage
    const storedLanguage = localStorage.getItem('preferredLanguage') as Language | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'fr')) {
      setLanguage(storedLanguage);
    } else {
      setLanguage(defaultLanguage);
    }
  }, [defaultLanguage]);

  // Mutation to update language preference for admin users
  const { mutate, isPending: isUpdating } = useMutation({
    mutationFn: async (preferredLanguage: Language) => {
      const response = await fetch('/api/admin/update-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferredLanguage }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, just store in localStorage
          return { success: true, local: true };
        }
        throw new Error('Failed to update language preference');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {      
      toast({
        title: translations.languageUpdated[language],
        description: '',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: translations.errorUpdatingLanguage[language],
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Function to update language preference
  const updateLanguagePreference = (lang: Language) => {
    setLanguage(lang);
    // Store in localStorage for persistence
    localStorage.setItem('preferredLanguage', lang);
    // Also attempt to update on the server if user is logged in
    mutate(lang);
  };

  // Helper function to translate text
  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translations[key][language] || key;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      updateLanguagePreference,
      isUpdating
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}
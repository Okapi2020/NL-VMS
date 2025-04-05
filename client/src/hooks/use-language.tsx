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
  // Time
  minutes: {
    en: 'minutes',
    fr: 'minutes'
  },
  hours: {
    en: 'hours',
    fr: 'heures'
  },
  days: {
    en: 'days',
    fr: 'jours'
  },
  
  visitPortal: {
    en: 'Visit Portal',
    fr: 'Portail des visites'
  },
  
  exportData: {
    en: 'Export Data',
    fr: 'Exporter les données'
  },
  
  loggingOut: {
    en: 'Logging out...',
    fr: 'Déconnexion...'
  },
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
  thankYouForVisiting: {
    en: 'Thank you for visiting',
    fr: 'Merci de votre visite'
  },
  pleaseCheckInButtonBelow: {
    en: 'Please check in by clicking the button below',
    fr: 'Veuillez vous enregistrer en cliquant sur le bouton ci-dessous'
  },
  information: {
    en: 'Information',
    fr: 'Informations'
  },
  visitorSystemDescription: {
    en: 'Our visitor management system helps us create a safe and efficient environment',
    fr: 'Notre système de gestion des visiteurs nous aide à créer un environnement sûr et efficace'
  },
  benefits: {
    en: 'Benefits',
    fr: 'Avantages'
  },
  fastCheckInProcess: {
    en: 'Fast and easy check-in process',
    fr: 'Processus d\'enregistrement rapide et facile'
  },
  digitalVisitorRecords: {
    en: 'Digital visitor records',
    fr: 'Registres numériques des visiteurs'
  },
  improvedSecurity: {
    en: 'Improved security and compliance',
    fr: 'Sécurité et conformité améliorées'
  },
  professionalExperience: {
    en: 'Professional visitor experience',
    fr: 'Expérience professionnelle pour les visiteurs'
  },
  needHelp: {
    en: 'Need Help?',
    fr: 'Besoin d\'aide?'
  },
  approachFrontDesk: {
    en: 'Please approach the front desk if you need any assistance with the check-in process',
    fr: 'Veuillez vous adresser à la réception si vous avez besoin d\'aide avec le processus d\'enregistrement'
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
  totalVisitorsToday: {
    en: 'Total Visitors Today',
    fr: 'Total des visiteurs aujourd\'hui'
  },
  currentlyCheckedIn: {
    en: 'Currently Checked In',
    fr: 'Actuellement enregistrés'
  },
  averageVisitDuration: {
    en: 'Average Visit Duration',
    fr: 'Durée moyenne de visite'
  },
  analyticsOverview: {
    en: 'Analytics Overview',
    fr: 'Aperçu analytique'
  },
  visitInsights: {
    en: 'Visit Insights',
    fr: 'Analyse des visites'
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
  refresh: {
    en: 'Refresh',
    fr: 'Actualiser'
  },
  deletedVisitors: {
    en: 'Deleted Visitors',
    fr: 'Visiteurs supprimés'
  },
  deletedVisitorsDescription: {
    en: 'View and manage deleted visitor records',
    fr: 'Afficher et gérer les enregistrements de visiteurs supprimés'
  },
  page: {
    en: 'Page',
    fr: 'Page'
  },
  of: {
    en: 'of',
    fr: 'sur'
  },
  itemsPerPage: {
    en: 'Items per page',
    fr: 'Éléments par page'
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
  confirmPermanentDelete: {
    en: 'Are you sure you want to permanently delete this visitor? This action cannot be undone.',
    fr: 'Êtes-vous sûr de vouloir supprimer définitivement ce visiteur ? Cette action ne peut pas être annulée.'
  },
  confirmEmptyRecycleBin: {
    en: 'Are you sure you want to empty the recycle bin? This action cannot be undone.',
    fr: 'Êtes-vous sûr de vouloir vider la corbeille ? Cette action ne peut pas être annulée.'
  },
  noDeletedVisitors: {
    en: 'No deleted visitors',
    fr: 'Aucun visiteur supprimé'
  },
  recycleBinEmpty: {
    en: 'The recycle bin is empty',
    fr: 'La corbeille est vide'
  },
  allRightsReserved: {
    en: 'All rights reserved',
    fr: 'Tous droits réservés'
  },
  visitorName: {
    en: 'Visitor Name',
    fr: 'Nom du visiteur'
  },
  phone: {
    en: 'Phone',
    fr: 'Téléphone'
  }, 
  createdAt: {
    en: 'Created At',
    fr: 'Créé le'
  },
  actions: {
    en: 'Actions',
    fr: 'Actions'
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
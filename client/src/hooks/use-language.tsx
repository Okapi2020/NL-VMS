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
  
  visitsHeader: {
    en: 'VISITS',
    fr: 'VISITES'
  },
  
  timeHeader: {
    en: 'TIME',
    fr: 'HEURE'
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
  editVisitor: {
    en: 'Edit Visitor',
    fr: 'Modifier le visiteur'
  },
  editVisitorDescription: {
    en: 'Update visitor information',
    fr: 'Mettre à jour les informations du visiteur'
  },
  saveChanges: {
    en: 'Save Changes',
    fr: 'Enregistrer les modifications'
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
  notSpecified: {
    en: 'Not specified',
    fr: 'Non spécifié'
  },
  municipality: {
    en: 'Municipality',
    fr: 'Commune'
  },
  selectMunicipality: {
    en: 'Select municipality',
    fr: 'Sélectionner une commune'
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
  fullName: {
    en: 'Full Name',
    fr: 'Nom complet'
  },
  yearOfBirthLabel: {
    en: 'Year of Birth',
    fr: 'Année de naissance'
  },
  birthYear: {
    en: 'Year of Birth',
    fr: 'Année de naissance'
  },
  genderLabel: {
    en: 'Sex',
    fr: 'Sexe'
  },
  sexLabel: {
    en: 'Sex',
    fr: 'Sexe'
  },
  selectSexDropdown: {
    en: 'Select sex',
    fr: 'Sélectionner le sexe'
  },
  maleOption: {
    en: 'Male (Masculin)',
    fr: 'Masculin'
  },
  femaleOption: {
    en: 'Female (Feminin)',
    fr: 'Feminin'
  },
  phoneNumberField: {
    en: 'Phone Number',
    fr: 'Numéro de téléphone'
  },
  email: {
    en: 'Email',
    fr: 'Courriel'
  },
  emailAddressOptional: {
    en: 'Email Address (Optional)',
    fr: 'Adresse courriel (Optionnel)'
  },
  purpose: {
    en: 'Purpose of Visit',
    fr: 'Raison de la visite'
  },
  checkIn: {
    en: 'Check In',
    fr: 'Arrivée'
  },
  checkOut: {
    en: 'Check Out',
    fr: 'Départ'
  },
  visitorTab: {
    en: 'Visitor',
    fr: 'Visiteur'
  },
  verified: {
    en: 'Verified',
    fr: 'Vérifié'
  },
  verifiedVisitor: {
    en: 'Verified Visitor',
    fr: 'Visiteur Vérifié'
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
  recycleBin: {
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
  ofCount: {
    en: 'of',
    fr: 'sur'
  },
  itemsPerPage: {
    en: 'items per page',
    fr: 'éléments par page'
  },
  emptyBin: {
    en: 'Empty Bin',
    fr: 'Vider la corbeille'
  },
  restoreAction: {
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
  searchByNameBadgePhoneEmail: {
    en: 'Search by name, badge, phone or email',
    fr: 'Rechercher par nom, badge, téléphone ou courriel'
  },
  name: {
    en: 'Name',
    fr: 'Nom'
  },
  badgeId: {
    en: 'Badge ID',
    fr: 'ID Badge'
  },
  verifiedBadge: {
    en: 'Verified Badge',
    fr: 'Badge vérifié'
  },
  durationColumn: {
    en: 'Duration',
    fr: 'Durée'
  },
  showingXofY: {
    en: 'showing {x} of {y} {entity}',
    fr: 'affichage de {x} sur {y} {entity}'
  },
  activeVisitors: {
    en: 'active visitors',
    fr: 'visiteurs actifs'
  },
  registration: {
    en: 'Registration',
    fr: 'Enregistrement'
  },
  showing: {
    en: 'showing',
    fr: 'affichage de'
  },
  loadingCurrentVisitors: {
    en: 'Loading current visitors...',
    fr: 'Chargement des visiteurs actuels...'
  },
  noVisitorsCurrentlyCheckedIn: {
    en: 'No visitors currently checked in',
    fr: 'Aucun visiteur actuellement enregistré'
  },
  whenVisitorsCheckIn: {
    en: 'When visitors check in, they will appear here',
    fr: 'Lorsque les visiteurs s\'enregistrent, ils apparaîtront ici'
  },
  noEmailProvided: {
    en: 'No email provided',
    fr: 'Aucun courriel fourni'
  },
  noPhoneProvided: {
    en: 'No phone provided',
    fr: 'Aucun téléphone fourni'
  },
  ongoing: {
    en: 'Ongoing',
    fr: 'En cours'
  },
  visitorDetails: {
    en: 'Visitor Details',
    fr: 'Détails du visiteur'
  },
  personalInformation: {
    en: 'Personal Information',
    fr: 'Informations personnelles'
  },
  contactDetails: {
    en: 'Contact Details',
    fr: 'Coordonnées'
  },
  visitInformation: {
    en: 'Visit Information',
    fr: 'Informations de visite'
  },
  editDetails: {
    en: 'Edit Details',
    fr: 'Modifier'
  },
  deleteRecord: {
    en: 'Delete Record',
    fr: 'Supprimer'
  },
  confirmCheckout: {
    en: 'Are you sure you want to check out this visitor?',
    fr: 'Êtes-vous sûr de vouloir procéder au départ de ce visiteur?'
  },
  confirmAutoCheckout: {
    en: 'Are you sure you want to check out all active visitors?',
    fr: 'Êtes-vous sûr de vouloir procéder au départ de tous les visiteurs actifs?'
  },
  checkOutAll: {
    en: 'Check Out All Visitors',
    fr: 'Départ de tous les visiteurs'
  },
  checkOutSelected: {
    en: 'Check Out Selected',
    fr: 'Départ des visiteurs sélectionnés'
  },
  checkoutSuccess: {
    en: 'Visitor checked out successfully',
    fr: 'Départ du visiteur enregistré avec succès'
  },
  success: {
    en: 'Success',
    fr: 'Succès'
  },
  error: {
    en: 'Error',
    fr: 'Erreur'
  },
  processing: {
    en: 'Processing...',
    fr: 'Traitement...'
  },
  visitorVerified: {
    en: 'Visitor verified successfully',
    fr: 'Visiteur vérifié avec succès'
  },
  visitorUnverified: {
    en: 'Visitor unverified successfully',
    fr: 'Vérification du visiteur retirée avec succès'
  },
  visitorUpdated: {
    en: 'Visitor information updated successfully',
    fr: 'Informations du visiteur mises à jour avec succès'
  },
  visitorDeleted: {
    en: 'Visitor deleted successfully',
    fr: 'Visiteur supprimé avec succès'
  },
  confirmDeleteVisitor: {
    en: 'Are you sure you want to delete {name}? This cannot be undone.',
    fr: 'Êtes-vous sûr de vouloir supprimer {name}? Cette action ne peut pas être annulée.'
  },
  confirmDeleteSelected: {
    en: 'Are you sure you want to delete {count} selected visitor(s)? This will move them to the trash bin.',
    fr: 'Êtes-vous sûr de vouloir supprimer {count} visiteur(s) sélectionné(s)? Ils seront déplacés vers la corbeille.'
  },
  deleteSelected: {
    en: 'Delete Selected',
    fr: 'Supprimer la sélection'
  },
  visitorsDeleted: {
    en: '{count} visitor(s) deleted successfully',
    fr: '{count} visiteur(s) supprimé(s) avec succès'
  },
  noVisitorsMatch: {
    en: 'No visitors match your search criteria',
    fr: 'Aucun visiteur ne correspond à vos critères de recherche'
  },
  
  // Reports section
  reports: {
    en: 'Reports',
    fr: 'Rapports'
  },
  exportOptions: {
    en: 'Export Options',
    fr: 'Options d\'exportation'
  },
  generateReportsDescription: {
    en: 'Generate reports for different time periods',
    fr: 'Générer des rapports pour différentes périodes'
  },
  visitHistoryReport: {
    en: 'Visit History Report',
    fr: 'Rapport d\'historique des visites'
  },
  exportVisitHistoryDescription: {
    en: 'Export complete visit history to CSV',
    fr: 'Exporter l\'historique complet des visites en CSV'
  },
  exportToCsv: {
    en: 'Export to CSV',
    fr: 'Exporter en CSV'
  },
  analyticsReport: {
    en: 'Analytics Report',
    fr: 'Rapport d\'analytique'
  },
  exportAnalyticsDescription: {
    en: 'Export analytics data to CSV',
    fr: 'Exporter les données analytiques en CSV'
  },
  exportAnalytics: {
    en: 'Export Analytics',
    fr: 'Exporter les analytiques'
  },
  
  // Visit history tabs
  visitHistory: {
    en: 'Visit History',
    fr: 'Historique des visites'
  },
  completeVisitRecord: {
    en: 'Complete record of all visitor check-ins',
    fr: 'Registre complet de tous les enregistrements de visiteurs'
  },
  visitorsCurrentlyInBuilding: {
    en: 'Visitors Currently in Building',
    fr: 'Visiteurs actuellement dans le bâtiment'
  },
  
  // Analytics
  analyticsInsights: {
    en: 'Visitor traffic patterns and peak times',
    fr: 'Tendances de trafic des visiteurs et heures de pointe'
  },
  visitorsByDayOfWeek: {
    en: 'Visitors by Day of Week',
    fr: 'Visiteurs par jour de la semaine'
  },
  visitorFrequencyPattern: {
    en: 'Visitor frequency pattern through the week',
    fr: 'Modèle de fréquence des visiteurs pendant la semaine'
  },
  visitorsByHourOfDay: {
    en: 'Visitors by Hour of Day',
    fr: 'Visiteurs par heure de la journée'
  },
  checkInTrendByHour: {
    en: 'Check-in trend by hour of day',
    fr: 'Tendance des enregistrements par heure de la journée'
  },
  loadingChartData: {
    en: 'Loading chart data...',
    fr: 'Chargement des données graphiques...'
  },
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
  totalRegisteredVisitors: {
    en: 'Total Registered Visitors',
    fr: 'Total des visiteurs enregistrés'
  },
  activeVisits: {
    en: 'Active Visits',
    fr: 'Visites actives'
  },
  avgDuration: {
    en: 'Avg. Duration',
    fr: 'Durée moyenne'
  },
  resetAvgDurationTooltip: {
    en: 'Reset the average visit duration counter',
    fr: 'Réinitialiser le compteur de durée moyenne de visite'
  },
  autoCheckoutNotice: {
    en: 'For security purposes, all visitors will be automatically checked out at midnight. If you need to stay longer, please check in again the next day.',
    fr: 'Pour des raisons de sécurité, tous les visiteurs seront automatiquement désenregistrés à minuit. Si vous avez besoin de rester plus longtemps, veuillez vous enregistrer à nouveau le lendemain.'
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
  
  // Notification system
  notifications: {
    en: 'Notifications',
    fr: 'Notifications'
  },
  markAllRead: {
    en: 'Mark all as read',
    fr: 'Tout marquer comme lu'
  },
  clear: {
    en: 'Clear',
    fr: 'Effacer'
  },
  noNotifications: {
    en: 'No notifications',
    fr: 'Aucune notification'
  },
  checkedIn: {
    en: 'Checked in',
    fr: 'Enregistré'
  },
  partnerLinked: {
    en: 'Partnered with',
    fr: 'Associé avec'
  },
  partnerUnlinked: {
    en: 'Partner relationship removed',
    fr: 'Relation partenaire supprimée'
  },
  partner: {
    en: 'Partner',
    fr: 'Partenaire'
  },
  noPartner: {
    en: 'No partner',
    fr: 'Pas de partenaire'
  },
  noPartnerAssigned: {
    en: 'No partner assigned',
    fr: 'Aucun partenaire assigné'
  },
  selectPartner: {
    en: 'Select Partner',
    fr: 'Sélectionner un partenaire'
  },
  selectPartnerDescription: {
    en: 'Select the visitor you wish to associate with "${firstName}". Don\'t hesitate to ask the visitor questions if you\'re not sure.',
    fr: 'Sélectionnez le visiteur associer à "${firstName}". N\'hésitez pas à demander au visiteur si vous n\'êtes pas sûr.'
  },
  currentlyPartneredWith: {
    en: 'Currently partnered with',
    fr: 'Actuellement associé avec'
  },
  removePartner: {
    en: 'Remove',
    fr: 'Supprimer'
  },
  searchForVisitor: {
    en: 'Search for a visitor...',
    fr: 'Rechercher un visiteur...'
  },
  noAvailablePartners: {
    en: 'No available partners found. All visitors are already paired or no other visitors are checked in.',
    fr: 'Aucun partenaire disponible trouvé. Tous les visiteurs sont déjà associés ou aucun autre visiteur n\'est enregistré.'
  },
  confirmDeleteVisitorDialog: {
    en: 'Are you sure you want to delete ${name}?',
    fr: 'Êtes-vous sûr de vouloir supprimer ${name}?'
  },
  confirmDeleteSelectedVisitors: {
    en: 'Are you sure you want to delete ${count} selected visitors?',
    fr: 'Êtes-vous sûr de vouloir supprimer ${count} visiteurs sélectionnés?'
  },
  noPhoneProvidedMessage: {
    en: 'No phone provided',
    fr: 'Pas de téléphone fourni'
  },
  swipeToSeeMore: {
    en: '← Swipe to see more →',
    fr: '← Glissez pour voir plus →'
  },
  noPhone: {
    en: 'No phone provided',
    fr: 'Aucun téléphone fourni'
  },
  noEmail: {
    en: 'No email provided',
    fr: 'Aucun courriel fourni'
  },
  filters: {
    en: 'Filters',
    fr: 'Filtres'
  },
  editVisitorInformation: {
    en: 'Edit Visitor Information',
    fr: 'Modifier les informations du visiteur'
  },
  updateVisitorDetails: {
    en: 'Update the visitor\'s personal information and contact details.',
    fr: 'Mettre à jour les informations personnelles et les coordonnées du visiteur.'
  },
  close: {
    en: 'Close',
    fr: 'Fermer'
  },
  searchVisitors: {
    en: 'Search visitors...',
    fr: 'Rechercher des visiteurs...'
  },
  searchVisitHistory: {
    en: 'Search visit history...',
    fr: 'Rechercher dans l\'historique des visites...'
  },
  searchVisitHistoryPlaceholder: {
    en: 'Search visit history...',
    fr: 'Rechercher dans l\'historique des visites...'
  },
  selectAll: {
    en: 'Select all',
    fr: 'Tout sélectionner'
  },
  visitorColumn: {
    en: 'Visitor',
    fr: 'Visiteur'
  },
  visitor: {
    en: 'Visitor',
    fr: 'Visiteur'
  },
  contact: {
    en: 'Contact',
    fr: 'Contact'
  },
  badge: {
    en: 'Badge',
    fr: 'Badge'
  },
  visitsColumn: {
    en: 'Visits',
    fr: 'Visites'
  },
  visits: {
    en: 'Visits',
    fr: 'Visites'
  },
  timeColumn: {
    en: 'Time',
    fr: 'Heure'
  },
  time: {
    en: 'Time',
    fr: 'Heure'
  },
  actionsColumn: {
    en: 'Actions',
    fr: 'Actions'
  },
  loading: {
    en: 'Loading...',
    fr: 'Chargement...'
  },
  yearsOld: {
    en: 'years old',
    fr: 'ans'
  },
  registeredOn: {
    en: 'Registered On',
    fr: 'Inscrit le'
  },
  lastVisit: {
    en: 'Last Visit',
    fr: 'Dernière visite'
  },
  ageNotProvided: {
    en: 'Age not provided',
    fr: 'Âge non fourni'
  },
  sexNotSpecified: {
    en: 'Sex not specified',
    fr: 'Sexe non spécifié'
  },
  noVisitorsMatchFilters: {
    en: 'No visitors match your search or filters',
    fr: 'Aucun visiteur ne correspond à votre recherche ou à vos filtres'
  },
  noVisitorsRegistered: {
    en: 'No visitors registered in the system',
    fr: 'Aucun visiteur enregistré dans le système'
  },
  deleteSelectedVisitors: {
    en: 'Delete Selected Visitors',
    fr: 'Supprimer les visiteurs sélectionnés'
  },
  visitorDetailsTitle: {
    en: 'Visitor Details',
    fr: 'Détails du visiteur'
  },
  location: {
    en: 'Location',
    fr: 'Emplacement'
  },
  checkInTime: {
    en: 'Check-in Time',
    fr: 'Heure d\'arrivée'
  },
  visitPurpose: {
    en: 'Visit Purpose',
    fr: 'Motif de la visite'
  },
  totalVisits: {
    en: 'Total Visits',
    fr: 'Visites totales'
  },
  editVisitorButton: {
    en: 'Edit Visitor',
    fr: 'Modifier le visiteur'
  },
  saveChangesButton: {
    en: 'Save Changes',
    fr: 'Enregistrer les modifications'
  },
  cancelButton: {
    en: 'Cancel',
    fr: 'Annuler'
  },
  fullNameField: {
    en: 'Full Name',
    fr: 'Nom complet'
  },
  yearOfBirthField: {
    en: 'Year of Birth',
    fr: 'Année de naissance'
  },
  sexField: {
    en: 'Sex',
    fr: 'Sexe'
  },
  selectSexOption: {
    en: 'Select sex',
    fr: 'Sélectionner le sexe'
  },
  maleValue: {
    en: 'Male',
    fr: 'Masculin'
  },
  femaleValue: {
    en: 'Female',
    fr: 'Féminin'
  },
  selectMunicipalityDropdown: {
    en: 'Select municipality',
    fr: 'Sélectionner la municipalité'
  },
  emailOptional: {
    en: 'Email Address (Optional)',
    fr: 'Adresse e-mail (Facultatif)'
  },
  phoneNumberDisplay: {
    en: 'Phone Number',
    fr: 'Numéro de téléphone'
  },
  itemsPerPageLabel: {
    en: 'items per page',
    fr: 'éléments par page'
  },
  pageNumber: {
    en: 'Page',
    fr: 'Page'
  },
  all: {
    en: 'All municipalities',
    fr: 'Toutes les municipalités'
  },
  durationFilter: {
    en: 'Duration',
    fr: 'Durée'
  },
  selectDuration: {
    en: 'Select duration',
    fr: 'Sélectionner la durée'
  },
  allDurations: {
    en: 'All durations',
    fr: 'Toutes les durées'
  },
  lessThan30min: {
    en: 'Less than 30 minutes',
    fr: 'Moins de 30 minutes'
  },
  '30minTo1hour': {
    en: '30 minutes to 1 hour',
    fr: '30 minutes à 1 heure'
  },
  '1hourTo3hours': {
    en: '1 hour to 3 hours',
    fr: '1 heure à 3 heures'
  },
  moreThan3hours: {
    en: 'More than 3 hours',
    fr: 'Plus de 3 heures'
  },
  visitorType: {
    en: 'Visitor Type',
    fr: 'Type de visiteur'
  },
  selectVisitorType: {
    en: 'Select visitor type',
    fr: 'Sélectionner le type de visiteur'
  },
  allVisitors: {
    en: 'All visitors',
    fr: 'Tous les visiteurs'
  },
  firstTimeVisitors: {
    en: 'First-time visitors',
    fr: 'Visiteurs pour la première fois'
  },
  regularVisitors: {
    en: 'Regular visitors (2-9 visits)',
    fr: 'Visiteurs réguliers (2-9 visites)'
  },
  frequentVisitors: {
    en: 'Frequent visitors (10+ visits)',
    fr: 'Visiteurs fréquents (10+ visites)'
  },
  resetFilters: {
    en: 'Reset Filters',
    fr: 'Réinitialiser les filtres'
  },
  applyFilters: {
    en: 'Apply Filters',
    fr: 'Appliquer les filtres'
  },
  historiqueDesVisites: {
    en: 'Visit History',
    fr: 'Historique des Visites'
  },
  loadMoreVisits: {
    en: 'Load ${count} more visits',
    fr: 'Charger ${count} visites supplémentaires'
  },
  loadingMoreVisits: {
    en: 'Loading more visits',
    fr: 'Chargement des visites supplémentaires'
  },
  additionalVisitsLoaded: {
    en: 'Additional visits have been loaded for this visitor.',
    fr: 'Des visites supplémentaires ont été chargées pour ce visiteur.'
  },
  noMatchingPartners: {
    en: 'No matching partners found. Try a different search term.',
    fr: 'Aucun partenaire correspondant trouvé. Essayez un autre terme de recherche.'
  },
  partnerDescription: {
    en: 'Link another active visitor who arrived together with this visitor',
    fr: 'Associer un autre visiteur actif qui est arrivé ensemble avec ce visiteur'
  },
  currentPartner: {
    en: 'Current Partner',
    fr: 'Partenaire actuel'
  },
  viewDetails: {
    en: 'View details',
    fr: 'Voir les détails'
  },
  newVisitorNotification: {
    en: 'New visitor check-in',
    fr: 'Nouvel enregistrement de visiteur'
  },
  partnersLinked: {
    en: 'Partners linked',
    fr: 'Partenaires associés'
  },
  partnerRemoved: {
    en: 'Partner removed',
    fr: 'Partenaire supprimé'
  },
  badgeColon: {
    en: 'Badge:',
    fr: 'Badge:'
  },
  timeColon: {
    en: 'Time:',
    fr: 'Heure:'
  },
  visitorPerPage: {
    en: 'visitors per page',
    fr: 'visiteurs par page'
  },
  previousPage: {
    en: 'Previous page',
    fr: 'Page précédente'
  },
  nextPage: {
    en: 'Next page',
    fr: 'Page suivante'
  },
  ofPage: {
    en: 'of',
    fr: 'sur'
  },
  stillActive: {
    en: 'Still active',
    fr: 'Toujours actif'
  },
  details: {
    en: 'Details',
    fr: 'Détails'
  },
  restoreButton: {
    en: 'Restore',
    fr: 'Restaurer'
  },
  viewButton: {
    en: 'View',
    fr: 'Voir'
  },
  municipalityLabel: {
    en: 'Municipality',
    fr: 'Municipalité'
  },
  valueNotSpecified: {
    en: 'Not specified',
    fr: 'Non spécifié'
  },
  loadingVisitHistory: {
    en: 'Loading visit history...',
    fr: 'Chargement de l\'historique des visites...'
  },
  noVisitHistoryAvailable: {
    en: 'No visit history available.',
    fr: 'Aucun historique de visite disponible.'
  },
  showingResults: {
    en: 'Showing ${start} - ${end} of ${total}',
    fr: 'Affichage de ${start} à ${end} sur ${total}'
  },
  ageRange: {
    en: 'Age Range',
    fr: 'Tranche d\'âge'
  },
  min: {
    en: 'Min',
    fr: 'Min'
  },
  max: {
    en: 'Max',
    fr: 'Max'
  },
  clearFilters: {
    en: 'Clear Filters',
    fr: 'Effacer les filtres'
  },
  selectDateRange: {
    en: 'Select date range',
    fr: 'Sélectionner une période'
  },
  dateRange: {
    en: 'Date Range',
    fr: 'Période'
  },
  showTrashBin: {
    en: 'Show Trash Bin',
    fr: 'Afficher la corbeille'
  },
  contactInformation: {
    en: 'Contact Information',
    fr: 'Informations de contact'
  },
  partnerInformation: {
    en: 'Partner Information',
    fr: 'Informations du partenaire'
  },
  visitorDetailsDescription: {
    en: 'View complete visitor information and visit history',
    fr: 'Voir les informations complètes du visiteur et l\'historique des visites'
  },
  visitCount: {
    en: 'Visit Count',
    fr: 'Nombre de visites'
  },
  createdDate: {
    en: 'Created Date',
    fr: 'Date de création'
  },
  visitDuration: {
    en: 'Visit Duration',
    fr: 'Durée de la visite'
  },
  checkOutTime: {
    en: 'Check-out Time',
    fr: 'Heure de départ'
  },
  deleteVisitor: {
    en: 'Delete Visitor',
    fr: 'Supprimer le visiteur'
  },
  phoneNumber: {
    en: 'Phone Number',
    fr: 'Numéro de téléphone'
  },
  yearOfBirth: {
    en: 'Year of Birth',
    fr: 'Année de naissance'
  },
  sex: {
    en: 'Sex',
    fr: 'Sexe'
  },
  male: {
    en: 'Male',
    fr: 'Masculin'
  },
  female: {
    en: 'Female',
    fr: 'Féminin'
  },
  optional: {
    en: 'Optional',
    fr: 'Facultatif'
  },
  allMunicipalities: {
    en: 'All municipalities',
    fr: 'Toutes les municipalités'
  },
  status: {
    en: 'Status',
    fr: 'Statut'
  },
  allStatus: {
    en: 'All status',
    fr: 'Tous les statuts'
  },
  allStatuses: {
    en: 'All status',
    fr: 'Tous les statuts'
  },
  active: {
    en: 'Active',
    fr: 'Actif'
  },
  completed: {
    en: 'Completed',
    fr: 'Terminé'
  },
  showingTrashBin: {
    en: 'Showing Trash Bin',
    fr: 'Affichage de la corbeille'
  },
  trashBinEmpty: {
    en: 'Trash bin is empty',
    fr: 'La corbeille est vide'
  },
  itemsPerPageFilter: {
    en: 'items per page',
    fr: 'éléments par page'
  },
  pageXofY: {
    en: 'Page ${current} of ${total}',
    fr: 'Page ${current} sur ${total}'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
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

  // Helper function to translate text with parameter substitution
  const t = (key: string, params?: Record<string, any>): string => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    let translated = translations[key][language] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.keys(params).forEach(param => {
        // Replace both formats: {param} and ${param}
        // Using regex to properly handle the dollar sign which is a special character in replacement strings
        translated = translated.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        translated = translated.replace(new RegExp(`\\$\\{${param}\\}`, 'g'), params[param]);
      });
    }
    
    return translated;
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
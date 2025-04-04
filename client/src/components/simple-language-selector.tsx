import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type Language = 'en' | 'fr';

type SimpleLanguageSelectorProps = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
};

export function SimpleLanguageSelector({ 
  variant = "outline", 
  size = "icon", 
  showLabel = false,
  className = ""
}: SimpleLanguageSelectorProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Load language from localStorage on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem('preferredLanguage') as Language | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'fr')) {
      setLanguage(storedLanguage);
    }
  }, []);
  
  // Simple translations for the selector itself
  const translations = {
    language: {
      en: 'Language',
      fr: 'Langue'
    },
    english: {
      en: 'English',
      fr: 'Anglais'
    },
    french: {
      en: 'French',
      fr: 'Français'
    }
  };
  
  // Simple translation function
  const t = (key: keyof typeof translations): string => {
    return translations[key][language];
  };
  
  // Update language preference
  const updateLanguagePreference = (lang: Language) => {
    setIsUpdating(true);
    
    // Store in localStorage
    localStorage.setItem('preferredLanguage', lang);
    setLanguage(lang);
    
    // Reload the page to apply the language change
    window.location.reload();
    
    setIsUpdating(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={cn("gap-2", className)}
          disabled={isUpdating}
        >
          <Languages size={16} />
          {showLabel && t('language')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => updateLanguagePreference('en')}
          className={cn(
            "flex items-center gap-2 cursor-pointer", 
            language === 'en' ? "font-medium" : ""
          )}
        >
          {language === 'en' && <span>✓</span>}
          <span className={language === 'en' ? "ml-0" : "ml-5"}>
            {t('english')}
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => updateLanguagePreference('fr')}
          className={cn(
            "flex items-center gap-2 cursor-pointer", 
            language === 'fr' ? "font-medium" : ""
          )}
        >
          {language === 'fr' && <span>✓</span>}
          <span className={language === 'fr' ? "ml-0" : "ml-5"}>
            {t('french')}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
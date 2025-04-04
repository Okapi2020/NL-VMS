import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
};

export function LanguageSelector({ 
  variant = "outline", 
  size = "icon", 
  showLabel = false,
  className = ""
}: LanguageSelectorProps) {
  const { language, updateLanguagePreference, t, isUpdating } = useLanguage();

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
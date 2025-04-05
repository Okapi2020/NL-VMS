import { useState, useEffect, useContext } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage, LanguageContext } from '@/hooks/use-language';

export function LiveClock() {
  const [dateTime, setDateTime] = useState<Date>(new Date());
  
  // Try to get language from context if available, otherwise default to 'en'
  let language = 'en';
  
  // Check if LanguageContext exists in the component tree
  const langContext = useContext(LanguageContext);
  
  if (langContext !== null) {
    try {
      const { language: contextLanguage } = useLanguage();
      language = contextLanguage;
    } catch (error) {
      // If useLanguage fails, fallback to default language
      console.error("Language context error:", error);
    }
  }
  
  useEffect(() => {
    // Update the time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    
    // Clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);
  
  // Format the time in 24-hour format using Kinshasa timezone (UTC+1)
  const formatTime = () => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false,
      timeZone: 'Africa/Kinshasa'
    };
    
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return dateTime.toLocaleTimeString(locale, options);
  };
  
  // Format the date (Weekday, Month Day, Year) using Kinshasa timezone
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Africa/Kinshasa'
    };
    
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return dateTime.toLocaleDateString(locale, options);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="text-lg font-medium">{formatTime()}</div>
      </div>
      <div className="text-sm text-muted-foreground">{formatDate()}</div>
    </div>
  );
}
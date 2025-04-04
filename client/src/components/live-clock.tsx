import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

type LiveClockProps = {
  isEnglish?: boolean;
};

export function LiveClock({ isEnglish = true }: LiveClockProps) {
  const [dateTime, setDateTime] = useState<Date>(new Date());
  
  // Get the language preference from localStorage if not explicitly provided
  const [languageState, setLanguageState] = useState<boolean>(isEnglish);
  
  useEffect(() => {
    // Update state with the prop value if changed
    setLanguageState(isEnglish);
  }, [isEnglish]);
  
  // Check localStorage on component mount if no prop was provided
  useEffect(() => {
    if (isEnglish === undefined) {
      const storedLang = localStorage.getItem('isEnglish');
      if (storedLang !== null) {
        setLanguageState(storedLang === 'true');
      }
    }
  }, []);
  
  useEffect(() => {
    // Update the time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    
    // Clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);
  
  // Format the time in 24-hour format (HH:MM:SS)
  const formatTime = () => {
    return dateTime.toLocaleTimeString(languageState ? 'en-US' : 'fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };
  
  // Format the date (Weekday, Month Day, Year)
  const formatDate = () => {
    return dateTime.toLocaleDateString(languageState ? 'en-US' : 'fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
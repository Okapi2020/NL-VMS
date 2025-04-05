import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [isEnglish, setIsEnglish] = useState(true);
  
  useEffect(() => {
    // Update the time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    
    // Load language preference from localStorage
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang === 'fr') {
      setIsEnglish(false);
    }
    
    // Clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);
  
  // Get the current time in Kinshasa timezone (UTC+1)
  const getKinshasaTime = () => {
    const date = new Date(dateTime);
    
    // Convert to UTC+1 (Kinshasa timezone)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Kinshasa',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    };
    
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'fr-FR', options).format(date);
  };
  
  // Format the date for Kinshasa timezone
  const getKinshasaDate = () => {
    const date = new Date(dateTime);
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Kinshasa',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'fr-FR', options).format(date);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5 mb-1">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="text-lg font-medium">{getKinshasaTime()}</div>
      </div>
      <div className="text-sm text-muted-foreground">
        {getKinshasaDate()}
        <div className="text-xs text-muted-foreground/70 text-center mt-0.5">
          Kinshasa, DRC
        </div>
      </div>
    </div>
  );
}
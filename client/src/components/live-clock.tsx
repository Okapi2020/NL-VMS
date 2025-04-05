import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [dateTime, setDateTime] = useState<Date>(new Date());
  // Get language preference from localStorage (default to French)
  const [isEnglish, setIsEnglish] = useState(false);
  
  useEffect(() => {
    // Update the time every second
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    
    // Load language preference from localStorage
    const storedLang = localStorage.getItem('isEnglish');
    if (storedLang !== null) {
      setIsEnglish(storedLang === 'true');
    }
    
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
    
    return dateTime.toLocaleTimeString(isEnglish ? 'en-US' : 'fr-FR', options);
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
    
    return dateTime.toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR', options);
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
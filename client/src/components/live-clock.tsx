import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [dateTime, setDateTime] = useState<Date>(new Date());
  
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
    return dateTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };
  
  // Format the date (Weekday, Month Day, Year)
  const formatDate = () => {
    return dateTime.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <div className="flex flex-col items-center text-gray-700">
      <div className="flex items-center gap-1.5 mb-1">
        <Clock className="h-5 w-5 text-gray-500" />
        <div className="text-lg font-medium">{formatTime()}</div>
      </div>
      <div className="text-sm text-gray-500">{formatDate()}</div>
    </div>
  );
}
/**
 * Date utility functions for formatting dates consistently across the application
 */

/**
 * Format a date to display only the time (e.g., "14:30")
 */
export function formatTimeOnly(date: Date | string, language: string = 'en'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: language !== 'fr'
  });
}

/**
 * Format a date to display only the date (e.g., "Apr 11, 2025" or "11 avr. 2025")
 */
export function formatDateOnly(date: Date | string, language: string = 'en'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date to display both date and time (e.g., "Apr 11, 2025, 14:30" or "11 avr. 2025 14:30")
 */
export function formatDateTime(date: Date | string, language: string = 'en'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: language !== 'fr'
  });
}

/**
 * Get a friendly relative time (e.g., "5 minutes ago", "Yesterday", etc.)
 */
export function getRelativeTime(date: Date | string, language: string = 'en'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  
  // Use Intl.RelativeTimeFormat when available
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffSecs < 60) {
      return rtf.format(-diffSecs, 'second');
    } else if (diffMins < 60) {
      return rtf.format(-diffMins, 'minute');
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    } else if (diffDays < 30) {
      return rtf.format(-diffDays, 'day');
    }
  }
  
  // Fallback for browsers that don't support RelativeTimeFormat
  if (language === 'fr') {
    if (diffSecs < 60) return `il y a ${diffSecs} secondes`;
    if (diffMins < 60) return `il y a ${diffMins} minutes`;
    if (diffHours < 24) return `il y a ${diffHours} heures`;
    if (diffDays === 1) return 'hier';
    if (diffDays < 30) return `il y a ${diffDays} jours`;
  } else {
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
  }
  
  // For older dates, just return the formatted date
  return formatDateOnly(dateObj, language);
}

/**
 * Format a date range (e.g., "Apr 1 - Apr 15, 2025")
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string, language: string = 'en'): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  
  let formattedStart, formattedEnd;
  
  if (sameMonth) {
    // If same month and year, format as "Apr 1-15, 2025"
    formattedStart = start.toLocaleDateString(locale, { day: 'numeric' });
    formattedEnd = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${formattedStart}-${formattedEnd}`;
  } else if (sameYear) {
    // If same year but different months, format as "Apr 1 - May 15, 2025"
    formattedStart = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    formattedEnd = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } else {
    // If different years, format as "Apr 1, 2024 - Apr 15, 2025"
    formattedStart = start.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    formattedEnd = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  return language === 'fr' ? `${formattedStart} - ${formattedEnd}` : `${formattedStart} - ${formattedEnd}`;
}
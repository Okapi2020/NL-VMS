import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(yearOfBirth: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - yearOfBirth;
}

// Function to format year of birth with age
export function formatYearWithAge(yearOfBirth: number, language: 'en' | 'fr' = 'en'): string {
  const age = calculateAge(yearOfBirth);
  
  if (language === 'fr') {
    return `${yearOfBirth} (${age} ${age === 1 ? 'an' : 'ans'})`;
  }
  
  return `${yearOfBirth} (${age} ${age === 1 ? 'yr' : 'yrs'})`;
}

export function formatDate(date: Date | string, language: 'en' | 'fr' = 'en'): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(date).toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Kinshasa"
  });
}

export function formatTimeOnly(date: Date | string, language: 'en' | 'fr' = 'en'): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(date).toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Kinshasa"
  });
}

export function formatDateShort(date: Date | string, language: 'en' | 'fr' = 'en'): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(date).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Kinshasa"
  });
}

export function formatDuration(startDate: Date | string, endDate: Date | string | null, language: 'en' | 'fr' = 'en'): string {
  // If endDate is null, we can't calculate duration
  if (!endDate) {
    return "N/A";
  }
  
  try {
    // Parse dates correctly
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate the dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Invalid date";
    }
    
    // Calculate duration in milliseconds
    const durationMs = end.getTime() - start.getTime();
    
    // If duration is negative or unreasonably large, there may be a data issue
    if (durationMs < 0 || durationMs > 1000 * 60 * 60 * 24) { // Cap at 24 hours
      return "Check dates";
    }
    
    // Convert to minutes
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} ${language === 'fr' ? 'min' : 'min'}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    // For French, use 'h' for hours and 'min' for minutes
    // For English, use 'h' for hours and 'm' for minutes
    return `${hours}h ${remainingMinutes}${language === 'fr' ? 'min' : 'm'}`;
  } catch (error) {
    console.error("Error formatting duration:", error);
    return "Error";
  }
}

export function formatBadgeId(visitorId: number): string {
  // Format visitor ID to VIS-XXXXX format
  return `VIS-${visitorId.toString().padStart(5, '0')}`;
}

// Format phone number for display with country code
export function formatPhoneWithCountryCode(phoneNumber: string, countryCode: string): string {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Remove leading zero if present
  const formattedNumber = digitsOnly.startsWith('0') ? digitsOnly.substring(1) : digitsOnly;
  
  // Return formatted number with country code
  return `+${countryCode}${formattedNumber}`;
}

/**
 * Format a phone number with spaces for readability
 * e.g. "1234567890" -> "1234 567 890" or "123456789" -> "123 456 789"
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if this is a 9-digit number (without leading zero)
  if (cleaned.length === 9) {
    // Format as xxx xxx xxx
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Format as xxxx xxx xxx (with leading zero)
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length <= 4) {
    return cleaned;
  } else if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  } else {
    // Default format for any other length
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
}

// Create WhatsApp URL for a phone number
export function getWhatsAppUrl(phoneNumber: string, countryCode: string): string {
  const formattedNumber = formatPhoneWithCountryCode(phoneNumber, countryCode).replace(/\+/g, '');
  return `https://wa.me/${formattedNumber}`;
}

// Helper function to convert objects to CSV format
// Function to normalize text by removing accents for search
export function normalizeText(text: string): string {
  if (!text) return '';
  
  // Normalize to decomposed form (accents separated from letters)
  // then replace accented characters with their base letter
  // and convert to lowercase for case-insensitive comparison
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Normalize a phone number for comparison by removing all non-digit characters
 * and handling common formats (with country code or with leading zero)
 * Returns the full number without leading zero or country code
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with country code +243, remove it
  if (digits.startsWith('243')) {
    digits = digits.substring(3);
  }
  
  // If it starts with a 0, remove it (local format)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  
  // Return the normalized number (keeping all digits)
  // DRC mobile numbers are 10 digits with leading zero or 9 digits without it
  console.log(`Client normalized phone number: "${phoneNumber}" -> "${digits}"`);
  return digits;
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    return;
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvContent = [
    headers.join(","), // Header row
    ...data.map(item =>
      headers.map(header => {
        const value = item[header];
        // Handle special cases
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }).join(",")
    )
  ].join("\n");
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
export function formatYearWithAge(yearOfBirth: number): string {
  const age = calculateAge(yearOfBirth);
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

export function formatDuration(startDate: Date | string, endDate: Date | string, language: 'en' | 'fr' = 'en'): string {
  // Convert to Kinshasa timezone for duration calculation
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const options = { timeZone: "Africa/Kinshasa" };
  const startInKinshasa = new Date(new Date(startDate).toLocaleString(locale, options));
  const endInKinshasa = new Date(new Date(endDate).toLocaleString(locale, options));
  
  const start = startInKinshasa.getTime();
  const end = endInKinshasa.getTime();
  const durationMs = end - start;
  
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

// Create WhatsApp URL for a phone number
export function getWhatsAppUrl(phoneNumber: string, countryCode: string): string {
  const formattedNumber = formatPhoneWithCountryCode(phoneNumber, countryCode).replace(/\+/g, '');
  return `https://wa.me/${formattedNumber}`;
}

// Helper function to convert objects to CSV format
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

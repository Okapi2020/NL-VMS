import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(yearOfBirth: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - yearOfBirth;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimeOnly(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function formatDuration(startDate: Date | string, endDate: Date | string): string {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const durationMs = end - start;
  
  // Convert to minutes
  const minutes = Math.floor(durationMs / (1000 * 60));
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

export function formatBadgeId(visitorId: number): string {
  // Format visitor ID to VIS-XXXXX format
  return `VIS-${visitorId.toString().padStart(5, '0')}`;
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

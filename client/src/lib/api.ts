import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "./queryClient";

// Network status monitoring
let isOnline = true;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

// Update online status
if (typeof window !== 'undefined') {
  isOnline = navigator.onLine;
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

// API request with retry logic
export async function apiRequestWithRetry<T>(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  url: string,
  data?: any,
  options?: {
    retryCount?: number;
    retryDelay?: number;
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  const retryCount = options?.retryCount ?? MAX_RETRY_COUNT;
  const retryDelay = options?.retryDelay ?? RETRY_DELAY;
  
  try {
    const response = await apiRequest(method, url, data);
    const result = await response.json();
    return result as T;
  } catch (error) {
    if (retryCount > 0 && isOnline) {
      if (options?.onRetry) {
        options.onRetry(MAX_RETRY_COUNT - retryCount + 1);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Exponential backoff
      return apiRequestWithRetry(method, url, data, {
        ...options,
        retryCount: retryCount - 1,
        retryDelay: retryDelay * 2,
      });
    }
    throw error;
  }
}

// React hook for global error handling
export function useGlobalErrorHandler() {
  const { toast } = useToast();
  
  const handleApiError = (error: any, context?: string) => {
    // Log the error (could be extended to send to error tracking service)
    console.error(`API Error${context ? ` (${context})` : ''}:`, error);
    
    // Display user-friendly message
    let message = "An error occurred. Please try again.";
    
    if (!isOnline) {
      message = "You are offline. Please check your internet connection.";
    } else if (error.status === 401) {
      message = "Your session has expired. Please log in again.";
      
      // Redirect to login if needed
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth";
      }
    } else if (error.status === 403) {
      message = "You don't have permission to perform this action.";
    } else if (error.status === 404) {
      message = "The requested resource was not found.";
    } else if (error.status >= 500) {
      message = "A server error occurred. Please try again later.";
    }
    
    // Show error toast
    toast({
      title: "Error",
      description: error.message || message,
      variant: "destructive",
      duration: 5000,
    });
    
    return error;
  };
  
  // Utility to invalidate queries when needed
  const refreshData = (queryKeys: string | string[]) => {
    const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
  
  return {
    handleApiError,
    refreshData,
    isOnline
  };
}

// Performance tracking
export function trackApiPerformance(url: string, startTime: number) {
  const duration = performance.now() - startTime;
  if (duration > 1000) { // Log slow requests (over 1s)
    console.warn(`Slow API request to ${url}: ${duration.toFixed(2)}ms`);
    // Could be extended to send telemetry to a monitoring service
  }
}
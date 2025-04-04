import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Settings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Theme types
export type Theme = "light" | "dark" | "twilight" | "system";

// Context type
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark" | "twilight";
  isLoading: boolean;
};

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider props
type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // We'll initialize with light but immediately replace it when settings are loaded
  const [theme, setThemeState] = useState<Theme>("light");
  
  // Track whether we've initialized from server settings
  const [initializedFromServer, setInitializedFromServer] = useState<boolean>(false);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | "twilight">("light");

  // Query for fetching settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          console.warn("Failed to fetch settings, using defaults");
          return null;
        }
        return res.json() as Promise<Settings>;
      } catch (error) {
        console.warn("Error fetching settings:", error);
        return null;
      }
    },
  });

  // Mutation for updating theme
  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      try {
        // Get current settings first
        const currentSettings = queryClient.getQueryData<Settings>(["/api/settings"]);
        if (!currentSettings) {
          // Can't update settings yet, but we can at least save to localStorage
          localStorage.setItem("theme", newTheme);
          return { theme: newTheme };
        }

        // Determine if we need to update adminTheme or visitorTheme
        // Check URL to determine context
        const isAdmin = window.location.pathname.includes('/admin');
        
        // Update settings with new theme
        const res = await apiRequest("POST", "/api/settings", {
          ...currentSettings,
          // Update legacy theme for backward compatibility
          theme: newTheme,
          // Update the specific theme based on context
          ...(isAdmin 
            ? { adminTheme: newTheme } 
            : { visitorTheme: newTheme })
        });
        
        return res.json();
      } catch (error) {
        console.error("Failed to update theme:", error);
        // At least save to localStorage
        localStorage.setItem("theme", newTheme);
        return { theme: newTheme };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Theme update failed",
        description: error.message || "Failed to update theme",
        variant: "destructive",
      });
    },
  });

  // Set theme function
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    updateThemeMutation.mutate(newTheme);
    
    // Update localStorage
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      console.error("Failed to set theme in localStorage", e);
    }
  };

  // Initialize theme from settings or localStorage based on context
  useEffect(() => {
    if (settings && !initializedFromServer) {
      // Determine which theme to use based on URL path
      const isAdmin = window.location.pathname.includes('/admin');
      let themeToUse: Theme = 'light';
      
      // Use the specific theme if available, otherwise fall back to the legacy theme
      if (isAdmin && settings.adminTheme) {
        themeToUse = settings.adminTheme as Theme;
        console.log('Using admin theme from server:', themeToUse);
      } else if (!isAdmin && settings.visitorTheme) {
        themeToUse = settings.visitorTheme as Theme;
        console.log('Using visitor theme from server:', themeToUse);
      } else if (settings.theme) {
        // Fall back to legacy theme if specific theme is not set
        themeToUse = settings.theme as Theme;
        console.log('Using legacy theme from server:', themeToUse);
      }
      
      // Apply the theme obtained from server settings
      setThemeState(themeToUse);
      
      // Also update localStorage to keep things in sync
      localStorage.setItem("theme", themeToUse);
      
      // Mark as initialized from server so we don't override with localStorage later
      setInitializedFromServer(true);
    } else if (!settings && !initializedFromServer) {
      // If settings aren't available yet, try localStorage as a temporary solution
      try {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
          console.log('Using saved theme from localStorage:', savedTheme);
          setThemeState(savedTheme);
        }
      } catch (e) {
        console.error("Failed to get theme from localStorage", e);
      }
    }
  }, [settings, initializedFromServer]);

  // Update resolvedTheme based on theme and system preference
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        setResolvedTheme(systemTheme);
      } else {
        setResolvedTheme(theme as "light" | "dark" | "twilight");
      }
    };

    updateResolvedTheme();

    // Listen for changes in system preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    
    // Clear all theme classes first
    root.classList.remove("dark", "twilight", "light");
    
    // Apply appropriate class
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      console.log('Applied dark theme to document');
    } else if (resolvedTheme === "twilight") {
      root.classList.add("twilight");
      console.log('Applied twilight theme to document');
    } else {
      root.classList.add("light");
      console.log('Applied light theme to document');
    }
    
    // Force a re-paint to ensure the theme is fully applied
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 0);
    
  }, [resolvedTheme]);

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for accessing theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.warn("Theme context not available, using defaults");
    // Return a default context instead of throwing an error
    return {
      theme: "light" as Theme,
      setTheme: () => {},
      resolvedTheme: "light" as const,
      isLoading: false
    };
  }
  return context;
}
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
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get theme from localStorage on initialization
    try {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      return savedTheme || "light";
    } catch (e) {
      console.error("Failed to get theme from localStorage", e);
      return "light";
    }
  });
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

        // Update settings with new theme
        const res = await apiRequest("POST", "/api/settings", {
          ...currentSettings,
          theme: newTheme,
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

  // Initialize theme from settings or localStorage
  useEffect(() => {
    if (settings?.theme) {
      setThemeState(settings.theme as Theme);
    } else {
      try {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
          setThemeState(savedTheme);
        }
      } catch (e) {
        console.error("Failed to get theme from localStorage", e);
      }
    }
  }, [settings]);

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
    root.classList.remove("dark", "twilight");
    
    // Apply appropriate class
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else if (resolvedTheme === "twilight") {
      root.classList.add("twilight");
    }
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
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
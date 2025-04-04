import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Settings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Theme types
export type Theme = "light" | "dark" | "system";

// Context type
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
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
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Query for fetching settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json() as Promise<Settings>;
    },
  });

  // Mutation for updating theme
  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      // Get current settings first
      const currentSettings = queryClient.getQueryData<Settings>(["/api/settings"]);
      if (!currentSettings) {
        throw new Error("Settings not loaded");
      }

      // Update settings with new theme
      const res = await apiRequest("POST", "/api/settings", {
        ...currentSettings,
        theme: newTheme,
      });
      
      return res.json();
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
        setResolvedTheme(theme as "light" | "dark");
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
    
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
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
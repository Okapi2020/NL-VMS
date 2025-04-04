import { Moon, Sun, Laptop, SunDim } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, Theme } from "@/hooks/use-theme";

type ThemeToggleProps = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
};

export function ThemeToggle({ 
  variant = "outline", 
  size = "icon",
  showLabel = false,
  className = ""
}: ThemeToggleProps) {
  // Try to use theme context, but provide fallback if not available
  let theme: Theme = "light";
  let resolvedTheme: "light" | "dark" | "twilight" = "light";
  let setTheme: (theme: Theme) => void = () => {};

  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    resolvedTheme = themeContext.resolvedTheme;
    setTheme = themeContext.setTheme;
  } catch (error) {
    console.warn("Theme context not available, using defaults");
    // Provide fallback behavior
    if (document.documentElement.classList.contains("dark")) {
      resolvedTheme = "dark";
    } else if (document.documentElement.classList.contains("twilight")) {
      resolvedTheme = "twilight";
    } else {
      resolvedTheme = "light";
    }
    
    setTheme = (newTheme: Theme) => {
      try {
        localStorage.setItem("theme", newTheme);
        
        // Remove all theme classes first
        document.documentElement.classList.remove("dark", "twilight");
        
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (newTheme === "twilight") {
          document.documentElement.classList.add("twilight");
        } else if (newTheme === "system") {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          }
          // System doesn't handle twilight automatically
        }
      } catch (e) {
        console.error("Failed to set theme", e);
      }
    };
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {resolvedTheme === "light" ? (
            <>
              <Sun className="h-5 w-5 text-yellow-500" />
              {showLabel && <span className="ml-2">Light</span>}
            </>
          ) : resolvedTheme === "twilight" ? (
            <>
              <SunDim className="h-5 w-5 text-purple-400" />
              {showLabel && <span className="ml-2">Twilight</span>}
            </>
          ) : (
            <>
              <Moon className="h-5 w-5 text-indigo-400" />
              {showLabel && <span className="ml-2">Dark</span>}
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-2 h-4 w-4 text-yellow-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("twilight")}>
          <SunDim className="mr-2 h-4 w-4 text-purple-400" />
          <span>Twilight</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-2 h-4 w-4 text-indigo-400" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Laptop className="mr-2 h-4 w-4 text-blue-500" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
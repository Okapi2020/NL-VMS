import { Moon, Sun, Laptop } from "lucide-react";
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
  let resolvedTheme: "light" | "dark" = "light";
  let setTheme: (theme: Theme) => void = () => {};

  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    resolvedTheme = themeContext.resolvedTheme;
    setTheme = themeContext.setTheme;
  } catch (error) {
    console.warn("Theme context not available, using defaults");
    // Provide fallback behavior
    resolvedTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme = (newTheme: Theme) => {
      try {
        localStorage.setItem("theme", newTheme);
        if (newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
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
              <Sun className="h-5 w-5" />
              {showLabel && <span className="ml-2">Light</span>}
            </>
          ) : (
            <>
              <Moon className="h-5 w-5" />
              {showLabel && <span className="ml-2">Dark</span>}
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
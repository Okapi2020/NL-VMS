import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./hooks/use-theme";
import { LanguageProvider } from "./hooks/use-language";
import { AuthProvider } from "./hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";

// Root component that fetches settings before rendering the app
function Root() {
  // Fetch settings to get the default language
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // While settings are loading, we can render a minimal loading state
  // or use a fallback language
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider defaultLanguage={settings?.defaultLanguage || "en"}>
          <App />
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <Root />
  </QueryClientProvider>
);

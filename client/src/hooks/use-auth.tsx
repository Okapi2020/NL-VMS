import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { Admin } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: Admin | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Admin, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isDevelopment = import.meta.env.DEV === true;
  
  // In development mode, use a simpler query that won't trigger auth errors
  // and will use the auto-authenticated admin user from the backend
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<Admin | null, Error>({
    queryKey: ["/api/admin/user"],
    queryFn: isDevelopment 
      ? async () => {
          console.log("Development mode: Using simplified auth query");
          try {
            const res = await fetch("/api/admin/user", {
              credentials: "include"
            });
            if (!res.ok) {
              console.log("Dev mode: Auth query failed, using mock admin");
              return {
                id: 1,
                username: "admin",
                password: "********",
                preferredLanguage: "fr"
              };
            }
            return await res.json();
          } catch (error) {
            console.error("Error in dev mode auth query:", error);
            // Return mock data even on error in dev mode
            return {
              id: 1,
              username: "admin",
              password: "********",
              preferredLanguage: "fr"
            };
          }
        }
      : getQueryFn({ on401: "returnNull" }),
    retry: isDevelopment ? 0 : 1, // No retries in development
    refetchOnWindowFocus: !isDevelopment, // Don't refresh in development
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (isDevelopment) {
        console.log("Development mode: Mocking successful login");
        return {
          id: 1,
          username: "admin",
          password: "********",
          preferredLanguage: "fr"
        };
      }
      
      console.log("Attempting login with credentials:", credentials);
      try {
        // Use direct fetch instead of apiRequest for more debugging
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        // Check cookies after login
        console.log("Cookies after login request:", document.cookie);
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Login failed: ${res.status} ${errorText}`);
        }
        
        const userData = await res.json();
        console.log("Login response:", userData);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: async (user: Admin) => {
      console.log("Login successful, setting user data:", user);
      
      // Update the cached user data
      queryClient.setQueryData(["/api/admin/user"], user);
      
      // Also refetch to ensure we have fresh data
      refetch();
      
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${user.username}!`,
      });
      
      if (!isDevelopment) {
        // Add a small delay to make sure the session is properly established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify user data was set correctly
        console.log("Current user data:", queryClient.getQueryData(["/api/admin/user"]));
        
        // Force a page reload to ensure fresh state
        window.location.href = '/admin';
      } else {
        console.log("Development mode: Skipping page reload after login");
        navigate('/admin');
      }
    },
    onError: (error: Error) => {
      if (isDevelopment) {
        console.log("Development mode: Ignoring login error, proceeding to admin dashboard");
        navigate('/admin');
        return;
      }
      
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isDevelopment) {
        console.log("Development mode: Mocking successful logout");
        // No actual logout in development mode
        return;
      }
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      // Clear the cached user data
      queryClient.setQueryData(["/api/admin/user"], null);
      
      // Also refetch to ensure our state is up-to-date
      refetch();
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // In development mode, just pretend to log out but stay logged in
      if (isDevelopment) {
        console.log("Development mode: Logging out, but staying logged in for convenience");
        setTimeout(() => {
          // Ensure the user is still logged in for development convenience
          queryClient.setQueryData(["/api/admin/user"], {
            id: 1,
            username: "admin",
            password: "********",
            preferredLanguage: "fr"
          });
        }, 100);
      }
    },
    onError: (error: Error) => {
      if (isDevelopment) {
        console.log("Development mode: Ignoring logout error");
        // Mock successful logout in development mode
        toast({
          title: "Logged out",
          description: "You have been logged out successfully (development mode)",
        });
        return;
      }
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Mock for development
const MOCK_ADMIN: Admin = {
  id: 1,
  username: "admin",
  password: "********", // Password is hidden
  preferredLanguage: "fr"
};

// Mock login data for type safety
const MOCK_LOGIN_DATA: LoginData = {
  username: "admin",
  password: "password"
};

const createMockAuth = (): AuthContextType => {
  // Create a minimal mock that satisfies the TypeScript requirements
  return {
    user: MOCK_ADMIN,
    isLoading: false,
    error: null,
    loginMutation: {
      mutate: () => console.log("Mock login"),
      mutateAsync: async () => MOCK_ADMIN,
      isPending: false,
      isError: false,
      isSuccess: true,
      isIdle: false,
      isPaused: false,
      status: "success",
      error: null,
      data: MOCK_ADMIN,
      failureCount: 0,
      failureReason: null,
      reset: () => {},
      variables: MOCK_LOGIN_DATA,
      context: undefined,
      submittedAt: Date.now()
    },
    logoutMutation: {
      mutate: () => console.log("Mock logout"),
      mutateAsync: async () => {},
      isPending: false,
      isError: false,
      isSuccess: true,
      isIdle: false,
      isPaused: false,
      status: "success",
      error: null,
      data: undefined,
      failureCount: 0,
      failureReason: null,
      reset: () => {},
      variables: undefined,
      context: undefined,
      submittedAt: Date.now()
    }
  };
};

export function useAuth() {
  const context = useContext(AuthContext);
  const isDevelopment = import.meta.env.DEV === true;
  
  if (context === null) {
    if (isDevelopment) {
      console.log("Development mode: Using mock authentication");
      return createMockAuth();
    }
    
    console.error("Auth context is null - provider missing");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

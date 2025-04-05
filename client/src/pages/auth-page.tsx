import { useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, AuthContext } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { Settings } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  
  // Check if the auth context exists
  const authContext = useContext(AuthContext);
  
  // Handle direct login when context is not available
  const handleDirectLogin = async (data: LoginFormValues) => {
    try {
      console.log("Using direct login method");
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (!res.ok) {
        console.error("Login failed with status", res.status);
        alert("Login failed: Invalid username or password");
        return;
      }
      
      const userData = await res.json();
      console.log("Login successful, user data:", userData);
      
      // Redirect to admin dashboard
      navigate("/admin");
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: An error occurred");
    }
  };

  // Create a dummy authentication state if auth context is not available
  let userState = {
    user: null,
    isLoading: false,
    loginMutation: {
      mutate: (data: LoginFormValues) => {
        handleDirectLogin(data);
      },
      isPending: false
    }
  };
  
  // Only use the auth hook if context exists
  if (authContext !== null) {
    const auth = useAuth();
    userState = {
      user: auth.user,
      isLoading: auth.isLoading,
      loginMutation: auth.loginMutation
    };
  }
  
  // Destructure the values for easier use
  const { user, isLoading, loginMutation } = userState;
  
  // Query to fetch application settings
  const { 
    data: settings, 
    isLoading: isLoadingSettings 
  } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Redirect to admin dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    console.log("Submitting login form with data:", data);
    
    if (authContext === null) {
      // Use direct login if no auth context is available
      handleDirectLogin(data);
    } else {
      // Use the mutation if context is available
      loginMutation.mutate(data);
    }
  };

  // Default application name
  const appName = settings?.appName || "Visitor Management System";
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center mb-4">
          {settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt={appName} 
              className="h-16 object-contain"
            />
          ) : (
            isLoadingSettings ? (
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
            ) : (
              <svg
                className="h-12 w-12 text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {appName}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Admin Portal - Securely manage your visitors
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Login to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    "Logging in..."
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

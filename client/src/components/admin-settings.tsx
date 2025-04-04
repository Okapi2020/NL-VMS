import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Moon, Sun, Laptop, SunDim } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

// Settings schema for the form
const settingsSchema = z.object({
  appName: z
    .string()
    .min(1, { message: "Application name is required" })
    .max(50, { message: "Application name cannot exceed 50 characters" }),
  headerAppName: z.string().optional(),
  footerAppName: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  countryCode: z
    .string()
    .min(1, { message: "Country code is required" })
    .max(5, { message: "Country code should be up to 5 digits" })
    .refine(code => /^\d+$/.test(code), {
      message: "Country code should contain only digits"
    }),
  adminTheme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }),
  visitorTheme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }),
  defaultLanguage: z.enum(["en", "fr"], {
    errorMap: () => ({ message: "Language must be either English (en) or French (fr)" }),
  }),
  // Keep theme field for backward compatibility
  theme: z.enum(["light", "dark", "twilight", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, twilight, or system" }),
  }).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function AdminSettings() {
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Query for fetching settings
  const { 
    data: settings, 
    isLoading 
  } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });
  
  // Mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Application settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });
  
  // Setup form with react-hook-form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      appName: "Visitor Management System",
      headerAppName: "",
      footerAppName: "",
      logoUrl: null,
      countryCode: "243",
      adminTheme: "light" as const,
      visitorTheme: "light" as const,
      defaultLanguage: "en" as const,
      theme: "light" as const,
    },
  });
  
  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        appName: settings.appName,
        headerAppName: settings.headerAppName || settings.appName,
        footerAppName: settings.footerAppName || settings.appName,
        logoUrl: settings.logoUrl,
        countryCode: settings.countryCode,
        // Use the new fields if available, otherwise fallback to the legacy theme field
        adminTheme: (settings.adminTheme || settings.theme) as "light" | "dark" | "twilight" | "system",
        visitorTheme: (settings.visitorTheme || settings.theme) as "light" | "dark" | "twilight" | "system",
        defaultLanguage: (settings.defaultLanguage || "en") as "en" | "fr",
        theme: settings.theme as "light" | "dark" | "twilight" | "system",
      });
    }
  }, [settings, form]);
  
  // Handle logo file upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Only accept image files
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      // Convert to base64 and store directly
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const base64 = reader.result as string;
          // Validate that the result is a proper base64 string
          if (typeof base64 === 'string' && base64.startsWith('data:image/')) {
            setLogoPreview(base64);
            form.setValue("logoUrl", base64);
          } else {
            throw new Error("Invalid image format");
          }
        } catch (validationError) {
          console.error("Image validation error:", validationError);
          toast({
            title: "Invalid image",
            description: "The selected file couldn't be processed. Please try another image.",
            variant: "destructive",
          });
        } finally {
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read the image file",
          variant: "destructive",
        });
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the logo",
        variant: "destructive",
      });
      setUploading(false);
    }
  };
  
  const onSubmit = (data: SettingsFormValues) => {
    // Ensure the legacy theme field is synchronized with adminTheme
    const submissionData = {
      ...data,
      theme: data.adminTheme // Keep theme field updated for backward compatibility
    };
    
    // Save the settings first
    updateSettingsMutation.mutate(submissionData, {
      onSuccess: () => {
        // After successfully saving, update the current theme since we're in the admin dashboard
        try {
          // We're in the admin interface, so use adminTheme
          setTheme(data.adminTheme);
          
          // Also update the localStorage for the theme
          localStorage.setItem("theme", data.adminTheme);
        } catch (e) {
          console.warn("Could not immediately update theme:", e);
        }
      }
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>
          Customize your Visitor Management System with your company name and logo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="border rounded-lg p-4 bg-card shadow-sm mb-6">
              <h3 className="text-lg font-medium mb-2">Application Name Settings</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Application Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Visitor Management System" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be the default name if header or footer names are not specified.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="headerAppName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Application Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Main app name will be used if empty" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed in the application header. Leave empty to use the main app name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="footerAppName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Footer Application Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Main app name will be used if empty" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed in the application footer. Leave empty to use the main app name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Country Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="243" 
                      {...field} 
                      maxLength={5}
                    />
                  </FormControl>
                  <FormDescription>
                    This country code will be used when displaying phone numbers (e.g., +243)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Application Logo</FormLabel>
              
              {(logoPreview || settings?.logoUrl) && (
                <div className="mb-4">
                  <div className="p-2 border rounded-md w-fit">
                    <img 
                      src={logoPreview || settings?.logoUrl || ''} 
                      alt="Application Logo" 
                      className="max-h-32 max-w-md object-contain"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select Logo
                    </>
                  )}
                </Button>
                
                {(logoPreview || settings?.logoUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setLogoPreview(null);
                      form.setValue("logoUrl", null);
                    }}
                  >
                    Remove
                  </Button>
                )}
                
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
              
              <FormDescription>
                Upload a logo to display on the welcome page. Recommended size is 200×200 pixels.
              </FormDescription>
            </div>

            <div className="border rounded-lg p-4 bg-card shadow-sm">
              <h3 className="text-lg font-medium mb-2">Theme Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure separate theme defaults for the admin dashboard and visitor portal. 
                Users can still override these using the theme toggle in the header.
              </p>
              
              {/* Admin Theme Selection */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2 text-primary">Admin Dashboard Theme</h4>
                <FormField
                  control={form.control}
                  name="adminTheme"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            // We won't try to update the theme here - this caused issues
                            // The theme will be updated when the form is submitted
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="light" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Sun className="mr-2 h-5 w-5 text-yellow-500" />
                              Light Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Light background, dark text)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="twilight" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <SunDim className="mr-2 h-5 w-5 text-purple-400" />
                              Twilight Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Soft dark mode with reduced contrast)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="dark" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Moon className="mr-2 h-5 w-5 text-indigo-400" />
                              Dark Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Dark background, light text)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="system" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Laptop className="mr-2 h-5 w-5 text-blue-500" />
                              System Preference
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Follows the user's device settings)
                              </span>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        This setting applies to all admin dashboard pages (login and admin interface).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Visitor Theme Selection */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-md font-medium mb-2 text-primary">Visitor Portal Theme</h4>
                <FormField
                  control={form.control}
                  name="visitorTheme"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Just store the visitor theme value, don't update current theme
                            // since we're already in admin context - visitor theme will be applied 
                            // when visitor pages are loaded
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="light" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Sun className="mr-2 h-5 w-5 text-yellow-500" />
                              Light Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Light background, dark text)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="twilight" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <SunDim className="mr-2 h-5 w-5 text-purple-400" />
                              Twilight Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Soft dark mode with reduced contrast)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="dark" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Moon className="mr-2 h-5 w-5 text-indigo-400" />
                              Dark Mode
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Dark background, light text)
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="system" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <Laptop className="mr-2 h-5 w-5 text-blue-500" />
                              System Preference
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Follows the user's device settings)
                              </span>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        This setting applies to the welcome page and visitor check-in/out interfaces.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Hidden legacy theme field that gets automatically updated */}
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Language Settings Section */}
            <div className="border rounded-lg p-4 bg-card shadow-sm mt-6 mb-6">
              <h3 className="text-lg font-medium mb-2">Language Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure the default language for visitor-facing pages. Admin users can set their individual preferences.
              </p>
              
              <FormField
                control={form.control}
                name="defaultLanguage"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Default Visitor Language</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="en" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            English
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="fr" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            French (Français)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      This setting determines the default language for the visitor-facing portal.
                      Individual admin users can still select their own preferred language.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Account Settings Section */}
            <div className="border rounded-lg p-4 bg-card shadow-sm mt-6 mb-6">
              <h3 className="text-lg font-medium mb-2">Account Settings</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Change Password</h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      Update your admin account password to maintain security.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full lg:w-auto"
                      onClick={() => {
                        toast({
                          title: "Feature in Development",
                          description: "Password change functionality will be added in a future update.",
                        });
                      }}
                    >
                      Change Password
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Create Admin Account</h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      Add another administrator account to manage the system.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full lg:w-auto"
                      onClick={() => {
                        toast({
                          title: "Feature in Development",
                          description: "User management functionality will be added in a future update.",
                        });
                      }}
                    >
                      Create Admin Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending || uploading}
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
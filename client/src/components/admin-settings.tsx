import { useState } from "react";
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
import { Loader2, Upload, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

// Settings schema for the form
const settingsSchema = z.object({
  appName: z
    .string()
    .min(1, { message: "Application name is required" })
    .max(50, { message: "Application name cannot exceed 50 characters" }),
  logoUrl: z.string().nullable().optional(),
  countryCode: z
    .string()
    .min(1, { message: "Country code is required" })
    .max(5, { message: "Country code should be up to 5 digits" })
    .refine(code => /^\d+$/.test(code), {
      message: "Country code should contain only digits"
    }),
  theme: z.enum(["light", "dark", "system"], {
    errorMap: () => ({ message: "Theme must be light, dark, or system" }),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function AdminSettings() {
  const { toast } = useToast();
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
      appName: settings?.appName || "Visitor Management System",
      logoUrl: settings?.logoUrl || null,
      countryCode: settings?.countryCode || "243",
      theme: settings?.theme as "light" | "dark" | "system" || "light",
    },
    values: settings ? {
      appName: settings.appName,
      logoUrl: settings.logoUrl,
      countryCode: settings.countryCode,
      theme: settings.theme as "light" | "dark" | "system" || "light",
    } : undefined,
  });
  
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
    updateSettingsMutation.mutate(data);
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
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Visitor Management System" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be displayed throughout the application.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                Select the default theme mode for both the admin dashboard and visitor portal. 
                Individual users can still override this using the theme toggle in the header.
              </p>
              
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Default Theme Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Also update the current theme if using useTheme
                          try {
                            const { setTheme } = useTheme();
                            setTheme(value as "light" | "dark" | "system");
                          } catch (e) {
                            // Theme context might not be available, that's okay
                            console.warn("Could not immediately update theme:", e);
                          }
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
                      This setting will be applied globally across all pages of the application.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
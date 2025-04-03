import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

// Settings schema for the form
const settingsSchema = z.object({
  appName: z
    .string()
    .min(1, { message: "Application name is required" })
    .max(50, { message: "Application name cannot exceed 50 characters" }),
  logoUrl: z.string().nullable().optional(),
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
    },
    values: settings ? {
      appName: settings.appName,
      logoUrl: settings.logoUrl,
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
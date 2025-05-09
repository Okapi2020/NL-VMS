import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { WebhookDeliveryHistory } from "./webhook-delivery-history";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2, RefreshCw, ExternalLink, Copy, Check, Eye, EyeOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Webhook event types
const WEBHOOK_EVENTS = [
  {
    id: "visitor.checkin",
    label: "Visitor Check-in",
    description: "Triggered when a visitor checks in"
  },
  {
    id: "visitor.checkout",
    label: "Visitor Check-out",
    description: "Triggered when a visitor checks out"
  },
  {
    id: "visitor.partner",
    label: "Visitor Partner Update",
    description: "Triggered when visitor partners are linked/unlinked"
  },
  {
    id: "visitor.updated",
    label: "Visitor Updated",
    description: "Triggered when a visitor's information is updated"
  },
  {
    id: "visitor.verified",
    label: "Visitor Verified",
    description: "Triggered when a visitor's verification status changes"
  }
];

// Webhook schema
const webhookSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  secret: z.string().min(8, { message: "Secret must be at least 8 characters" }),
  description: z.string().optional(),
  events: z.array(z.string()).min(1, { message: "Select at least one event" })
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

interface Webhook {
  id: number;
  url: string;
  description: string | null;
  events: string[];
  createdAt: string;
  updatedAt: string;
  failureCount: number;
  lastTriggeredAt: string | null;
  status: "active" | "failing" | "disabled";
}

interface WebhookDelivery {
  id: number;
  webhookId: number;
  event: string;
  timestamp: string;
  status: "pending" | "delivered" | "failed";
  responseCode: number | null;
  responseBody: string | null;
  retryCount: number;
  nextRetryAt: string | null;
}

export function WebhookManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch webhooks
  const { data: webhooks, isLoading: isLoadingWebhooks } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/webhooks", {
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch webhooks");
        }
        
        const data = await res.json();
        return data.data || [];
      } catch (error) {
        console.error("Error fetching webhooks:", error);
        return [];
      }
    },
  });

  // Fetch webhook details
  const { data: webhookDetails, isLoading: isLoadingDetails } = useQuery<{ webhook: Webhook, deliveries: WebhookDelivery[] }>({
    queryKey: ["/api/webhooks", selectedWebhook?.id],
    queryFn: async () => {
      if (!selectedWebhook) return { webhook: null, deliveries: [] };
      
      try {
        const res = await fetch(`/api/webhooks/${selectedWebhook.id}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch webhook details");
        }
        
        const webhook = await res.json();
        return {
          webhook: webhook.data?.webhook || null,
          deliveries: webhook.data?.deliveries || []
        };
      } catch (error) {
        console.error("Error fetching webhook details:", error);
        return { webhook: null, deliveries: [] };
      }
    },
    enabled: !!selectedWebhook,
  });

  // Create webhook form
  const createForm = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      url: "",
      secret: "",
      description: "",
      events: []
    }
  });

  // Edit webhook form
  const editForm = useForm<WebhookFormValues & { active: boolean }>({
    resolver: zodResolver(webhookSchema.extend({
      active: z.boolean().optional()
    })),
    defaultValues: {
      url: editingWebhook?.url || "",
      secret: "", // We don't send back the secret
      description: editingWebhook?.description || "",
      events: editingWebhook?.events || [],
      active: editingWebhook?.status === "active" || editingWebhook?.status === "failing" || false
    }
  });

  // Update the edit form when the editing webhook changes
  React.useEffect(() => {
    if (editingWebhook) {
      editForm.reset({
        url: editingWebhook.url,
        secret: "", // We don't send back the secret
        description: editingWebhook.description || "",
        events: editingWebhook.events,
        active: editingWebhook.status === "active" || editingWebhook.status === "failing"
      });
    }
  }, [editingWebhook, editForm]);

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: WebhookFormValues) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully",
      });
      setIsCreating(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create webhook",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async (data: WebhookFormValues & { id: number, active?: boolean }) => {
      const { id, active, ...webhookData } = data;
      // If secret is empty, create new object without it
      const dataToSend = webhookData.secret 
        ? { ...webhookData, active } 
        : { 
            url: webhookData.url, 
            description: webhookData.description, 
            events: webhookData.events,
            active: active !== undefined ? active : true // Default to active if not provided
          };
      
      const res = await apiRequest("PATCH", `/api/webhooks/${id}`, dataToSend);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook updated",
        description: "Your webhook has been updated successfully",
      });
      setEditingWebhook(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update webhook",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/webhooks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook deleted",
        description: "The webhook has been deleted",
      });
      
      if (selectedWebhook) {
        setSelectedWebhook(null);
        setOpenDialog(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete webhook",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  });

  // Reset webhook failures mutation
  const resetWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/webhooks/${id}/reset`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks", selectedWebhook?.id] });
      toast({
        title: "Webhook reset",
        description: "The webhook has been reset and will retry failed deliveries",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset webhook",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  });

  // Form submission handlers
  const onCreateSubmit = (data: WebhookFormValues) => {
    createWebhookMutation.mutate(data);
  };

  const onEditSubmit = (data: WebhookFormValues & { active?: boolean }) => {
    if (!editingWebhook) return;
    
    // Use the active status from the form data
    updateWebhookMutation.mutate({
      id: editingWebhook.id,
      ...data
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case "failing":
        return <Badge variant="destructive">Failing</Badge>;
      case "disabled":
        return <Badge variant="outline">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500 text-white">Delivered</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("default", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };
  
  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Secret key copied to clipboard",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Failed to copy",
        description: "Could not copy the secret key",
        variant: "destructive",
      });
    }
  };
  
  // Function to generate a random secret key
  const generateSecretKey = () => {
    // Generate a random string of 24 characters (letters, numbers, and some special chars)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    const length = 24;
    let result = '';
    
    // Create a Uint8Array with random values
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    
    // Use the random values to select characters from our character set
    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomValues[i] % characters.length);
    }
    
    return result;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook Management</CardTitle>
          <CardDescription>
            Webhooks allow external applications to receive real-time updates from the Visitor Management System.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              Create New Webhook
            </Button>
          </div>

          {isCreating && (
            <Card className="mb-6 border-dashed">
              <CardHeader>
                <CardTitle>Create New Webhook</CardTitle>
                <CardDescription>
                  Enter the details for your new webhook endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://your-application.com/webhook" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL that will receive webhook notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="secret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secret Key</FormLabel>
                          <div className="flex gap-2">
                            <FormControl className="flex-1">
                              <Input 
                                type={showSecret ? "text" : "password"} 
                                placeholder="your-webhook-secret" 
                                {...field} 
                              />
                            </FormControl>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => setShowSecret(!showSecret)}
                              className="h-10 w-10"
                              title={showSecret ? "Hide secret" : "Show secret"}
                            >
                              {showSecret ? <Eye /> : <EyeOff />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const secret = generateSecretKey();
                                field.onChange(secret);
                                setShowSecret(true);
                              }}
                              className="h-10 whitespace-nowrap"
                              title="Generate a secure random secret key"
                            >
                              Generate
                            </Button>
                            {field.value && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(field.value)}
                                className="h-10 w-10"
                                title="Copy secret to clipboard"
                              >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                          <FormDescription>
                            A secret key used to sign webhook payloads for verification
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Production webhook for visitor notifications" {...field} />
                          </FormControl>
                          <FormDescription>
                            A human-readable description of this webhook
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="events"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Events to Subscribe</FormLabel>
                            <FormDescription>
                              Select the events that will trigger this webhook
                            </FormDescription>
                          </div>
                          <div className="space-y-2">
                            {WEBHOOK_EVENTS.map((event) => (
                              <FormField
                                key={event.id}
                                control={createForm.control}
                                name="events"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={event.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(event.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, event.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== event.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium">
                                          {event.label}
                                        </FormLabel>
                                        <FormDescription className="text-xs">
                                          {event.description}
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsCreating(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createWebhookMutation.isPending}
                      >
                        {createWebhookMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Webhook"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {editingWebhook && (
            <Card className="mb-6 border-primary/20">
              <CardHeader>
                <CardTitle>Edit Webhook</CardTitle>
                <CardDescription>
                  Update your webhook configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://your-application.com/webhook" {...field} />
                          </FormControl>
                          <FormDescription>
                            The URL that will receive webhook notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="secret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secret Key (leave blank to keep existing)</FormLabel>
                          <div className="flex gap-2">
                            <FormControl className="flex-1">
                              <Input 
                                type={showSecret ? "text" : "password"} 
                                placeholder="••••••••••••••••" 
                                {...field} 
                              />
                            </FormControl>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => setShowSecret(!showSecret)}
                              className="h-10 w-10"
                              title={showSecret ? "Hide secret" : "Show secret"}
                            >
                              {showSecret ? <Eye /> : <EyeOff />}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const secret = generateSecretKey();
                                field.onChange(secret);
                                setShowSecret(true);
                              }}
                              className="h-10 whitespace-nowrap"
                              title="Generate a secure random secret key"
                            >
                              Generate
                            </Button>
                            {field.value && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(field.value)}
                                className="h-10 w-10"
                                title="Copy secret to clipboard"
                              >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                          <FormDescription>
                            Only enter a new secret if you want to change it
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Production webhook for visitor notifications" {...field} />
                          </FormControl>
                          <FormDescription>
                            A human-readable description of this webhook
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="events"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Events to Subscribe</FormLabel>
                            <FormDescription>
                              Select the events that will trigger this webhook
                            </FormDescription>
                          </div>
                          <div className="space-y-2">
                            {WEBHOOK_EVENTS.map((event) => (
                              <FormField
                                key={event.id}
                                control={editForm.control}
                                name="events"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={event.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(event.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, event.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== event.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium">
                                          {event.label}
                                        </FormLabel>
                                        <FormDescription className="text-xs">
                                          {event.description}
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setEditingWebhook(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateWebhookMutation.isPending}
                      >
                        {updateWebhookMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Webhook"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {isLoadingWebhooks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (!webhooks || webhooks.length === 0) ? (
            <div className="text-center py-12 border rounded-md bg-muted/20">
              <p className="text-muted-foreground mb-4">No webhooks configured yet</p>
              <Button 
                onClick={() => setIsCreating(true)}
                variant="secondary"
              >
                Create Your First Webhook
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">
                        {webhook.url}
                      </TableCell>
                      <TableCell>
                        {webhook.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event.split('.')[1]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(webhook.status)}
                        {webhook.failureCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({webhook.failureCount} failed)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {webhook.lastTriggeredAt ? formatDate(webhook.lastTriggeredAt) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              setOpenDialog(true);
                            }}
                          >
                            Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingWebhook(webhook)}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this webhook and all its delivery history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                                >
                                  {deleteWebhookMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Details Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Webhook Details</DialogTitle>
            <DialogDescription>
              View webhook delivery history and manage its status
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !webhookDetails?.webhook ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Failed to load webhook details</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Webhook URL</h4>
                  <div className="flex items-center">
                    <code className="bg-muted px-2 py-1 rounded text-xs truncate max-w-[250px]">
                      {webhookDetails.webhook.url}
                    </code>
                    <a 
                      href={webhookDetails.webhook.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(webhookDetails.webhook.status)}
                    {webhookDetails.webhook.status === "failing" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resetWebhookMutation.mutate(webhookDetails.webhook.id)}
                        disabled={resetWebhookMutation.isPending}
                      >
                        {resetWebhookMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reset
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {webhookDetails.webhook.description || "No description provided"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Events</h4>
                  <div className="flex flex-wrap gap-1">
                    {webhookDetails.webhook.events.map((event) => (
                      <Badge key={event} variant="outline">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium mb-1">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(webhookDetails.webhook.createdAt)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(webhookDetails.webhook.updatedAt)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Last Triggered</h4>
                  <p className="text-sm text-muted-foreground">
                    {webhookDetails.webhook.lastTriggeredAt 
                      ? formatDate(webhookDetails.webhook.lastTriggeredAt) 
                      : "Never"}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <h3 className="text-lg font-medium mb-2">Delivery History</h3>
              
              {/* Use the enhanced WebhookDeliveryHistory component */}
              {webhookDetails.webhook?.id && (
                <div className="mt-4">
                  <WebhookDeliveryHistory webhookId={webhookDetails.webhook.id} />
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => setEditingWebhook(webhookDetails.webhook)}
                  onClickCapture={() => setOpenDialog(false)}
                >
                  Edit Webhook
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
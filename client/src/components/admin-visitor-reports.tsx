import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Visitor, VisitorReport } from "@shared/schema";
import {
  AlertTriangle,
  Check,
  Clock,
  Edit,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

// Type definitions for form schemas
const createReportSchema = z.object({
  visitorId: z.number({
    required_error: "Visitor is required",
  }),
  reportType: z.string({
    required_error: "Report type is required",
  }),
  description: z
    .string({
      required_error: "Description is required",
    })
    .min(10, "Description must be at least 10 characters"),
  severityLevel: z.enum(["Low", "Medium", "High"], {
    required_error: "Severity level is required",
  }),
});

type CreateReportFormValues = z.infer<typeof createReportSchema>;

const updateReportSchema = z.object({
  id: z.number(),
  status: z.enum(["Open", "Under Review", "Resolved"], {
    required_error: "Status is required",
  }),
  resolutionNotes: z.string().optional(),
});

type UpdateReportFormValues = z.infer<typeof updateReportSchema>;

// Status badge mapping
const getStatusBadge = (status: string) => {
  switch (status) {
    case "Open":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Open
        </Badge>
      );
    case "Under Review":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Under Review
        </Badge>
      );
    case "Resolved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">{status}</Badge>
      );
  }
};

// Severity badge mapping
const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "Low":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Low
        </Badge>
      );
    case "Medium":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Medium
        </Badge>
      );
    case "High":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          High
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">{severity}</Badge>
      );
  }
};

export function AdminVisitorReports() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVisitorId, setSelectedVisitorId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VisitorReport | null>(null);

  // Create form
  const createForm = useForm<CreateReportFormValues>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      description: "",
    },
  });

  // Update form
  const updateForm = useForm<UpdateReportFormValues>({
    resolver: zodResolver(updateReportSchema),
    defaultValues: {
      status: "Open",
      resolutionNotes: "",
    },
  });

  // Fetch all visitors for the dropdown
  const { data: visitors = [] } = useQuery<Visitor[]>({
    queryKey: ["/api/admin/visitors"],
  });

  // Fetch all reports
  const { 
    data: reports = [], 
    isLoading: isLoadingReports,
    refetch: refetchReports
  } = useQuery<VisitorReport[]>({
    queryKey: ["/api/admin/visitor-reports"],
  });

  // Fetch visitor-specific reports if a visitor is selected
  const { 
    data: visitorReports = [], 
    isLoading: isLoadingVisitorReports 
  } = useQuery<VisitorReport[]>({
    queryKey: ["/api/admin/visitors", selectedVisitorId, "reports"],
    enabled: !!selectedVisitorId,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: CreateReportFormValues) => {
      const response = await apiRequest("POST", "/api/admin/visitor-reports", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("reportCreated"),
        description: t("visitorReportCreatedSuccess"),
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visitor-reports"] });
      if (selectedVisitorId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/visitors", selectedVisitorId, "reports"] 
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("errorCreatingReport"),
        variant: "destructive",
      });
      console.error("Error creating report:", error);
    },
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: async (data: UpdateReportFormValues) => {
      const response = await apiRequest("PATCH", `/api/admin/visitor-reports/${data.id}`, {
        status: data.status,
        resolutionNotes: data.resolutionNotes,
        resolutionDate: data.status === "Resolved" ? new Date().toISOString() : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("reportUpdated"),
        description: t("visitorReportUpdatedSuccess"),
      });
      setIsUpdateDialogOpen(false);
      updateForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visitor-reports"] });
      if (selectedVisitorId) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/visitors", selectedVisitorId, "reports"] 
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("errorUpdatingReport"),
        variant: "destructive",
      });
      console.error("Error updating report:", error);
    },
  });

  // Handle creating a new report
  const onCreateReport = (data: CreateReportFormValues) => {
    createReportMutation.mutate(data);
  };

  // Handle updating a report
  const onUpdateReport = (data: UpdateReportFormValues) => {
    updateReportMutation.mutate(data);
  };

  // Open the update dialog with selected report data
  const handleUpdateClick = (report: VisitorReport) => {
    setSelectedReport(report);
    updateForm.reset({
      id: report.id,
      status: report.status as "Open" | "Under Review" | "Resolved",
      resolutionNotes: report.resolutionNotes || "",
    });
    setIsUpdateDialogOpen(true);
  };

  // Filter reports based on search query, status filter and active tab
  const filteredReports = (activeTab === "visitor" && selectedVisitorId ? visitorReports : reports)
    .filter(report => {
      // Apply status filter if selected
      if (statusFilter && report.status !== statusFilter) return false;
      
      // Apply search query if entered
      if (searchQuery) {
        const visitor = visitors.find(v => v.id === report.visitorId);
        const searchLower = searchQuery.toLowerCase();
        
        return (
          report.reportType.toLowerCase().includes(searchLower) ||
          report.description.toLowerCase().includes(searchLower) ||
          (visitor?.fullName.toLowerCase().includes(searchLower) || false)
        );
      }
      
      return true;
    });

  // Get visitor name by ID
  const getVisitorName = (visitorId: number): string => {
    const visitor = visitors.find(v => v.id === visitorId);
    return visitor ? visitor.fullName : `Visitor ID: ${visitorId}`;
  };

  // Format date for display
  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return "N/A";
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("visitorReports")}</CardTitle>
          <CardDescription>
            {t("visitorReportsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs to switch between all reports and visitor-specific reports */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">
                  <FileText className="w-4 h-4 mr-2" />
                  {t("allReports")}
                </TabsTrigger>
                <TabsTrigger 
                  value="visitor"
                  disabled={!selectedVisitorId}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t("visitorReports")}
                </TabsTrigger>
              </TabsList>
              
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("createReport")}
              </Button>
            </div>
            
            {/* Filters and search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchReports")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select 
                  value={statusFilter || ""} 
                  onValueChange={(value) => setStatusFilter(value || null)}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      {statusFilter || t("filterByStatus")}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      {t("allStatuses")}
                    </SelectItem>
                    <SelectItem value="Open">
                      {t("statusOpen")}
                    </SelectItem>
                    <SelectItem value="Under Review">
                      {t("statusUnderReview")}
                    </SelectItem>
                    <SelectItem value="Resolved">
                      {t("statusResolved")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {activeTab === "all" && (
                  <Select
                    value={selectedVisitorId?.toString() || ""}
                    onValueChange={(value) => {
                      const id = parseInt(value);
                      setSelectedVisitorId(isNaN(id) ? null : id);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <User className="w-4 h-4 mr-2" />
                      {selectedVisitorId 
                        ? getVisitorName(selectedVisitorId)
                        : t("filterByVisitor")}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        {t("allVisitors")}
                      </SelectItem>
                      {visitors.map((visitor) => (
                        <SelectItem 
                          key={visitor.id} 
                          value={visitor.id.toString()}
                        >
                          {visitor.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    refetchReports();
                    if (selectedVisitorId) {
                      queryClient.invalidateQueries({ 
                        queryKey: ["/api/admin/visitors", selectedVisitorId, "reports"] 
                      });
                    }
                  }}
                  title={t("refresh")}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <TabsContent value="all">
              {isLoadingReports ? (
                <div className="text-center py-4">{t("loadingReports")}</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter ? (
                    <div>
                      <p>{t("noReportsMatchFilters")}</p>
                      <Button 
                        variant="link" 
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter(null);
                        }}
                      >
                        {t("clearFilters")}
                      </Button>
                    </div>
                  ) : (
                    <p>{t("noReportsFound")}</p>
                  )}
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("visitor")}</TableHead>
                        <TableHead>{t("reportType")}</TableHead>
                        <TableHead>{t("severity")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("created")}</TableHead>
                        <TableHead>{t("resolved")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {getVisitorName(report.visitorId)}
                          </TableCell>
                          <TableCell>{report.reportType}</TableCell>
                          <TableCell>
                            {getSeverityBadge(report.severityLevel)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(report.status)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(report.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(report.resolutionDate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateClick(report)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {t("update")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="visitor">
              {!selectedVisitorId ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("selectVisitorToViewReports")}
                </div>
              ) : isLoadingVisitorReports ? (
                <div className="text-center py-4">{t("loadingReports")}</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {t("noReportsForVisitor", { 
                      visitorName: getVisitorName(selectedVisitorId) 
                    })}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    {t("createNewReport")}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("reportType")}</TableHead>
                        <TableHead>{t("severity")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead>{t("created")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{report.reportType}</TableCell>
                          <TableCell>
                            {getSeverityBadge(report.severityLevel)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(report.status)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {report.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(report.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateClick(report)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {t("update")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("createNewReport")}</DialogTitle>
            <DialogDescription>
              {t("createReportDescription")}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateReport)} className="space-y-6">
              <FormField
                control={createForm.control}
                name="visitorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("visitor")}</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectVisitor")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitors.map((visitor) => (
                          <SelectItem
                            key={visitor.id}
                            value={visitor.id.toString()}
                          >
                            {visitor.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reportType")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectReportType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Comportement">{t("behavior")}</SelectItem>
                        <SelectItem value="Sécurité">{t("security")}</SelectItem>
                        <SelectItem value="Documentation">{t("documentation")}</SelectItem>
                        <SelectItem value="Autre">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="severityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("severityLevel")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectSeverity")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">{t("low")}</SelectItem>
                        <SelectItem value="Medium">{t("medium")}</SelectItem>
                        <SelectItem value="High">{t("high")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("enterReportDescription")}
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button 
                  type="submit"
                  disabled={createReportMutation.isPending}
                >
                  {createReportMutation.isPending ? t("creating") : t("createReport")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Report Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("updateReport")}</DialogTitle>
            <DialogDescription>
              {t("updateReportDescription")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <Label className="text-sm text-muted-foreground">{t("visitor")}</Label>
                  <p className="font-medium">{getVisitorName(selectedReport.visitorId)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t("reportType")}</Label>
                  <p className="font-medium">{selectedReport.reportType}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">{t("description")}</Label>
                <p className="text-sm mt-1">{selectedReport.description}</p>
              </div>
              
              <div className="flex gap-2 mb-4">
                <div>
                  <Label className="text-sm text-muted-foreground">{t("severity")}</Label>
                  <div className="mt-1">
                    {getSeverityBadge(selectedReport.severityLevel)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t("created")}</Label>
                  <p className="text-sm mt-1">
                    {formatDate(selectedReport.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateReport)} className="space-y-6">
              <input type="hidden" {...updateForm.register("id")} />
              
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("status")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Open">{t("statusOpen")}</SelectItem>
                        <SelectItem value="Under Review">{t("statusUnderReview")}</SelectItem>
                        <SelectItem value="Resolved">{t("statusResolved")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={updateForm.control}
                name="resolutionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resolutionNotes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("enterResolutionNotes")}
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button 
                  type="submit"
                  disabled={updateReportMutation.isPending}
                >
                  {updateReportMutation.isPending ? t("updating") : t("updateReport")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
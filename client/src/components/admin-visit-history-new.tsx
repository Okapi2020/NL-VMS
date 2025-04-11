import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/date-range-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Visit, Visitor } from "@shared/schema";
import { KINSHASA_MUNICIPALITIES } from "@/data/municipalities";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId, formatYearWithAge, normalizeText, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Calendar, 
  SlidersHorizontal, 
  Users, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Tag, 
  Pencil, 
  ArchiveRestore,
  ShieldCheck,
  UserRound,
  Phone,
  Mail
} from "lucide-react";

// Component props
type AdminVisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Main component implementation
function AdminVisitHistoryComponent({ visitHistory, isLoading }: AdminVisitHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  
  // State for search, sort, and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "checkIn" | "checkOut" | "duration" | "visitCount" | "municipality" | "badge">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  
  // State for modals
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  
  // State for partner selection
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [selectedVisitForPartner, setSelectedVisitForPartner] = useState<{ visit: Visit; visitor: Visitor } | null>(null);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Selection for bulk actions
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Form schema for editing visitor
  const editVisitorSchema = z.object({
    id: z.number(),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
    sex: z.enum(["Masculin", "Feminin"], {
      errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
    }),
    municipality: z.string().min(1, "Municipality selection is required"),
    email: z.string().email("Invalid email format").nullable().optional(),
    phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
    // Add a partner field for the visit - it will be a visit ID or null
    partnerId: z.number().nullable().optional(),
    // We need the visit ID too for partner assignment
    visitId: z.number(),
  });

  type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;
  
  // Edit form
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: (selectedVisitor && selectedVisit) ? {
      id: selectedVisitor.id,
      fullName: selectedVisitor.fullName,
      yearOfBirth: selectedVisitor.yearOfBirth,
      sex: selectedVisitor.sex as "Masculin" | "Feminin",
      municipality: selectedVisitor.municipality || "",
      email: selectedVisitor.email,
      phoneNumber: selectedVisitor.phoneNumber,
      visitId: selectedVisit.id,
      partnerId: selectedVisit.partnerId || null
    } : undefined
  });
  
  // Update form values when selectedVisitor or selectedVisit changes
  useEffect(() => {
    if (selectedVisitor && selectedVisit) {
      // Format phone number with leading zero if needed
      let formattedPhoneNumber = selectedVisitor.phoneNumber;
      if (formattedPhoneNumber && !formattedPhoneNumber.startsWith('0') && !formattedPhoneNumber.startsWith('+')) {
        formattedPhoneNumber = '0' + formattedPhoneNumber;
      }
      
      form.reset({
        id: selectedVisitor.id,
        fullName: selectedVisitor.fullName,
        yearOfBirth: selectedVisitor.yearOfBirth,
        sex: selectedVisitor.sex as "Masculin" | "Feminin",
        municipality: selectedVisitor.municipality || "",
        email: selectedVisitor.email,
        phoneNumber: formattedPhoneNumber,
        visitId: selectedVisit.id,
        partnerId: selectedVisit.partnerId || null
      });
    }
  }, [selectedVisitor, selectedVisit, form]);
  
  // Edit visitor mutation
  const editVisitorMutation = useMutation({
    mutationFn: async (visitorData: EditVisitorFormValues) => {
      const res = await apiRequest("PUT", "/api/admin/update-visitor", visitorData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: t("visitorUpdated", { defaultValue: "Visitor information updated successfully" }),
      });
      // Close the dialog
      setIsEditDialogOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToUpdateVisitor", { defaultValue: "Failed to update visitor" }) + ": " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete visitor mutation
  const deleteVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/delete-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: data.message || t("visitorDeleted", { defaultValue: "Visitor deleted successfully" }),
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToDeleteVisitor", { defaultValue: "Failed to delete visitor" }) + ": " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Set partner mutation
  const setPartnerMutation = useMutation({
    mutationFn: async ({ visitId, partnerId }: { visitId: number, partnerId: number | null }) => {
      const res = await apiRequest("POST", "/api/admin/set-visit-partner", { visitId, partnerId });
      return await res.json();
    },
    onSuccess: () => {
      // Close partner dialog
      setIsPartnerDialogOpen(false);
      setSelectedVisitForPartner(null);
      
      // Show success message
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: t("partnerAssignedSuccessfully", { defaultValue: "Partner assigned successfully" }),
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: `${t("failedToAssignPartner", { defaultValue: "Failed to assign partner" })}: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle select partner
  const handleSelectPartner = (partnerId: number) => {
    if (selectedVisitForPartner) {
      setPartnerMutation.mutate({
        visitId: selectedVisitForPartner.visit.id,
        partnerId
      });
    }
  };
  
  // Restore visitor mutation
  const restoreVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("POST", `/api/admin/restore-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: data.message || t("visitorRestored", { defaultValue: "Visitor restored successfully" }),
      });
      
      // If we're in trash bin view, check if it's now empty
      const checkTrashStatus = async () => {
        // Only check if we're in trash bin view
        if (showDeletedVisitors) {
          try {
            const res = await apiRequest("GET", "/api/admin/trash");
            const remaining = await res.json();
            // If trash is empty, switch back to regular view
            if (Array.isArray(remaining) && remaining.length === 0) {
              setShowDeletedVisitors(false);
              setPage(1);
            }
          } catch (error) {
            console.error("Error checking trash status:", error);
          }
        }
      };
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
      
      // Check trash status after data refreshes
      setTimeout(checkTrashStatus, 300);
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToRestoreVisitor", { defaultValue: "Failed to restore visitor" }) + ": " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: EditVisitorFormValues) => {
    // First, update the visitor information
    editVisitorMutation.mutate(data);
    
    // Then, if the visit has a partnerId, handle the partner update separately
    if (selectedVisit && data.visitId && data.partnerId !== undefined) {
      // Only update the partner if it has changed
      if (selectedVisit.partnerId !== data.partnerId) {
        setPartnerMutation.mutate({
          visitId: data.visitId,
          partnerId: data.partnerId
        });
      }
    }
  };
  
  const verifyVisitorMutation = useMutation({
    mutationFn: async ({ visitorId, verified }: { visitorId: number, verified: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/verify-visitor", { visitorId, verified });
      return await res.json();
    },
    onMutate: ({ visitorId }) => {
      setProcessingVerificationIds(prev => new Set(prev).add(visitorId));
    },
    onSuccess: (_, { verified }) => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: verified 
          ? t("visitorVerified", { defaultValue: "Visitor verified successfully" })
          : t("visitorUnverified", { defaultValue: "Visitor unverified successfully" }),
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToUpdateVerification", { defaultValue: "Failed to update verification status" }) + ": " + error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, { visitorId }) => {
      setProcessingVerificationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitorId);
        return newSet;
      });
    }
  });

  const handleVerifyToggle = (visitorId: number, currentStatus: boolean) => {
    verifyVisitorMutation.mutate({ 
      visitorId, 
      verified: !currentStatus 
    });
  };

  if (isLoading) {
    return <div className="py-4 text-center">{t("loadingVisitHistory", { defaultValue: "Loading visit history..." })}</div>;
  }

  if (visitHistory.length === 0) {
    return <div className="py-4 text-center">{t("noVisitHistoryAvailable", { defaultValue: "No visit history available." })}</div>;
  }

  // Filter visits based on search term, status, and date range
  const filteredVisits = visitHistory.filter(item => {
    try {
      // Ensure item and its properties exist - defensive programming
      if (!item || !item.visitor || !item.visit) {
        return false;
      }
      
      const { visitor, visit } = item;
      
      // Generate badge ID for searching
      const badgeId = formatBadgeId(visitor.id).toLowerCase();
      const normalizedSearchTerm = normalizeText(searchTerm);
      
      const matchesSearch = searchTerm === '' || 
        normalizeText(visitor.fullName).includes(normalizedSearchTerm) ||
        (visitor.email && normalizeText(visitor.email).includes(normalizedSearchTerm)) ||
        normalizeText(visitor.phoneNumber).includes(normalizedSearchTerm) ||
        badgeId.includes(normalizedSearchTerm) ||
        normalizeText(formatDate(visit.checkInTime, language)).includes(normalizedSearchTerm);
      
      const matchesStatus = 
        filterStatus === "all" ||
        (filterStatus === "active" && visit.active) ||
        (filterStatus === "completed" && !visit.active);
      
      // Check if visit date is within selected date range
      let matchesDateRange = true;
      if (dateRange && dateRange.from) {
        const visitDate = new Date(visit.checkInTime);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = visitDate >= fromDate && visitDate <= toDate;
        } else {
          // If only from date is selected, match the exact day
          const nextDay = new Date(fromDate);
          nextDay.setDate(nextDay.getDate() + 1);
          matchesDateRange = visitDate >= fromDate && visitDate < nextDay;
        }
      }
      
      // Check deleted status
      const matchesDeletedStatus = showDeletedVisitors ? visitor.deleted : !visitor.deleted;
      
      return matchesSearch && matchesStatus && matchesDateRange && matchesDeletedStatus;
    } catch (error) {
      console.error("Error during filtering:", error);
      return false;
    }
  });

  // Sort the filtered visits
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    // Add defensive checks to prevent errors with null/undefined values
    if (!a || !b || !a.visitor || !b.visitor || !a.visit || !b.visit) {
      return 0;
    }

    let comparison = 0;
    
    try {
      switch (sortField) {
        case "name":
          comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
          break;
        case "municipality":
          // Handle null or undefined municipalities - empty string is sorted before non-empty strings
          const aMunicipality = a.visitor.municipality || "";
          const bMunicipality = b.visitor.municipality || "";
          comparison = aMunicipality.localeCompare(bMunicipality);
          break;
        case "badge":
          // Sort by visitor ID (badge number)
          comparison = a.visitor.id - b.visitor.id;
          break;
        case "checkIn":
          comparison = new Date(a.visit.checkInTime).getTime() - new Date(b.visit.checkInTime).getTime();
          break;
        case "checkOut":
          // Handle case when one or both checkOut times are null
          if (!a.visit.checkOutTime && !b.visit.checkOutTime) comparison = 0;
          else if (!a.visit.checkOutTime) comparison = 1;
          else if (!b.visit.checkOutTime) comparison = -1;
          else comparison = new Date(a.visit.checkOutTime).getTime() - new Date(b.visit.checkOutTime).getTime();
          break;
        case "visitCount":
          // Compare visitor counts - default to 0 if undefined
          const aCount = a.visitor.visitCount || 0;
          const bCount = b.visitor.visitCount || 0;
          comparison = aCount - bCount;
          break;
        case "duration":
          // Calculate durations for comparison
          const aDuration = a.visit.checkOutTime 
            ? new Date(a.visit.checkOutTime).getTime() - new Date(a.visit.checkInTime).getTime() 
            : 0;
          const bDuration = b.visit.checkOutTime 
            ? new Date(b.visit.checkOutTime).getTime() - new Date(b.visit.checkInTime).getTime() 
            : 0;
          comparison = aDuration - bDuration;
          break;
      }
    } catch (error) {
      console.error("Error during sorting:", error);
      return 0;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedVisitors([]);
  }, [searchTerm, filterStatus, dateRange, showDeletedVisitors]);
  
  // Calculate paginated data
  const totalPages = Math.ceil(sortedVisits.length / itemsPerPage);
  const paginatedVisits = sortedVisits.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "checkIn" | "checkOut" | "duration" | "visitCount" | "municipality" | "badge") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  return (
    <div className="w-full">
      {/* Search and filter controls */}
      <div className="mb-4 space-y-2 px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("searchVisitHistoryPlaceholder", { defaultValue: "Search by name, badge, phone, email, date..." })}
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline" 
            type="button" 
            onClick={() => setShowFilters(!showFilters)}
            className="h-10"
          >
            <Filter className="mr-2 h-4 w-4" />
            {t("filters", { defaultValue: "Filters" })}
          </Button>
          
          <Button
            variant={showDeletedVisitors ? "default" : "outline"}
            onClick={async () => {
              // If we're already showing deleted visitors, just toggle back
              if (showDeletedVisitors) {
                setShowDeletedVisitors(false);
                // Reset selected visitors when switching views to prevent state issues
                setSelectedVisitors([]);
                // Reset to first page
                setPage(1);
                return;
              }
              
              // If we're about to show deleted visitors, check if there are any first
              try {
                const res = await apiRequest("GET", "/api/admin/trash");
                const deletedVisitors = await res.json();
                
                if (deletedVisitors.length === 0) {
                  toast({
                    title: t("information", { defaultValue: "Information" }),
                    description: t("trashBinEmpty", { defaultValue: "The trash bin is empty." }),
                  });
                  // Don't show trash bin if empty
                  setShowDeletedVisitors(false);
                } else {
                  setShowDeletedVisitors(true);
                }
              } catch (error) {
                toast({
                  title: t("error", { defaultValue: "Error" }),
                  description: t("failedToCheckTrashBin", { defaultValue: "Failed to check trash bin status" }),
                  variant: "destructive",
                });
                // Make sure we don't show trash bin on error
                setShowDeletedVisitors(false);
              }
            }}
            className={cn(
              "h-10",
              showDeletedVisitors ? "bg-amber-600 hover:bg-amber-700" : ""
            )}
          >
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {showDeletedVisitors ? t("showingTrashBin", { defaultValue: "Showing Trash Bin" }) : t("showTrashBin", { defaultValue: "Show Trash Bin" })}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-4 p-4 border rounded-md shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium block">{t("status", { defaultValue: "Status" })}</label>
                <Select value={filterStatus} onValueChange={(value: "all" | "active" | "completed") => setFilterStatus(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all", { defaultValue: "All" })}</SelectItem>
                    <SelectItem value="active">{t("active", { defaultValue: "Active" })}</SelectItem>
                    <SelectItem value="completed">{t("completed", { defaultValue: "Completed" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium block">{t("dateRange", { defaultValue: "Date Range" })}</label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
              
              {dateRange && (
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDateRange(undefined)}
                    className="h-10"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t("clearDates", { defaultValue: "Clear dates" })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Selected count */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {language === 'en' 
              ? `Showing ${paginatedVisits.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - ${Math.min(page * itemsPerPage, sortedVisits.length)} of ${sortedVisits.length}`
              : `Affichage de ${paginatedVisits.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} à ${Math.min(page * itemsPerPage, sortedVisits.length)} sur ${sortedVisits.length}`
            }
            {showDeletedVisitors ? " " + t("trashBinLabel", { defaultValue: "(Trash Bin)" }) : ""}
            {selectedVisitors?.length > 0 ? ` • ${selectedVisitors.length} ${t("selected", { defaultValue: "selected" })}` : ""}
          </div>
          
          <div className="text-xs text-gray-500 italic md:hidden">
            {t("swipeToSeeMore", { defaultValue: "Swipe to see more" })} →
          </div>
        </div>
        
        {/* Bulk actions */}
        {selectedVisitors.length > 0 && !showDeletedVisitors && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(t("confirmDeleteSelected", { count: selectedVisitors.length, defaultValue: `Are you sure you want to delete ${selectedVisitors.length} selected visitors?` }))) {
                  setIsProcessingBulk(true);
                  Promise.all(
                    selectedVisitors.map(id => 
                      apiRequest("DELETE", `/api/admin/delete-visitor/${id}`)
                        .then(res => res.json())
                    )
                  )
                    .then(() => {
                      toast({
                        title: t("success"),
                        description: t("visitorsDeleted", { count: selectedVisitors.length, defaultValue: `Successfully deleted ${selectedVisitors.length} visitors` }),
                      });
                      setSelectedVisitors([]);
                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                    })
                    .catch(error => {
                      toast({
                        title: t("error"),
                        description: `Failed to delete visitors: ${error.message}`,
                        variant: "destructive",
                      });
                    })
                    .finally(() => {
                      setIsProcessingBulk(false);
                    });
                }
              }}
              disabled={isProcessingBulk}
            >
              {isProcessingBulk ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {t("deleteSelected", { defaultValue: "Delete Selected" })} ({selectedVisitors.length})
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-full divide-y divide-gray-200">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[40px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Checkbox
                  checked={(paginatedVisits?.length || 0) > 0 && (selectedVisitors?.length || 0) === (paginatedVisits?.length || 0)}
                  onCheckedChange={(checked: boolean) => {
                    try {
                      if ((selectedVisitors?.length || 0) === (paginatedVisits?.length || 0)) {
                        setSelectedVisitors([]);
                      } else if (paginatedVisits && paginatedVisits.length > 0) {
                        // Make sure we have a valid visitor.id for every item
                        const validIds = paginatedVisits
                          .filter(item => item && item.visitor && typeof item.visitor.id === 'number')
                          .map(item => item.visitor.id);
                        setSelectedVisitors(validIds);
                      }
                    } catch (error) {
                      console.error("Error selecting/deselecting all visitors:", error);
                    }
                  }}
                />
              </TableHead>

              {/* Visitor Information */}
              <TableHead 
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                onClick={() => handleSortChange("name")}
              >
                <div className="flex items-center">
                  <UserRound className="h-4 w-4 mr-1" />
                  <span>{t("visitor", { defaultValue: "Visitor" })}</span>
                  {sortField === "name" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>

              {/* Contact Information */}
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  <span>{t("contact", { defaultValue: "Contact" })}</span>
                </div>
              </TableHead>
              
              {/* Municipality Column */}
              <TableHead 
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                onClick={() => handleSortChange("municipality")}
              >
                <div className="flex items-center">
                  <span>{t("municipality")}</span>
                  {sortField === "municipality" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Badge ID Column */}
              <TableHead
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                onClick={() => handleSortChange("badge")}
              >
                <div className="flex items-center">
                  <Tag className="mr-1 h-4 w-4" />
                  <span>{t("badge", { defaultValue: "Badge" })}</span>
                  {sortField === "badge" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Visits Column */}
              <TableHead 
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                onClick={() => handleSortChange("visitCount")}
              >
                <div className="flex items-center">
                  <span>{t("visits", { defaultValue: "Visits" })}</span>
                  {sortField === "visitCount" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Partner Column */}
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span>{t("partner", { defaultValue: "Partner" })}</span>
                </div>
              </TableHead>
              
              {/* Visit Time Information */}
              <TableHead 
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
                onClick={() => handleSortChange("checkIn")}
              >
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{t("time", { defaultValue: "Time" })}</span>
                  {(sortField === "checkIn" || sortField === "checkOut") && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Actions */}
              <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>{t("actions", { defaultValue: "Actions" })}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {paginatedVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                  {showDeletedVisitors 
                    ? t("trashBinEmpty", { defaultValue: "Trash bin is empty" })
                    : t("noVisitsMatchFilters", { defaultValue: "No visits match your search or filters" })}
                </TableCell>
              </TableRow>
            ) : (
              paginatedVisits.map(({ visitor, visit }) => {
                // Add safety check for missing visitor or visit
                if (!visitor || !visit) {
                  return null;
                }
                
                return (
                  <TableRow key={`${visitor.id}-${visit.id}`} className="hover:bg-gray-50">
                    {/* Checkbox */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedVisitors?.includes(visitor.id)}
                        onCheckedChange={(checked) => {
                          try {
                            if (checked) {
                              // Add visitor ID to selection
                              setSelectedVisitors(prev => [...prev, visitor.id]);
                            } else {
                              // Remove visitor ID from selection
                              setSelectedVisitors(prev => prev.filter(id => id !== visitor.id));
                            }
                          } catch (error) {
                            console.error("Error toggling visitor selection:", error);
                          }
                        }}
                      />
                    </TableCell>
                    
                    {/* Visitor Information */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {getInitials(visitor.fullName)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {visitor.sex} {formatYearWithAge(visitor.yearOfBirth, language)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Contact Information */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {visitor.email ? (
                          <div className="text-blue-600 hover:underline truncate max-w-xs">
                            {visitor.email}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">{t("noEmail", { defaultValue: "No email provided" })}</div>
                        )}
                        {visitor.phoneNumber && (
                          <div className="text-gray-500">+{visitor.phoneNumber}</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Municipality */}
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visitor.municipality || t("notSpecified", { defaultValue: "Not specified" })}
                    </TableCell>
                    
                    {/* Badge ID */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-100 text-blue-800">
                        {formatBadgeId(visitor.id)}
                      </span>
                    </TableCell>
                    
                    {/* Visit Count */}
                    <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {visitor.visitCount || 0}
                      </span>
                    </TableCell>
                    
                    {/* Partner */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {visit.partnerId ? (
                        (() => {
                          // Find the partner visit and visitor
                          const partnerVisit = visitHistory.find(item => item.visit.id === visit.partnerId);
                          
                          if (partnerVisit) {
                            return (
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-2">
                                  {getInitials(partnerVisit.visitor.fullName)}
                                </div>
                                <span className="text-sm">{partnerVisit.visitor.fullName}</span>
                              </div>
                            );
                          } else {
                            return (
                              <span className="text-gray-500 text-sm">
                                {t("partnerNotFound", { defaultValue: "Partner not found" })}
                              </span>
                            );
                          }
                        })()
                      ) : (
                        <span className="text-gray-500 italic text-sm">{t("noPartner", { defaultValue: "No partner" })}</span>
                      )}
                    </TableCell>
                    
                    {/* Visit Time */}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatTimeOnly(visit.checkInTime, language)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {visit.checkOutTime 
                          ? formatDuration(visit.checkInTime, visit.checkOutTime, language)
                          : t("stillActive", { defaultValue: "Still active" })}
                      </div>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setSelectedVisit(visit);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setSelectedVisit(visit);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        {showDeletedVisitors ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-900 hover:bg-amber-50"
                            onClick={() => {
                              restoreVisitorMutation.mutate(visitor.id);
                            }}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm(t("confirmDeleteVisitor", { defaultValue: "Are you sure you want to delete this visitor?" }))) {
                                deleteVisitorMutation.mutate(visitor.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex justify-end items-center py-3 px-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="mr-4">
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setPage(1); // Reset to first page when changing items per page
              }}
            >
              <SelectTrigger className="h-8 w-24 text-sm">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10 {language === 'en' ? 'items per page' : 'éléments par page'}</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <span className="px-3 text-sm text-gray-700">
              {language === 'en' 
                ? `Page ${page} of ${totalPages || 1}`
                : `Page ${page} sur ${totalPages || 1}`
              }
            </span>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-md"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className={page === 1 ? "h-4 w-4 text-gray-300" : "h-4 w-4 text-gray-600"} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 rounded-md"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className={page >= totalPages ? "h-4 w-4 text-gray-300" : "h-4 w-4 text-gray-600"} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* View Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("visitorDetails", { defaultValue: "Visitor Details" })}</DialogTitle>
            <DialogDescription>
              {t("visitorDetailsDescription", { defaultValue: "View complete information about this visitor" })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisitor && selectedVisit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Visitor Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t("personalInformation", { defaultValue: "Personal Information" })}</h3>
                
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 bg-primary/10">
                    <AvatarFallback className="text-primary text-xl font-medium">
                      {getInitials(selectedVisitor.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="text-xl font-medium">{selectedVisitor.fullName}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="bg-slate-50">
                        {selectedVisitor.sex}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-50">
                        {formatYearWithAge(selectedVisitor.yearOfBirth, language)}
                      </Badge>
                      {selectedVisitor.verified && (
                        <Badge className="bg-blue-50 text-blue-800 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t("verified", { defaultValue: "Verified" })}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t("badgeId", { defaultValue: "Badge ID" })}</p>
                    <p className="font-medium">{formatBadgeId(selectedVisitor.id)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("visitCount", { defaultValue: "Visit Count" })}</p>
                    <p className="font-medium">{selectedVisitor.visitCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("municipality", { defaultValue: "Municipality" })}</p>
                    <p className="font-medium">{selectedVisitor.municipality || t("notSpecified", { defaultValue: "Not specified" })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t("createdDate", { defaultValue: "First Visit" })}</p>
                    <p className="font-medium">{formatDate(selectedVisitor.createdAt, language)}</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="text-lg font-semibold mb-3">{t("contactInformation", { defaultValue: "Contact Information" })}</h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedVisitor.phoneNumber ? (
                        <PhoneNumberLink phoneNumber={selectedVisitor.phoneNumber} className="font-medium" />
                      ) : (
                        <span className="text-gray-500 italic">{t("noPhoneProvided", { defaultValue: "No phone provided" })}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedVisitor.email ? (
                        <a href={`mailto:${selectedVisitor.email}`} className="font-medium text-blue-600 hover:underline">
                          {selectedVisitor.email}
                        </a>
                      ) : (
                        <span className="text-gray-500 italic">{t("noEmailProvided", { defaultValue: "No email provided" })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Visit Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t("visitInformation", { defaultValue: "Visit Information" })}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{t("visitPurpose", { defaultValue: "Purpose of Visit" })}</p>
                    <p className="font-medium">{selectedVisit.purpose || t("notSpecified", { defaultValue: "Not specified" })}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">{t("checkInTime", { defaultValue: "Check-in Time" })}</p>
                    <div className="flex items-center mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <p className="font-medium">{formatTimeOnly(selectedVisit.checkInTime, language)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 ml-4">{formatDate(selectedVisit.checkInTime, language)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">{t("checkOutTime", { defaultValue: "Check-out Time" })}</p>
                    {selectedVisit.checkOutTime ? (
                      <>
                        <div className="flex items-center mt-1">
                          <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                          <p className="font-medium">{formatTimeOnly(selectedVisit.checkOutTime, language)}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-4">{formatDate(selectedVisit.checkOutTime, language)}</p>
                      </>
                    ) : (
                      <p className="font-medium text-blue-600 mt-1">{t("stillCheckedIn", { defaultValue: "Still checked in" })}</p>
                    )}
                  </div>
                  
                  {selectedVisit.checkOutTime && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">{t("visitDuration", { defaultValue: "Visit Duration" })}</p>
                      <p className="font-medium">
                        {formatDuration(selectedVisit.checkInTime, selectedVisit.checkOutTime, language)}
                      </p>
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold mb-3">{t("partnerInformation", { defaultValue: "Partner Information" })}</h3>
                
                {selectedVisit.partnerId ? (
                  (() => {
                    const partnerVisit = visitHistory.find(item => item.visit.id === selectedVisit.partnerId);
                    
                    if (partnerVisit && partnerVisit.visitor) {
                      return (
                        <div className="flex items-center gap-3 p-3 border rounded-md bg-indigo-50/30">
                          <Avatar className="h-12 w-12 bg-indigo-100">
                            <AvatarFallback className="text-indigo-600 font-medium">
                              {getInitials(partnerVisit.visitor.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h4 className="font-medium">{partnerVisit.visitor.fullName}</h4>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {t("badgeId", { defaultValue: "Badge ID" })}: {formatBadgeId(partnerVisit.visitor.id)}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-3 border rounded-md bg-gray-50 text-gray-600">
                          {t("partnerNotFound", { defaultValue: "Partner information not available" })}
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div className="p-3 border rounded-md bg-gray-50 text-gray-600">
                    {t("noPartnerAssigned", { defaultValue: "No partner assigned for this visit" })}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDetailModalOpen(false)}
            >
              {t("close", { defaultValue: "Close" })}
            </Button>
            
            <Button
              onClick={() => {
                setIsDetailModalOpen(false);
                // Use setTimeout to ensure the first modal is properly closed
                setTimeout(() => {
                  if (selectedVisitor && selectedVisit) {
                    setIsEditDialogOpen(true);
                  }
                }, 100);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {t("editVisitor", { defaultValue: "Edit Visitor" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Visitor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editVisitor", { defaultValue: "Edit Visitor" })}</DialogTitle>
            <DialogDescription>
              {t("editVisitorDescription", { defaultValue: "Update visitor information and manage partner status" })}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fullName", { defaultValue: "Full Name" })}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yearOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("yearOfBirth", { defaultValue: "Year of Birth" })}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sex", { defaultValue: "Sex" })}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectSex", { defaultValue: "Select sex" })} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculin">{t("male", { defaultValue: "Male" })}</SelectItem>
                          <SelectItem value="Feminin">{t("female", { defaultValue: "Female" })}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("municipality", { defaultValue: "Municipality" })}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectMunicipality", { defaultValue: "Select municipality" })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KINSHASA_MUNICIPALITIES.map(municipality => (
                          <SelectItem key={municipality} value={municipality}>
                            {municipality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phoneNumber", { defaultValue: "Phone Number" })}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email", { defaultValue: "Email" })}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder={t("optional", { defaultValue: "Optional" })} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>{t("partner", { defaultValue: "Partner" })}</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start gap-2 h-10 px-3 text-left font-normal"
                        onClick={() => {
                          // Prepare for partner selection
                          if (selectedVisitor && selectedVisit) {
                            setSelectedVisitForPartner({ visit: selectedVisit, visitor: selectedVisitor });
                            setIsPartnerDialogOpen(true);
                          }
                        }}
                      >
                        <Users className="h-4 w-4 text-gray-500" />
                        {(() => {
                          if (!field.value) {
                            return <span className="text-gray-500">{t("noPartnerSelected", { defaultValue: "No partner selected" })}</span>;
                          }
                          
                          // Find partner in visitHistory
                          const partnerVisit = visitHistory.find(item => item.visit.id === field.value);
                          if (partnerVisit && partnerVisit.visitor) {
                            return partnerVisit.visitor.fullName;
                          } else {
                            return t("unknownPartner", { defaultValue: "Unknown partner" });
                          }
                        })()}
                      </Button>
                      
                      {field.value && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => {
                            field.onChange(null);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  {t("cancel", { defaultValue: "Cancel" })}
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={editVisitorMutation.isPending}
                >
                  {editVisitorMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      {t("saving", { defaultValue: "Saving..." })}
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("saveChanges", { defaultValue: "Save Changes" })}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Partner Selection Dialog */}
      <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("selectPartner", { defaultValue: "Select Partner" })}</DialogTitle>
            <DialogDescription>
              {t("selectPartnerDescription", { defaultValue: "Select a partner for this visitor's current visit" })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="mb-4">
              <Input
                placeholder={t("searchVisitors", { defaultValue: "Search visitors..." })}
                value={partnerSearchTerm}
                onChange={(e) => setPartnerSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <ScrollArea className="h-[300px] rounded-md border p-2">
              {visitHistory
                .filter(({ visitor, visit }) => {
                  // Don't show the current visitor
                  if (selectedVisitForPartner && visitor.id === selectedVisitForPartner.visitor.id) {
                    return false;
                  }
                  
                  // Only show active visits for partner selection
                  if (!visit.active) {
                    return false;
                  }
                  
                  // Filter by search term if provided
                  if (partnerSearchTerm) {
                    const normalizedSearch = normalizeText(partnerSearchTerm);
                    return (
                      normalizeText(visitor.fullName).includes(normalizedSearch) ||
                      formatBadgeId(visitor.id).toLowerCase().includes(normalizedSearch.toLowerCase())
                    );
                  }
                  
                  return true;
                })
                .map(({ visitor, visit }) => (
                  <div
                    key={`partner-${visitor.id}-${visit.id}`}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-blue-50"
                    onClick={() => handleSelectPartner(visit.id)}
                  >
                    <Avatar className="h-10 w-10 bg-primary/10">
                      <AvatarFallback className="text-primary font-medium">
                        {getInitials(visitor.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{visitor.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {t("badgeId", { defaultValue: "Badge ID" })}: {formatBadgeId(visitor.id)}
                      </div>
                    </div>
                  </div>
                ))}
            </ScrollArea>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPartnerDialogOpen(false)}>
              {t("cancel", { defaultValue: "Cancel" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper with error boundary
export function AdminVisitHistory(props: AdminVisitHistoryProps) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">An error occurred while loading the visit history. Please refresh the page and try again.</div>}>
      <AdminVisitHistoryComponent {...props} />
    </ErrorBoundary>
  );
}
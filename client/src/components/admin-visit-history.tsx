import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId, formatYearWithAge, normalizeText, getInitials } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { KINSHASA_MUNICIPALITIES } from "@/data/municipalities";
import { 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserRound,
  Clock,
  Users,
  XCircle,
  Tag,
  Phone,
  ShieldCheck,
  CheckCircle,
  Pencil,
  Trash2,
  ArchiveRestore,
  Eye,
  UserPlus
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateRange } from "react-day-picker";
import { VisitorDetailModal } from "./visitor-detail-modal";
import { ErrorBoundary } from "@/components/error-boundary";

type AdminVisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Core component separated to be wrapped with error boundary
function AdminVisitHistoryComponent({ visitHistory, isLoading }: AdminVisitHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "checkIn" | "checkOut" | "duration" | "visitCount">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  
  // Partner dialog state
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [selectedVisitForPartner, setSelectedVisitForPartner] = useState<{ visit: Visit; visitor: Visitor } | null>(null);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection
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

  const handleSortChange = (field: "name" | "checkIn" | "checkOut" | "duration" | "visitCount") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  return (
    <div>
      {/* Search and filter controls */}
      <div className="mb-4 space-y-2 px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, badge, phone, email, date..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline" 
            type="button" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
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
            className={showDeletedVisitors ? "bg-amber-600 hover:bg-amber-700" : ""}
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
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
        <div className="text-sm text-gray-500 mt-2">
          Showing {paginatedVisits.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, sortedVisits.length)} of {sortedVisits.length}
          {showDeletedVisitors ? " (Trash Bin)" : ""}
          {selectedVisitors?.length > 0 ? ` • ${selectedVisitors.length} selected` : ""}
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
      <div className="overflow-x-auto border rounded-md shadow-sm">
        <Table className="w-full min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
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
                className="cursor-pointer" 
                onClick={() => handleSortChange("name")}
              >
                <div className="flex items-center">
                  <span className="uppercase text-xs font-medium text-gray-500">Visiteur</span>
                  {sortField === "name" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>

              {/* Contact Information */}
              <TableHead>
                <div className="flex items-center">
                  <span className="uppercase text-xs font-medium text-gray-500">Contact</span>
                </div>
              </TableHead>
              
              {/* Municipality Column */}
              <TableHead>
                <div className="flex items-center">
                  <span className="uppercase text-xs font-medium text-gray-500">{t("municipality")}</span>
                </div>
              </TableHead>
              
              {/* Badge ID Column */}
              <TableHead>
                <div className="flex items-center">
                  <Tag className="mr-1 h-4 w-4" />
                  <span className="uppercase text-xs font-medium text-gray-500">Badge</span>
                </div>
              </TableHead>
              
              {/* Visits Column */}
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("visitCount")}
              >
                <div className="flex items-center">
                  <span className="uppercase text-xs font-medium text-gray-500">{t("visits")}</span>
                  {sortField === "visitCount" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Partner Column */}
              <TableHead>
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span className="uppercase text-xs font-medium text-gray-500">{t("partner", { defaultValue: "Partner" })}</span>
                </div>
              </TableHead>
              
              {/* Visit Time Information */}
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("checkIn")}
              >
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span className="uppercase text-xs font-medium text-gray-500">{t("time") || "Time"}</span>
                  {(sortField === "checkIn" || sortField === "checkOut") && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Actions */}
              <TableHead className="text-right">
                <span className="uppercase text-xs font-medium text-gray-500">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                  <TableRow key={`${visitor.id}-${visit.id}`}>
                    {/* Checkbox */}
                    <TableCell className="py-4">
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
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-primary/10">
                          <AvatarFallback className="text-primary font-medium">
                            {getInitials(visitor.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900">{visitor.fullName}</div>
                          <div className="flex space-x-4 text-sm text-gray-500">
                            <span>{visitor.sex}</span>
                            <span>{formatYearWithAge(visitor.yearOfBirth, language)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Contact Information */}
                    <TableCell className="py-4">
                      <div className="flex flex-col text-sm">
                        {visitor.email ? (
                          <a href={`mailto:${visitor.email}`} className="text-blue-600 hover:underline truncate max-w-xs">
                            {visitor.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">{t("noEmail", { defaultValue: "No email" })}</span>
                        )}
                        {visitor.phoneNumber ? (
                          <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                        ) : (
                          <span className="text-gray-400 italic">{t("noPhoneProvided")}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Municipality */}
                    <TableCell className="py-4">
                      <div className="text-sm">
                        {visitor.municipality || t("notSpecified")}
                      </div>
                    </TableCell>
                    
                    {/* Badge ID */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-800">
                          {formatBadgeId(visitor.id)}
                        </span>
                        {visitor.verified && (
                          <span title={t("verifiedVisitor")} className="relative top-px">
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-1 px-2 py-0.5">
                              <span className="text-xs font-medium">{t("verified")}</span>
                              <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                            </Badge>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Visit Count */}
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center">
                        {visitor.visitCount !== undefined ? (
                          <div className="flex items-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <span className="font-medium">{visitor.visitCount}</span>
                            </Badge>
                            {visitor.visitCount > 10 && (
                              <span className="ml-1.5">
                                <Badge className="px-1.5 py-0 bg-green-100 hover:bg-green-200 text-green-700 border-green-200">
                                  <span className="text-xs font-medium">{language === 'fr' ? 'Régulier' : 'Regular'}</span>
                                </Badge>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Partner */}
                    <TableCell className="py-4">
                      <div className="flex items-center">
                        {visit.partnerId ? (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            <span className="font-medium">
                              {/* Look for the partner in the full visitHistory array, not just paginatedVisits */}
                              {(() => {
                                // Find the partner visit and visitor
                                const partnerVisit = visitHistory.find(item => item.visit.id === visit.partnerId);
                                
                                if (partnerVisit) {
                                  return partnerVisit.visitor.fullName;
                                } else {
                                  // If partner not found in current visitHistory, try to display badge ID
                                  const partnerId = visit.partnerId || 0;
                                  return `Visitor #${formatBadgeId(partnerId)}`;
                                }
                              })()}
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-gray-400 italic">{t("noPartner", { defaultValue: "No partner" })}</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Visit Time */}
                    <TableCell className="py-4">
                      <div className="flex items-start space-x-6">
                        <div>
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="font-medium">{formatTimeOnly(visit.checkInTime, language)}</span>
                          </div>
                          <div className="text-xs text-gray-500 ml-4">{formatDate(visit.checkInTime, language).split(",")[0]}</div>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                            <span className="font-medium">
                              {visit.checkOutTime 
                                ? formatTimeOnly(visit.checkOutTime, language)
                                : "--:--"
                              }
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {visit.checkOutTime 
                              ? formatDate(visit.checkOutTime, language).split(",")[0]
                              : "--"
                            }
                          </div>
                        </div>
                        <div className="text-sm rounded-full px-3 py-1 bg-gray-100 text-gray-800">
                          {visit.checkOutTime 
                            ? formatDuration(visit.checkInTime, visit.checkOutTime, language)
                            : "--"
                          }
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 flex items-center h-8"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setSelectedVisit(visit);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span>{t("view", { defaultValue: "View" })}</span>
                        </Button>
                        
                        {/* Partner button no longer needed as it's in the Edit modal */}
                        
                        {showDeletedVisitors && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              restoreVisitorMutation.mutate(visitor.id);
                            }}
                          >
                            <ArchiveRestore className="h-4 w-4 mr-1" />
                            {t("restore", { defaultValue: "Restore" })}
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
      <div className="flex justify-between items-center my-4 px-4">
        <div className="flex items-center space-x-2">
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setPage(1); // Reset to first page when changing items per page
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">items per page</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page > 1 ? page - 1 : 1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Previous Page</span>
            <ChevronUp className="h-4 w-4 rotate-90" />
          </Button>
          
          <span className="text-sm text-gray-700">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Next Page</span>
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editVisitorInformation", { defaultValue: "Edit Visitor Information" })}</DialogTitle>
            <DialogDescription>
              {t("updateVisitorDetails", { defaultValue: "Update visitor details. Click save when you're done." })}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fullName")}</FormLabel>
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
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sex")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculin">Masculin</SelectItem>
                          <SelectItem value="Feminin">Feminin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="yearOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("yearOfBirth")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || field.value)}
                        />
                      </FormControl>
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
                    <FormLabel>{t("municipality")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectMunicipality")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {KINSHASA_MUNICIPALITIES.map((municipality) => (
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>{t("optional", { defaultValue: "Optional" })}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phoneNumber")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0xxxxxxxx" 
                        {...field}
                        onChange={(e) => {
                          // Get value without any leading zero
                          let value = e.target.value.replace(/^0+/, '');
                          
                          // If the value doesn't start with a + (international format)
                          // and it's not empty, add a leading zero
                          if (value && !value.startsWith('+')) {
                            value = '0' + value;
                          }
                          
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Only show Partner field for active visits */}
              {selectedVisit?.active && (
                <FormField
                  control={form.control}
                  name="partnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("partner", { defaultValue: "Partner" })}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectPartner", { defaultValue: "Select a partner" })} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <SelectItem value="">{t("noPartner", { defaultValue: "No partner" })}</SelectItem>
                          {visitHistory
                            .filter(item => (
                              // Filter for active visits that are not the current visit
                              item.visit.id !== selectedVisit?.id && 
                              item.visit.active &&
                              // Only include visitors without partners or those already paired with this visitor
                              (!item.visit.partnerId || item.visit.partnerId === selectedVisit?.id)
                            ))
                            .map(({ visitor, visit }) => (
                              <SelectItem key={visit.id} value={String(visit.id)}>
                                {visitor.fullName} ({formatBadgeId(visitor.id)})
                              </SelectItem>
                            ))}
                          
                          {/* If the current partner is not in the filtered list (e.g., not active), still show it as an option */}
                          {selectedVisit?.partnerId && 
                           !visitHistory.some(item => 
                             item.visit.id === selectedVisit.partnerId && 
                             (item.visit.active && 
                              (item.visit.id === selectedVisit.partnerId || !item.visit.partnerId))
                           ) && (
                            <SelectItem key={selectedVisit.partnerId} value={String(selectedVisit.partnerId)}>
                              {visitHistory.find(item => item.visit.id === selectedVisit.partnerId)?.visitor.fullName || 
                               `Visitor #${formatBadgeId(selectedVisit.partnerId)}`} ({t("currentPartner", { defaultValue: "Current Partner" })})
                            </SelectItem>
                          )}
                          {visitHistory.filter(item => 
                            item.visit.id !== selectedVisit?.id && 
                            item.visit.active &&
                            (!item.visit.partnerId || item.visit.partnerId === selectedVisit?.id)
                          ).length === 0 && (
                            <div className="p-2 text-center text-gray-500 text-sm">
                              {t("noAvailablePartners", { defaultValue: "No available partners" })}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("partnerDescription", { defaultValue: "Link another active visitor who arrived together with this visitor" })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="mt-4">
                    {t("cancel", { defaultValue: "Cancel" })}
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  className="mt-4"
                  disabled={editVisitorMutation.isPending || setPartnerMutation.isPending}
                >
                  {(editVisitorMutation.isPending || setPartnerMutation.isPending) ? (
                    <span className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </div>
                      {t("saving", { defaultValue: "Saving..." })}
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        visitor={selectedVisitor || undefined}
        visit={selectedVisit || undefined}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={() => {
          setIsDetailModalOpen(false);
          setIsEditDialogOpen(true);
        }}
        onDelete={() => {
          setIsDetailModalOpen(false);
          if (selectedVisitor) {
            const confirm = window.confirm(`Are you sure you want to delete ${selectedVisitor.fullName}?`);
            if (confirm) {
              deleteVisitorMutation.mutate(selectedVisitor.id);
            }
          }
        }}
        showDeleteButton={true} // Show delete button for visit history
      />
      
      {/* Partner Selection Dialog */}
      <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("selectPartner", { defaultValue: "Select Partner" })}</DialogTitle>
            <DialogDescription>
              {selectedVisitForPartner && t("selectPartnerDescription", {
                firstName: selectedVisitForPartner.visitor.fullName.split(' ')[0],
                defaultValue: `Select the visitor you wish to associate with "${selectedVisitForPartner.visitor.fullName.split(' ')[0]}". Don't hesitate to ask the visitor questions if you're not sure.`
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedVisitForPartner && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder={t("searchForVisitor", { defaultValue: "Search for a visitor..." })}
                    className="pl-9"
                    value={partnerSearchTerm}
                    onChange={(e) => setPartnerSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                  {/* Use the full visits array instead of just paginated visits to show all possible partners */}
                  {visitHistory.filter(item => {
                    // Exclude the current visitor and any already paired visitors
                    const isNotCurrentAndNotPaired = 
                      item.visit.id !== selectedVisitForPartner.visit.id && 
                      !item.visit.partnerId && 
                      item.visit.active;
                    
                    // Apply search filter if there is a search term
                    if (!partnerSearchTerm) return isNotCurrentAndNotPaired;
                    
                    const normalizedSearchTerm = normalizeText(partnerSearchTerm);
                    return isNotCurrentAndNotPaired && (
                      normalizeText(item.visitor.fullName).includes(normalizedSearchTerm) ||
                      formatBadgeId(item.visitor.id).toLowerCase().includes(normalizedSearchTerm) ||
                      (item.visitor.phoneNumber && normalizeText(item.visitor.phoneNumber).includes(normalizedSearchTerm))
                    );
                  }).map(({ visitor, visit }) => (
                    <div 
                      key={visit.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectPartner(visit.id)}
                    >
                      <Avatar className="h-9 w-9 bg-primary/10">
                        <AvatarFallback className="text-primary font-medium">
                          {getInitials(visitor.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="font-medium">{visitor.fullName}</div>
                        <div className="text-sm text-gray-500">
                          {t("badgeColon", { defaultValue: "Badge:" })} {formatBadgeId(visitor.id)} | {t("timeColon", { defaultValue: "Time:" })} {formatTimeOnly(visit.checkInTime, language)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {visitHistory.filter(item => {
                    // Use the same filter logic as above for consistency
                    const isNotCurrentAndNotPaired = 
                      item.visit.id !== selectedVisitForPartner.visit.id && 
                      !item.visit.partnerId && 
                      item.visit.active;
                    
                    // Apply search filter if there is a search term
                    if (!partnerSearchTerm) return isNotCurrentAndNotPaired;
                    
                    const normalizedSearchTerm = normalizeText(partnerSearchTerm);
                    return isNotCurrentAndNotPaired && (
                      normalizeText(item.visitor.fullName).includes(normalizedSearchTerm) ||
                      formatBadgeId(item.visitor.id).toLowerCase().includes(normalizedSearchTerm) ||
                      (item.visitor.phoneNumber && normalizeText(item.visitor.phoneNumber).includes(normalizedSearchTerm))
                    );
                  }).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      {partnerSearchTerm ? 
                        t("noMatchingPartners", { defaultValue: "No matching partners found. Try a different search term." }) :
                        t("noAvailablePartners", { defaultValue: "No available partners found. All visitors are already paired or no other visitors are checked in." })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPartnerDialogOpen(false)}>
              {t("close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export a wrapper that includes error boundary
export function AdminVisitHistory(props: AdminVisitHistoryProps) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">An error occurred while loading the visit history. Please refresh the page and try again.</div>}>
      <AdminVisitHistoryComponent {...props} />
    </ErrorBoundary>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, Eye, ArchiveRestore, Clock, Calendar, CheckCircle, XCircle, ChevronUp, ChevronDown, SlidersHorizontal, Tag, ChevronRight, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback, Component } from "react";
import { DateRange } from "react-day-picker";
import { Visitor, Visit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInitials, formatYearWithAge, formatTimeOnly, formatDate, formatDuration, formatBadgeId, normalizeText } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { VisitorDetailModal } from "@/components/visitor-detail-modal";

import { PhoneNumberLink } from "@/components/phone-number-link";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter, DialogClose
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

// Proper error boundary implementation
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error in timeline component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AdminVisitTimelineProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Determine visit type based on data
const getVisitType = (visit: Visit): 'Ordinary' | 'Cancelled' | 'Short' | 'Extended' => {
  // If no checkout time, it's an ordinary visit (still active)
  if (!visit.checkOutTime) return 'Ordinary';
  
  // Calculate visit duration in minutes
  const checkIn = new Date(visit.checkInTime).getTime();
  const checkOut = new Date(visit.checkOutTime).getTime();
  const durationMinutes = Math.round((checkOut - checkIn) / (1000 * 60));
  
  if (durationMinutes <= 0) return 'Cancelled'; // Checked out immediately
  if (durationMinutes < 5) return 'Short'; // Very short visit
  if (durationMinutes > 120) return 'Extended'; // Long visit (over 2 hours)
  
  return 'Ordinary';
};

// Get color for visit type
const getVisitTypeColor = (type: 'Ordinary' | 'Cancelled' | 'Short' | 'Extended') => {
  switch (type) {
    case 'Ordinary': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Cancelled': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Short': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Extended': return 'bg-purple-100 text-purple-800 border-purple-200';
  }
};

// Map visit types to translation keys
const visitTypeTranslations = {
  'Ordinary': {
    en: 'Ordinary Visit',
    fr: 'Visite Ordinaire'
  },
  'Cancelled': {
    en: 'Cancelled Visit',
    fr: 'Visite Annulée'
  },
  'Short': {
    en: 'Short Visit',
    fr: 'Visite Courte'
  },
  'Extended': {
    en: 'Extended Visit',
    fr: 'Visite Prolongée'
  }
};

// Helper function to group visits by visitor
const groupVisitsByVisitor = (visitHistory: { visit: Visit; visitor: Visitor }[]) => {
  const visitorMap = new Map<number, { visitor: Visitor; visits: Visit[] }>();
  
  // Group visits by visitor
  visitHistory.forEach(({ visitor, visit }) => {
    if (!visitorMap.has(visitor.id)) {
      visitorMap.set(visitor.id, { visitor, visits: [] });
    }
    visitorMap.get(visitor.id)?.visits.push(visit);
  });
  
  // Sort visits for each visitor by check-in time (newest first)
  visitorMap.forEach(entry => {
    entry.visits.sort((a, b) => 
      new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
    );
  });
  
  return Array.from(visitorMap.values());
};

function AdminVisitTimelineComponent({ visitHistory, isLoading }: AdminVisitTimelineProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "lastVisit">("lastVisit");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  const [expandedVisitors, setExpandedVisitors] = useState<Set<number>>(new Set());
  const [visitorsNeedingMoreVisits, setVisitorsNeedingMoreVisits] = useState<Set<number>>(new Set());
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Maximum number of visits to show per visitor initially
  const INITIAL_VISITS_DISPLAY = 5;
  
  // Form schema for editing visitor
  const editVisitorSchema = z.object({
    id: z.number(),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
    sex: z.enum(["Masculin", "Feminin"], {
      errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
    }),
    municipality: z.string().min(1, {message: "Municipality selection is required"}),
    email: z.string().email("Invalid email format").nullable().optional(),
    phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
  });
  
  type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;
  
  // Edit form
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: selectedVisitor ? {
      id: selectedVisitor.id,
      fullName: selectedVisitor.fullName,
      yearOfBirth: selectedVisitor.yearOfBirth,
      sex: selectedVisitor.sex as "Masculin" | "Feminin",
      municipality: selectedVisitor.municipality || "",
      email: selectedVisitor.email,
      phoneNumber: selectedVisitor.phoneNumber
    } : undefined
  });
  
  // Update form values when selectedVisitor changes
  useEffect(() => {
    if (selectedVisitor) {
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
        phoneNumber: formattedPhoneNumber
      });
    }
  }, [selectedVisitor, form]);
  
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
        title: "Error",
        description: "Failed to update visitor: " + error.message,
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
        title: "Success",
        description: data.message || "Visitor deleted successfully",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete visitor: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Restore visitor mutation
  const restoreVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("POST", `/api/admin/restore-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Visitor restored successfully",
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
        title: "Error",
        description: "Failed to restore visitor: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: EditVisitorFormValues) => {
    editVisitorMutation.mutate(data);
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
        title: "Success",
        description: `Visitor ${verified ? "verified" : "unverified"} successfully`,
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update verification status: " + error.message,
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

  const toggleExpand = (visitorId: number) => {
    setExpandedVisitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitorId)) {
        newSet.delete(visitorId);
      } else {
        newSet.add(visitorId);
      }
      return newSet;
    });
  };

  const loadMoreVisits = (visitorId: number) => {
    setVisitorsNeedingMoreVisits(prev => {
      const newSet = new Set(prev);
      newSet.add(visitorId);
      return newSet;
    });
    
    // This would typically fetch more visits from the API
    // For now, we'll just update the state to show all visits for this visitor
    toast({
      title: "Loading more visits",
      description: "Additional visits have been loaded for this visitor.",
    });
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading visit history...</div>;
  }

  if (visitHistory.length === 0) {
    return <div className="py-4 text-center">No visit history available.</div>;
  }

  // Group visits by visitor
  const groupedVisitors = groupVisitsByVisitor(visitHistory);
  
  // Filter visitors based on search term, status, and date range
  const filteredVisitors = groupedVisitors.filter(({ visitor, visits }) => {
    try {
      // Ensure visitor and visits exist - defensive programming
      if (!visitor || !visits.length) {
        return false;
      }
      
      // Generate badge ID for searching
      const badgeId = formatBadgeId(visitor.id).toLowerCase();
      const normalizedSearchTerm = normalizeText(searchTerm);
      
      const matchesSearch = searchTerm === '' || 
        normalizeText(visitor.fullName).includes(normalizedSearchTerm) ||
        (visitor.email && normalizeText(visitor.email).includes(normalizedSearchTerm)) ||
        normalizeText(visitor.phoneNumber).includes(normalizedSearchTerm) ||
        badgeId.includes(normalizedSearchTerm) ||
        // Search across any of the visit dates
        visits.some(visit => normalizeText(formatDate(visit.checkInTime, language)).includes(normalizedSearchTerm));
      
      // Check if any visit matches the status filter
      const matchesStatus = 
        filterStatus === "all" ||
        (filterStatus === "active" && visits.some(visit => visit.active)) ||
        (filterStatus === "completed" && visits.some(visit => !visit.active));
      
      // Check if any visit date is within selected date range
      let matchesDateRange = true;
      if (dateRange && dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          
          matchesDateRange = visits.some(visit => {
            const visitDate = new Date(visit.checkInTime);
            return visitDate >= fromDate && visitDate <= toDate;
          });
        } else {
          // If only from date is selected, match the exact day
          const nextDay = new Date(fromDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          matchesDateRange = visits.some(visit => {
            const visitDate = new Date(visit.checkInTime);
            return visitDate >= fromDate && visitDate < nextDay;
          });
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
  
  // Sort the filtered visitors
  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    // Add defensive checks to prevent errors with null/undefined values
    if (!a || !b || !a.visitor || !b.visitor || !a.visits.length || !b.visits.length) {
      return 0;
    }

    let comparison = 0;
    
    try {
      switch (sortField) {
        case "name":
          comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
          break;
        case "lastVisit":
          // Sort based on most recent visit for each visitor
          const aTime = new Date(a.visits[0].checkInTime).getTime();
          const bTime = new Date(b.visits[0].checkInTime).getTime();
          comparison = aTime - bTime;
          break;
      }
    } catch (error) {
      console.error("Error during sorting:", error);
      return 0;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedVisitors.length / itemsPerPage);
  const paginatedVisitors = sortedVisitors.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "lastVisit") => {
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
              placeholder={t("searchByNameBadgePhoneEmail")}
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
            {t("filters")}
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
                    title: "Information",
                    description: "The trash bin is empty.",
                  });
                  // Don't show trash bin if empty
                  setShowDeletedVisitors(false);
                } else {
                  setShowDeletedVisitors(true);
                }
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to check trash bin status",
                  variant: "destructive",
                });
                // Make sure we don't show trash bin on error
                setShowDeletedVisitors(false);
              }
            }}
            className={showDeletedVisitors ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {showDeletedVisitors ? t("showingTrashBin") : t("showTrashBin")}
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-4 p-4 border rounded-md shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium block">{t("status")}</label>
                <Select value={filterStatus} onValueChange={(value: "all" | "active" | "completed") => setFilterStatus(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="active">{t("active")}</SelectItem>
                    <SelectItem value="completed">{t("completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium block">{t("dateRange")}</label>
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
                    {t("clearDates")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Selected count */}
        <div className="text-sm text-gray-500 mt-2">
          {t("showing")} {paginatedVisitors.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, sortedVisitors.length)} {t("of")} {sortedVisitors.length}
          {showDeletedVisitors ? ` (${t("trashBin")})` : ""}
          {selectedVisitors?.length > 0 ? ` • ${selectedVisitors.length} ${t("selected")}` : ""}
        </div>
        
        {/* Bulk actions */}
        {selectedVisitors.length > 0 && !showDeletedVisitors && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(t("confirmDeleteSelected", { count: selectedVisitors.length }))) {
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
                        description: t("visitorsDeleted", { count: selectedVisitors.length }),
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
              {t("deleteSelected")} ({selectedVisitors.length})
            </Button>
          </div>
        )}
      </div>

      {/* Timeline View */}
      <div className="border rounded-md shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 font-medium text-gray-600 text-sm border-b">
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={(paginatedVisitors?.length || 0) > 0 && (selectedVisitors?.length || 0) === (paginatedVisitors?.length || 0)}
              onCheckedChange={(checked: boolean) => {
                try {
                  if ((selectedVisitors?.length || 0) === (paginatedVisitors?.length || 0)) {
                    setSelectedVisitors([]);
                  } else if (paginatedVisitors && paginatedVisitors.length > 0) {
                    // Make sure we have a valid visitor.id for every item
                    const validIds = paginatedVisitors
                      .filter(item => item && item.visitor && typeof item.visitor.id === 'number')
                      .map(item => item.visitor.id);
                    setSelectedVisitors(validIds);
                  }
                } catch (error) {
                  console.error("Error toggling select all visitors:", error);
                }
              }}
            />
          </div>
          <div 
            className="col-span-4 uppercase text-xs font-medium cursor-pointer flex items-center"
            onClick={() => handleSortChange("name")}
          >
            {t("visiteur")}
            {sortField === "name" && (
              sortDirection === "asc" ? 
              <ChevronUp className="ml-1 h-4 w-4" /> : 
              <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </div>
          <div className="col-span-3 uppercase text-xs font-medium">
            {t("badge")}
          </div>
          <div 
            className="col-span-3 uppercase text-xs font-medium cursor-pointer flex items-center"
            onClick={() => handleSortChange("lastVisit")}
          >
            {t("dernièreVisite")}
            {sortField === "lastVisit" && (
              sortDirection === "asc" ? 
              <ChevronUp className="ml-1 h-4 w-4" /> : 
              <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </div>
          <div className="col-span-1 uppercase text-xs font-medium text-right">
            {t("actions")}
          </div>
        </div>

        {/* Visitor Rows */}
        {paginatedVisitors.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            {showDeletedVisitors 
              ? t("trashBinEmpty") 
              : t("noVisitsMatchSearch")}
          </div>
        ) : (
          <div className="divide-y">
            {paginatedVisitors.map(({ visitor, visits }) => {
              // Safety check
              if (!visitor || !visits.length) return null;
              
              // Get the most recent visit
              const mostRecentVisit = visits[0];
              const isExpanded = expandedVisitors.has(visitor.id);
              const needMoreVisits = visitorsNeedingMoreVisits.has(visitor.id);
              
              // Determine how many visits to show
              const visitsToShow = needMoreVisits ? visits : visits.slice(0, INITIAL_VISITS_DISPLAY);
              const hasMoreVisits = !needMoreVisits && visits.length > INITIAL_VISITS_DISPLAY;
              
              return (
                <div key={visitor.id} className="border-b last:border-b-0">
                  {/* Main Visitor Row */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 items-center">
                    <div className="col-span-1">
                      <Checkbox
                        checked={selectedVisitors.includes(visitor.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVisitors([...selectedVisitors, visitor.id]);
                          } else {
                            setSelectedVisitors(selectedVisitors.filter(id => id !== visitor.id));
                          }
                        }}
                      />
                    </div>
                    
                    <div className="col-span-4 flex items-center gap-3">
                      <button 
                        onClick={() => toggleExpand(visitor.id)}
                        className="flex items-center justify-center h-5 w-5 rounded-full border border-gray-300 hover:bg-gray-100"
                      >
                        {isExpanded ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                        }
                      </button>
                      
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
                        <div className="flex flex-col text-sm mt-1">
                          {visitor.email && (
                            <a href={`mailto:${visitor.email}`} className="text-blue-600 hover:underline truncate max-w-xs">
                              {visitor.email}
                            </a>
                          )}
                          {visitor.phoneNumber && (
                            <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-3">
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
                      <div className="mt-1 text-sm">
                        {t("municipality")}: {visitor.municipality || t("notSpecified")}
                      </div>
                    </div>
                    
                    <div className="col-span-3">
                      <div className="flex items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="font-medium">{formatTimeOnly(mostRecentVisit.checkInTime, language)}</span>
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {formatDate(mostRecentVisit.checkInTime, language).split(",")[0]}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                            <span className="font-medium">
                              {mostRecentVisit.checkOutTime 
                                ? formatTimeOnly(mostRecentVisit.checkOutTime, language)
                                : "--:--"
                              }
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {mostRecentVisit.checkOutTime 
                              ? formatDate(mostRecentVisit.checkOutTime, language).split(",")[0]
                              : "--"
                            }
                          </div>
                        </div>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm inline-flex rounded-full px-2 py-0.5 bg-gray-100 text-gray-800">
                          {mostRecentVisit.checkOutTime 
                            ? formatDuration(mostRecentVisit.checkInTime, mostRecentVisit.checkOutTime, language)
                            : t("stillActive")
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-span-1 flex justify-end">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-blue-600 hover:bg-blue-50 border-blue-200"
                          onClick={() => {
                            setSelectedVisitor(visitor);
                            setSelectedVisit(mostRecentVisit);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span>{t("view")}</span>
                        </Button>
                        
                        {showDeletedVisitors && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-blue-600 hover:bg-blue-50 border-blue-200"
                            onClick={() => {
                              restoreVisitorMutation.mutate(visitor.id);
                            }}
                          >
                            <ArchiveRestore className="h-4 w-4 mr-1" />
                            {t("restore")}
                          </Button>
                        )}
                        
                        {!showDeletedVisitors && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              if (window.confirm(t("confirmDeleteVisitor", { name: visitor.fullName }))) {
                                deleteVisitorMutation.mutate(visitor.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Visit Timeline (Expanded) */}
                  {isExpanded && (
                    <div className="bg-gray-50 px-4 py-3 border-t">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {t("historiqueDesVisites")}
                      </div>
                      <div className="ml-10 pl-6 border-l-2 border-gray-300 pb-2 relative">
                        {visitsToShow.map((visit, index) => {
                          const visitType = getVisitType(visit);
                          const visitTypeColor = getVisitTypeColor(visitType);
                          const isLastShown = index === visitsToShow.length - 1 && !hasMoreVisits;
                          const visitDate = new Date(visit.checkInTime);
                          
                          // Format date for display
                          const formattedDate = formatDate(visit.checkInTime, language).split(",")[0];
                          
                          return (
                            <div key={visit.id} className="mb-4 relative">
                              {/* Timeline dot */}
                              <div className="absolute -left-[14px] mt-1.5 h-5 w-5 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-white"></div>
                              </div>
                              
                              {/* Date heading */}
                              {(index === 0 || 
                                new Date(visits[index-1].checkInTime).toDateString() !== visitDate.toDateString()) && (
                                <div className="font-medium text-sm text-gray-900 mb-1">
                                  {formattedDate}
                                </div>
                              )}
                              
                              {/* Visit card */}
                              <div className="bg-white rounded-md border shadow-sm p-3 ml-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm text-gray-800">
                                        {formatTimeOnly(visit.checkInTime, language)} - {visit.checkOutTime ? formatTimeOnly(visit.checkOutTime, language) : "--:--"}
                                      </span>
                                      <Badge className={`${visitTypeColor} text-xs`}>
                                        {language === 'en' ? visitTypeTranslations[visitType].en : visitTypeTranslations[visitType].fr}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <Tag className="h-3.5 w-3.5" />
                                        <span>{formatBadgeId(visitor.id)}</span>
                                      </div>
                                      
                                      {visit.checkOutTime && (
                                        <div>
                                          <span>{formatDuration(visit.checkInTime, visit.checkOutTime, language)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-blue-600 hover:bg-blue-50 border-blue-200"
                                    onClick={() => {
                                      setSelectedVisitor(visitor);
                                      setSelectedVisit(visit);
                                      setIsDetailModalOpen(true);
                                    }}
                                  >
                                    <Info className="h-3.5 w-3.5 mr-1" />
                                    {t("details")}
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Continue line to next item if not the last visit */}
                              {!isLastShown && (
                                <div className="absolute -left-[14px] top-8 bottom-0 w-0.5 bg-gray-300"></div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* "Load More" button for visitors with more visits */}
                        {hasMoreVisits && (
                          <div className="mt-2 mb-4 relative">
                            <Button
                              variant="outline"
                              className="w-full bg-white text-blue-600 hover:bg-blue-50 border-blue-200"
                              onClick={() => loadMoreVisits(visitor.id)}
                            >
                              <ChevronDown className="h-4 w-4 mr-2" />
                              {t("loadMoreVisits", { count: visits.length - INITIAL_VISITS_DISPLAY })}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">{t("visitorPerPage")}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page > 1 ? page - 1 : 1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">{t("previousPage")}</span>
            <ChevronUp className="h-4 w-4 rotate-90" />
          </Button>
          
          <span className="text-sm text-gray-700">
            {t("page")} {page} {t("of")} {Math.max(1, totalPages)}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">{t("nextPage")}</span>
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editVisitorInformation")}</DialogTitle>
            <DialogDescription>
              {t("updateVisitorDetails")}
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
                            <SelectValue placeholder={t("selectSex")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculin">{t("male")}</SelectItem>
                          <SelectItem value="Feminin">{t("female")}</SelectItem>
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
                        <Input type="number" {...field} value={field.value || ""} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
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
                      <SelectContent>
                        <SelectItem value="Bandalungwa">{t("Bandalungwa")}</SelectItem>
                        <SelectItem value="Barumbu">{t("Barumbu")}</SelectItem>
                        <SelectItem value="Bumbu">{t("Bumbu")}</SelectItem>
                        <SelectItem value="Gombe">{t("Gombe")}</SelectItem>
                        <SelectItem value="Kalamu">{t("Kalamu")}</SelectItem>
                        <SelectItem value="Kasa-Vubu">{t("Kasa-Vubu")}</SelectItem>
                        <SelectItem value="Kimbanseke">{t("Kimbanseke")}</SelectItem>
                        <SelectItem value="Kinshasa">{t("Kinshasa")}</SelectItem>
                        <SelectItem value="Kintambo">{t("Kintambo")}</SelectItem>
                        <SelectItem value="Kisenso">{t("Kisenso")}</SelectItem>
                        <SelectItem value="Lemba">{t("Lemba")}</SelectItem>
                        <SelectItem value="Limete">{t("Limete")}</SelectItem>
                        <SelectItem value="Lingwala">{t("Lingwala")}</SelectItem>
                        <SelectItem value="Makala">{t("Makala")}</SelectItem>
                        <SelectItem value="Maluku">{t("Maluku")}</SelectItem>
                        <SelectItem value="Masina">{t("Masina")}</SelectItem>
                        <SelectItem value="Matete">{t("Matete")}</SelectItem>
                        <SelectItem value="Mont-Ngafula">{t("Mont-Ngafula")}</SelectItem>
                        <SelectItem value="Ndjili">{t("Ndjili")}</SelectItem>
                        <SelectItem value="Ngaba">{t("Ngaba")}</SelectItem>
                        <SelectItem value="Ngaliema">{t("Ngaliema")}</SelectItem>
                        <SelectItem value="Ngiri-Ngiri">{t("Ngiri-Ngiri")}</SelectItem>
                        <SelectItem value="Nsele">{t("Nsele")}</SelectItem>
                        <SelectItem value="Selembao">{t("Selembao")}</SelectItem>
                        <SelectItem value="Other">{t("other")}</SelectItem>
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
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
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
              
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="mt-4">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  className="mt-4"
                  disabled={editVisitorMutation.isPending}
                >
                  {editVisitorMutation.isPending ? (
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
                      {t("saving")}
                    </span>
                  ) : (
                    t("saveChanges")
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
            const confirm = window.confirm(t("confirmDeleteVisitor", { name: selectedVisitor.fullName }));
            if (confirm) {
              deleteVisitorMutation.mutate(selectedVisitor.id);
            }
          }
        }}
        showDeleteButton={true} // Show delete button for visit history
      />
    </div>
  );
}

// Export a wrapper that includes error boundary
export function AdminVisitTimeline(props: AdminVisitTimelineProps) {
  return (
    <ErrorBoundary 
      fallback={
        <div className="p-4 m-4 border rounded-md bg-red-50 text-red-800 shadow-sm">
          <p className="text-center font-medium">An error occurred while loading the visit history.</p>
          <p className="text-center mt-2">Please refresh the page and try again.</p>
        </div>
      }
    >
      <AdminVisitTimelineComponent {...props} />
    </ErrorBoundary>
  );
}
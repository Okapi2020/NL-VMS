import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Visit, Visitor } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/date-range-picker";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Eye, 
  Trash2, 
  Pencil, 
  ArchiveRestore,
  Users,
  Mail,
  User,
  Tag
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { KINSHASA_MUNICIPALITIES } from "@/data/municipalities";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId, formatYearWithAge, normalizeText, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Component props
type VisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

function VisitHistoryTable({ visitHistory, isLoading }: VisitHistoryProps) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Checkbox selection state
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting state
  const [sortField, setSortField] = useState<"name" | "checkIn" | "municipality" | "badge" | "visitCount">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
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
  
  // Restore visitor mutation
  const restoreVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("POST", `/api/admin/restore-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: t("visitorRestored", { defaultValue: "Visitor restored successfully" }),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
    },
    onError: (error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToRestoreVisitor", { defaultValue: "Failed to restore visitor" }) + ": " + error.message,
        variant: "destructive",
      });
    }
  });
  
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
    partnerId: z.number().nullable().optional(),
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
  
  // Update form values when selectedVisitor changes
  useEffect(() => {
    if (selectedVisitor && selectedVisit) {
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
      setEditDialogOpen(false);
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
  
  const onSubmit = (data: EditVisitorFormValues) => {
    editVisitorMutation.mutate(data);
  };
  
  if (isLoading) {
    return <div className="py-4 text-center">{t("loadingVisitHistory", { defaultValue: "Loading visit history..." })}</div>;
  }
  
  if (visitHistory.length === 0) {
    return <div className="py-4 text-center">{t("noVisitHistoryAvailable", { defaultValue: "No visit history available." })}</div>;
  }
  
  // Filter visits based on search, status, and date range
  const filteredVisits = visitHistory.filter(item => {
    if (!item || !item.visitor || !item.visit) return false;
    
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
  });

  // Sort the filtered visits
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    // Add defensive checks to prevent errors with null/undefined values
    if (!a || !b || !a.visitor || !b.visitor || !a.visit || !b.visit) {
      return 0;
    }

    let comparison = 0;
    
    switch (sortField) {
      case "name":
        comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
        break;
      case "municipality":
        const aMunicipality = a.visitor.municipality || "";
        const bMunicipality = b.visitor.municipality || "";
        comparison = aMunicipality.localeCompare(bMunicipality);
        break;
      case "badge":
        comparison = a.visitor.id - b.visitor.id;
        break;
      case "checkIn":
        comparison = new Date(a.visit.checkInTime).getTime() - new Date(b.visit.checkInTime).getTime();
        break;
      case "visitCount":
        const aCount = a.visitor.visitCount || 0;
        const bCount = b.visitor.visitCount || 0;
        comparison = aCount - bCount;
        break;
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
  
  const handleSortChange = (field: "name" | "checkIn" | "municipality" | "badge" | "visitCount") => {
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
      <div className="p-4">
        <div className="flex flex-col md:flex-row gap-2 justify-between">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <Input 
              type="text" 
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("searchVisitHistoryPlaceholder", { defaultValue: "Search by name, badge, phone, email, date..." })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              className="flex items-center bg-white border rounded-md px-3 py-2 text-gray-600 hover:bg-gray-50"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              <span className="ml-2 text-sm">{t("filters", { defaultValue: "Filters" })}</span>
            </Button>
            <Button 
              className={cn(
                "flex items-center border rounded-md px-3 py-2",
                showDeletedVisitors 
                  ? "bg-amber-500 text-white hover:bg-amber-600" 
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
              variant={showDeletedVisitors ? "default" : "outline"}
              onClick={async () => {
                if (showDeletedVisitors) {
                  setShowDeletedVisitors(false);
                  setSelectedVisitors([]);
                  setPage(1);
                  return;
                }
                
                try {
                  const res = await apiRequest("GET", "/api/admin/trash");
                  const deletedVisitors = await res.json();
                  
                  if (deletedVisitors.length === 0) {
                    toast({
                      title: t("information", { defaultValue: "Information" }),
                      description: t("trashBinEmpty", { defaultValue: "The trash bin is empty." }),
                    });
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
                  setShowDeletedVisitors(false);
                }
              }}
            >
              <Trash2 size={16} />
              <span className="ml-2 text-sm">
                {showDeletedVisitors 
                  ? t("showingTrashBin", { defaultValue: "Showing Trash Bin" }) 
                  : t("showTrashBin", { defaultValue: "Trash Bin" })}
              </span>
            </Button>
          </div>
        </div>
        
        <div className="px-4 mt-2 text-sm text-gray-500">
          {t("showingResults", { 
            start: paginatedVisits.length > 0 ? (page - 1) * itemsPerPage + 1 : 0, 
            end: Math.min(page * itemsPerPage, sortedVisits.length), 
            total: sortedVisits.length,
            defaultValue: "Showing {{start}} - {{end}} of {{total}}"
          })}
          {showDeletedVisitors ? " " + t("trashBinLabel", { defaultValue: "(Trash Bin)" }) : ""}
          {selectedVisitors?.length > 0 ? ` • ${selectedVisitors.length} ${t("selected", { defaultValue: "selected" })}` : ""}
        </div>
        
        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-4 border rounded-md shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium block">{t("status", { defaultValue: "Status" })}</label>
                <Select 
                  value={filterStatus} 
                  onValueChange={(value: "all" | "active" | "completed") => setFilterStatus(value)}
                >
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
                    {t("clearDates", { defaultValue: "Clear dates" })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Bulk action buttons */}
        {selectedVisitors.length > 0 && !showDeletedVisitors && (
          <div className="mt-3">
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
                        title: t("success", { defaultValue: "Success" }),
                        description: t("visitorsDeleted", { count: selectedVisitors.length, defaultValue: `Successfully deleted ${selectedVisitors.length} visitors` }),
                      });
                      setSelectedVisitors([]);
                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                    })
                    .catch(error => {
                      toast({
                        title: t("error", { defaultValue: "Error" }),
                        description: `${t("failedToDeleteVisitors", { defaultValue: "Failed to delete visitors" })}: ${error.message}`,
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Checkbox
                  checked={paginatedVisits.length > 0 && selectedVisitors.length === paginatedVisits.length}
                  onCheckedChange={(checked) => {
                    if (paginatedVisits.length === selectedVisitors.length) {
                      setSelectedVisitors([]);
                    } else {
                      const validIds = paginatedVisits
                        .filter(item => item && item.visitor && typeof item.visitor.id === 'number')
                        .map(item => item.visitor.id);
                      setSelectedVisitors(validIds);
                    }
                  }}
                />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange("name")}
              >
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  <span>{t("visitor", { defaultValue: "Visitor" })}</span>
                  {sortField === "name" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  <span>{t("contact", { defaultValue: "Contact" })}</span>
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange("municipality")}
              >
                <div className="flex items-center">
                  <span>{t("municipality", { defaultValue: "Municipality" })}</span>
                  {sortField === "municipality" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange("badge")}
              >
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  <span>{t("badge", { defaultValue: "Badge" })}</span>
                  {sortField === "badge" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{t("partner", { defaultValue: "Partner" })}</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("actions", { defaultValue: "Actions" })}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedVisits.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  {showDeletedVisitors 
                    ? t("trashBinEmpty", { defaultValue: "Trash bin is empty" })
                    : t("noVisitsMatchFilters", { defaultValue: "No visits match your search or filters" })}
                </td>
              </tr>
            ) : (
              paginatedVisits.map(({ visitor, visit }) => {
                if (!visitor || !visit) return null;
                
                return (
                  <tr key={`${visitor.id}-${visit.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedVisitors?.includes(visitor.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVisitors(prev => [...prev, visitor.id]);
                          } else {
                            setSelectedVisitors(prev => prev.filter(id => id !== visitor.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {getInitials(visitor.fullName)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {visitor.sex} {formatYearWithAge(visitor.yearOfBirth, language)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visitor.municipality || t("notSpecified", { defaultValue: "Not specified" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-100 text-blue-800">
                        {formatBadgeId(visitor.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {visitor.visitCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {visit.partnerId ? (
                        (() => {
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => {
                          setSelectedVisitor(visitor);
                          setSelectedVisit(visit);
                          setDetailsDialogOpen(true);
                        }} className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                          setSelectedVisitor(visitor);
                          setSelectedVisit(visit);
                          setEditDialogOpen(true);
                        }} className="text-blue-600 hover:text-blue-900">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {showDeletedVisitors ? (
                          <button 
                            onClick={() => restoreVisitorMutation.mutate(visitor.id)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (window.confirm(t("confirmDeleteVisitor", { defaultValue: "Are you sure you want to delete this visitor?" }))) {
                                deleteVisitorMutation.mutate(visitor.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
              <SelectTrigger className="h-8 w-20 text-sm">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10 {t("items", { defaultValue: "items" })}</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <span className="px-3 text-sm text-gray-700">
              {t("pageXofY", { x: page, y: totalPages || 1, defaultValue: "Page {{x}} of {{y}}" })}
            </span>
            
            <button 
              className={`h-8 w-8 p-0 rounded-md flex items-center justify-center ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button 
              className={`h-8 w-8 p-0 rounded-md flex items-center justify-center ${page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* View Details Modal */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xl">
                    {getInitials(selectedVisitor.fullName)}
                  </div>
                  
                  <div>
                    <h4 className="text-xl font-medium">{selectedVisitor.fullName}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline" className="bg-slate-50">
                        {selectedVisitor.sex}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-50">
                        {formatYearWithAge(selectedVisitor.yearOfBirth, language)}
                      </Badge>
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
                      {selectedVisitor.phoneNumber ? (
                        <PhoneNumberLink phoneNumber={selectedVisitor.phoneNumber} className="font-medium" />
                      ) : (
                        <span className="text-gray-500 italic">{t("noPhoneProvided", { defaultValue: "No phone provided" })}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
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
                        <div className="flex items-center gap-3 p-3 border rounded-md bg-blue-50/30">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {getInitials(partnerVisit.visitor.fullName)}
                          </div>
                          
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
              onClick={() => setDetailsDialogOpen(false)}
            >
              {t("close", { defaultValue: "Close" })}
            </Button>
            
            <Button
              onClick={() => {
                setDetailsDialogOpen(false);
                // Use setTimeout to ensure the first modal is properly closed
                setTimeout(() => {
                  if (selectedVisitor && selectedVisit) {
                    setEditDialogOpen(true);
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editVisitor", { defaultValue: "Edit Visitor" })}</DialogTitle>
            <DialogDescription>
              {t("editVisitorDescription", { defaultValue: "Update visitor information" })}
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
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
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
    </div>
  );
}

// Wrapper with error boundary
export function AdminVisitHistory(props: VisitHistoryProps) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">An error occurred while loading the visit history. Please refresh the page and try again.</div>}>
      <VisitHistoryTable {...props} />
    </ErrorBoundary>
  );
}
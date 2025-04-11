import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Visitor } from "@shared/schema";
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
  Tag,
  Database,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatTimeOnly, formatBadgeId, formatYearWithAge, normalizeText, getInitials } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import EditVisitorForm from "./edit-visitor-form";

type VisitorWithDetails = {
  visitor: Visitor;
  visitCount: number;
  lastVisit: {
    checkInTime: string;
    checkOutTime: string | null;
  } | null;
};

interface AllVisitorsProps {
  isLoading?: boolean;
}

interface VisitorDetailsDialogProps {
  visitor: Visitor | null;
  visitCount: number;
  lastVisit: {
    checkInTime: string;
    checkOutTime: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

function VisitorDetailsDialog({ visitor, visitCount, lastVisit, isOpen, onClose }: VisitorDetailsDialogProps) {
  const { t, language } = useLanguage();
  
  if (!visitor) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("visitorDetails", { defaultValue: "Visitor Details" })}</DialogTitle>
          <DialogDescription>
            {t("visitorDetailsDescription", { defaultValue: "View complete information about this visitor" })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {getInitials(visitor.fullName)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{visitor.fullName}</h3>
                <p className="text-sm text-gray-500">
                  {visitor.yearOfBirth ? formatYearWithAge(visitor.yearOfBirth) : t("ageNotProvided", { defaultValue: "Age not provided" })}
                </p>
                <p className="text-sm text-gray-500">{visitor.sex || t("sexNotSpecified", { defaultValue: "Sex not specified" })}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">{t("contactInformation", { defaultValue: "Contact Information" })}</h4>
              <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                <Mail className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{visitor.email || t("noEmail", { defaultValue: "No email provided" })}</p>
              </div>
              <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                <User className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{visitor.phoneNumber || t("noPhone", { defaultValue: "No phone provided" })}</p>
              </div>
              <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                <Users className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{visitor.municipality || t("valueNotSpecified", { defaultValue: "Not specified" })}</p>
              </div>
              <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                <Tag className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{formatBadgeId(visitor.badgeId)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-gray-500">{t("visitCount", { defaultValue: "Visit Count" })}</p>
                <p className="text-2xl font-bold">{visitCount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-gray-500">{t("createdDate", { defaultValue: "Created Date" })}</p>
                <p className="text-md font-bold">{formatDate(visitor.createdAt, language)}</p>
              </div>
            </div>
            
            {lastVisit && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{t("lastVisit", { defaultValue: "Last Visit" })}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t("checkInTime", { defaultValue: "Check-in Time" })}</p>
                    <div className="flex items-baseline">
                      <p className="font-medium">{formatTimeOnly(lastVisit.checkInTime, language)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(lastVisit.checkInTime, language)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">{t("checkOutTime", { defaultValue: "Check-out Time" })}</p>
                    {lastVisit.checkOutTime ? (
                      <>
                        <div className="flex items-baseline">
                          <p className="font-medium">{formatTimeOnly(lastVisit.checkOutTime, language)}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(lastVisit.checkOutTime, language)}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-amber-600">{t("stillActive", { defaultValue: "Still active" })}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AllVisitors({ isLoading = false }: AllVisitorsProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<{ min: string, max: string }>({ min: "", max: "" });
  const [municipality, setMunicipality] = useState<string>("all");
  const [filterVisitorType, setFilterVisitorType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Dialog state
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithDetails | null>(null);
  const [isVisitorDetailsOpen, setIsVisitorDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState<Visitor | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [visitorToEdit, setVisitorToEdit] = useState<Visitor | null>(null);
  
  // Get all registered visitors
  const {
    data: allVisitorsData = [] as VisitorWithDetails[],
    isLoading: isLoadingVisitors,
    refetch: refetchAllVisitors
  } = useQuery<VisitorWithDetails[]>({
    queryKey: ["/api/admin/all-visitors"],
  });
  
  // Filter visitors based on search term and filters
  const filteredVisitors = allVisitorsData.filter(({ visitor }) => {
    // Search filter
    const normalizedSearchTerm = normalizeText(searchTerm.toLowerCase());
    const matchesSearch = normalizedSearchTerm === "" || 
      normalizeText(visitor.fullName.toLowerCase()).includes(normalizedSearchTerm) ||
      (visitor.email && normalizeText(visitor.email.toLowerCase()).includes(normalizedSearchTerm)) ||
      (visitor.phoneNumber && visitor.phoneNumber.includes(searchTerm)) ||
      (visitor.badgeId && formatBadgeId(visitor.badgeId).toLowerCase().includes(normalizedSearchTerm));
      
    if (!matchesSearch) return false;
    
    // Municipality filter
    if (municipality !== "all" && visitor.municipality !== municipality) {
      return false;
    }
    
    // Age range filter
    const currentYear = new Date().getFullYear();
    const minAge = ageRange.min !== "" ? parseInt(ageRange.min) : 0;
    const maxAge = ageRange.max !== "" ? parseInt(ageRange.max) : 150;
    
    if (visitor.yearOfBirth) {
      const age = currentYear - visitor.yearOfBirth;
      if (age < minAge || age > maxAge) {
        return false;
      }
    }
    
    // Visitor type filter (based on visit count)
    const visitCount = allVisitorsData.find(v => v.visitor.id === visitor.id)?.visitCount || 0;
    if (filterVisitorType === "first-time" && visitCount !== 1) {
      return false;
    } else if (filterVisitorType === "regular" && (visitCount < 2 || visitCount > 9)) {
      return false;
    } else if (filterVisitorType === "frequent" && visitCount < 10) {
      return false;
    }
    
    // Date range filter for registration date
    if (dateRange?.from) {
      const createdDate = new Date(visitor.createdAt);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (createdDate < fromDate) {
        return false;
      }
    }
    
    if (dateRange?.to) {
      const createdDate = new Date(visitor.createdAt);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      if (createdDate > toDate) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort visitors
  const [sortField, setSortField] = useState<"name" | "createdAt" | "municipality" | "badge" | "visitCount">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "name") {
      comparison = a.visitor.name.localeCompare(b.visitor.name);
    } else if (sortField === "createdAt") {
      comparison = new Date(a.visitor.createdAt).getTime() - new Date(b.visitor.createdAt).getTime();
    } else if (sortField === "municipality") {
      const munA = a.visitor.municipality || "";
      const munB = b.visitor.municipality || "";
      comparison = munA.localeCompare(munB);
    } else if (sortField === "badge") {
      const badgeA = a.visitor.badgeId || 0;
      const badgeB = b.visitor.badgeId || 0;
      comparison = badgeA - badgeB;
    } else if (sortField === "visitCount") {
      comparison = a.visitCount - b.visitCount;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Get paginated visitors
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedVisitors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedVisitors.length / itemsPerPage);
  
  // Delete visitor mutation
  const { mutate: deleteVisitor } = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/delete-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("success", { defaultValue: "Success" }),
        description: data.message || t("visitorDeleted", { defaultValue: "Visitor deleted successfully" }),
      });
      
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error", { defaultValue: "Error" }),
        description: t("failedToDeleteVisitor", { defaultValue: "Failed to delete visitor" }) + ": " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSortChange = (field: "name" | "createdAt" | "municipality" | "badge" | "visitCount") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  const clearFilters = () => {
    setSearchTerm("");
    setMunicipality("all");
    setAgeRange({ min: "", max: "" });
    setFilterVisitorType("all");
    setDateRange(undefined);
  };
  
  const uniqueMunicipalities = [
    ...new Set(allVisitorsData.map(({ visitor }) => visitor.municipality).filter(Boolean))
  ].sort();
  
  // Function to view visitor details
  const viewVisitorDetails = (visitorData: VisitorWithDetails) => {
    setSelectedVisitor(visitorData);
    setIsVisitorDetailsOpen(true);
  };
  
  // Function to edit visitor
  const editVisitor = (visitor: Visitor) => {
    setVisitorToEdit(visitor);
    setIsEditDialogOpen(true);
  };
  
  // Function to delete visitor
  const confirmDeleteVisitor = (visitor: Visitor) => {
    setVisitorToDelete(visitor);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteVisitor = () => {
    if (visitorToDelete) {
      deleteVisitor(visitorToDelete.id);
      setIsDeleteDialogOpen(false);
      setVisitorToDelete(null);
    }
  };
  
  const handleBulkDelete = () => {
    if (selectedVisitors.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };
  
  const executeBulkDelete = () => {
    if (selectedVisitors.length > 0) {
      setIsProcessingBulk(true);
      setIsBulkDeleteDialogOpen(false);
      
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
          queryClient.invalidateQueries({ queryKey: ["/api/admin/all-visitors"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        })
        .catch(error => {
          toast({
            title: t("error", { defaultValue: "Error" }),
            description: `Failed to delete visitors: ${error.message}`,
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsProcessingBulk(false);
        });
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVisitors(currentItems.map(item => item.visitor.id));
    } else {
      setSelectedVisitors([]);
    }
  };
  
  const handleSelectVisitor = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedVisitors([...selectedVisitors, id]);
    } else {
      setSelectedVisitors(selectedVisitors.filter(visitorId => visitorId !== id));
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Input
            placeholder={t("searchVisitors", { defaultValue: "Search visitors..." })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {t("filters", { defaultValue: "Filters" })}
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {selectedVisitors.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isProcessingBulk}
            >
              {isProcessingBulk ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {t("deleteSelected", { defaultValue: "Delete Selected" })} ({selectedVisitors.length})
            </Button>
          )}
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-muted/40 p-4 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium block">{t("municipality", { defaultValue: "Municipality" })}</Label>
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={t("all", { defaultValue: "All municipalities" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all", { defaultValue: "All municipalities" })}</SelectItem>
                  {uniqueMunicipalities.map((mun) => (
                    <SelectItem key={mun} value={mun}>
                      {mun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium block">{t("visitorType", { defaultValue: "Visitor Type" })}</Label>
              <Select value={filterVisitorType} onValueChange={setFilterVisitorType}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={t("allVisitors", { defaultValue: "All visitors" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allVisitors", { defaultValue: "All visitors" })}</SelectItem>
                  <SelectItem value="first-time">{t("firstTimeVisitors", { defaultValue: "First-time visitors" })}</SelectItem>
                  <SelectItem value="regular">{t("regularVisitors", { defaultValue: "Regular visitors (2-9 visits)" })}</SelectItem>
                  <SelectItem value="frequent">{t("frequentVisitors", { defaultValue: "Frequent visitors (10+ visits)" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium block">{t("ageRange", { defaultValue: "Age Range" })}</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t("min", { defaultValue: "Min" })}</Label>
                  <Input
                    type="number"
                    placeholder="18"
                    value={ageRange.min}
                    onChange={(e) => setAgeRange({ ...ageRange, min: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t("max", { defaultValue: "Max" })}</Label>
                  <Input
                    type="number"
                    placeholder="99"
                    value={ageRange.max}
                    onChange={(e) => setAgeRange({ ...ageRange, max: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium block">{t("dateRange", { defaultValue: "Date Range" })}</Label>
              <DateRangePicker 
                date={dateRange} 
                onSelect={setDateRange} 
                className="mt-1" 
                align="start"
                calendarLabel={t("selectDateRange", { defaultValue: "Select date range" })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
            >
              {t("clearFilters", { defaultValue: "Clear Filters" })}
            </Button>
          </div>
        </div>
      )}
      
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap w-[48px]">
                  <Checkbox 
                    checked={currentItems.length > 0 && selectedVisitors.length === currentItems.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer"
                  onClick={() => handleSortChange("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t("visitor", { defaultValue: "Visitor" })}</span>
                    {sortField === "name" && (
                      sortDirection === "asc" ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">{t("contact", { defaultValue: "Contact" })}</th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer"
                  onClick={() => handleSortChange("badge")}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t("badge", { defaultValue: "Badge" })}</span>
                    {sortField === "badge" && (
                      sortDirection === "asc" ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer"
                  onClick={() => handleSortChange("municipality")}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t("location", { defaultValue: "Location" })}</span>
                    {sortField === "municipality" && (
                      sortDirection === "asc" ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer"
                  onClick={() => handleSortChange("visitCount")}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t("visits", { defaultValue: "Visits" })}</span>
                    {sortField === "visitCount" && (
                      sortDirection === "asc" ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer"
                  onClick={() => handleSortChange("createdAt")}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t("registeredOn", { defaultValue: "Registered On" })}</span>
                    {sortField === "createdAt" && (
                      sortDirection === "asc" ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">{t("actionsColumn", { defaultValue: "Actions" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoadingVisitors || isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-12" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : currentItems.length > 0 ? (
                currentItems.map(({ visitor, visitCount, lastVisit }) => (
                  <tr key={visitor.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Checkbox 
                        checked={selectedVisitors.includes(visitor.id)}
                        onCheckedChange={(checked) => handleSelectVisitor(visitor.id, !!checked)}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium">{visitor.name}</div>
                      {visitor.yearOfBirth && (
                        <div className="text-xs text-gray-500">
                          {formatYearWithAge(visitor.yearOfBirth)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {visitor.email || (
                          <span className="text-gray-400">{t("noEmail", { defaultValue: "No email" })}</span>
                        )}
                      </div>
                      <div className="text-sm">
                        {visitor.phoneNumber || (
                          <span className="text-gray-400">{t("noPhone", { defaultValue: "No phone" })}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant="outline">{formatBadgeId(visitor.badgeId)}</Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {visitor.municipality || <span className="text-gray-400">{t("valueNotSpecified", { defaultValue: "Not specified" })}</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {visitCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {formatDate(visitor.createdAt, language)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewVisitorDetails({ visitor, visitCount, lastVisit })}
                          title={t("viewDetails", { defaultValue: "View details" })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editVisitor(visitor)}
                          title={t("editVisitorButton", { defaultValue: "Edit visitor" })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDeleteVisitor(visitor)}
                          title={t("deleteVisitor", { defaultValue: "Delete visitor" })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || showFilters 
                      ? t("noVisitorsMatchFilters", { defaultValue: "No visitors match your search or filters" })
                      : t("noVisitorsRegistered", { defaultValue: "No visitors registered in the system" })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoadingVisitors && !isLoading && filteredVisitors.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 border-t">
            <div className="flex items-center mb-3 sm:mb-0">
              <p className="text-sm text-gray-500 mr-3">
                {t("showingResults", { 
                  start: indexOfFirstItem + 1, 
                  end: Math.min(indexOfLastItem, filteredVisitors.length), 
                  total: filteredVisitors.length,
                  defaultValue: `Showing ${indexOfFirstItem + 1} - ${Math.min(indexOfLastItem, filteredVisitors.length)} of ${filteredVisitors.length}`
                })}
              </p>
              <Select 
                value={String(itemsPerPage)} 
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {t("visitorPerPage", { defaultValue: "visitors per page" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                title={t("previousPage", { defaultValue: "Previous page" })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm">
                {t("pageXofY", { 
                  current: currentPage, 
                  total: totalPages,
                  defaultValue: `Page ${currentPage} of ${totalPages}` 
                })}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                title={t("nextPage", { defaultValue: "Next page" })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Visitor details dialog */}
      {selectedVisitor && (
        <VisitorDetailsDialog
          visitor={selectedVisitor.visitor}
          visitCount={selectedVisitor.visitCount}
          lastVisit={selectedVisitor.lastVisit}
          isOpen={isVisitorDetailsOpen}
          onClose={() => setIsVisitorDetailsOpen(false)}
        />
      )}
      
      {/* Edit visitor dialog */}
      {visitorToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editVisitorInformation", { defaultValue: "Edit Visitor Information" })}</DialogTitle>
              <DialogDescription>
                {t("updateVisitorDetails", { defaultValue: "Update the visitor's personal information and contact details." })}
              </DialogDescription>
            </DialogHeader>
            
            <EditVisitorForm
              visitor={visitorToEdit}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                refetchAllVisitors();
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteVisitor", { defaultValue: "Delete Visitor" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {visitorToDelete && t("confirmDeleteVisitorDialog", { 
                name: visitorToDelete.name,
                defaultValue: `Are you sure you want to delete ${visitorToDelete.name}?` 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelButton", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVisitor} className="bg-red-600 hover:bg-red-700">
              {t("deleteVisitor", { defaultValue: "Delete Visitor" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSelectedVisitors", { defaultValue: "Delete Selected Visitors" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteSelectedVisitors", {
                count: selectedVisitors.length,
                defaultValue: `Are you sure you want to delete ${selectedVisitors.length} selected visitors?`
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelButton", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkDelete} className="bg-red-600 hover:bg-red-700">
              {t("deleteSelectedVisitors", { defaultValue: "Delete Selected Visitors" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AllVisitors;
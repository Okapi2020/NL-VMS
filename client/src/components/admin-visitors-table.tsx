import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Bell,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  LogOut,
  UserPlus,
  Filter,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Repeat,
  Users,
  Clock,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { KINSHASA_MUNICIPALITIES } from "@/lib/constants";
import { formatTimeOnly, formatDateOnly, formatDateTime } from "@/lib/date-utils";
import { PhoneNumberLink } from "@/components/phone-number-link";

// Types for the data
type Visit = {
  id: number;
  visitorId: number;
  checkInTime: Date;
  checkOutTime: Date | null;
  purpose: string;
  partnerId: number | null;
};

type Visitor = {
  id: number;
  fullName: string;
  yearOfBirth: number;
  sex: string;
  email: string | null;
  phoneNumber: string;
  municipality: string | null;
  verified: boolean;
  deleted: boolean;
  visitCount: number;
  createdAt: Date;
};

type AdminVisitorsTableProps = {
  visits: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Form validation schema
const editVisitorSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  yearOfBirth: z.number().min(1900).max(new Date().getFullYear()),
  sex: z.string().min(1, { message: "Sex is required" }),
  municipality: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  phoneNumber: z.string().min(10, { message: "Valid phone number is required" }),
});

type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;

function AdminVisitorsTableComponent({ visits, isLoading }: AdminVisitorsTableProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  
  // State for table functionality
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [filteredVisits, setFilteredVisits] = useState<{ visit: Visit; visitor: Visitor }[]>(visits);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State for dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState<{ visitor: Visitor, visit: Visit } | null>(null);
  const [selectedVisitForPartner, setSelectedVisitForPartner] = useState<{ visitor: Visitor, visit: Visit } | null>(null);
  
  // Form for editing visitors
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: new Date().getFullYear() - 30,
      sex: "",
      municipality: null,
      email: "",
      phoneNumber: "",
    },
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const paginatedVisits = filteredVisits.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  
  // Check if all visitors on the current page are selected
  const headerChecked = paginatedVisits.length > 0 && 
    paginatedVisits.every(item => selectedVisitors.includes(item.visitor.id));
  
  // Update filtered visits when visits change
  useEffect(() => {
    applyFiltersAndSort();
  }, [visits, searchQuery, sortField, sortDirection]);
  
  // Helper functions
  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  const formatBadgeId = (id: number) => {
    return `VIS-${id.toString().padStart(4, "0")}`;
  };
  
  const calculateAge = (yearOfBirth: number) => {
    return new Date().getFullYear() - yearOfBirth;
  };
  
  const calculateDuration = (checkInTime: Date) => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
    }
  };
  
  const applyFiltersAndSort = () => {
    let result = [...visits];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(({ visitor, visit }) => {
        return (
          visitor.fullName.toLowerCase().includes(query) ||
          (visitor.email && visitor.email.toLowerCase().includes(query)) ||
          visitor.phoneNumber.includes(query) ||
          (visitor.municipality && visitor.municipality.toLowerCase().includes(query)) ||
          formatBadgeId(visitor.id).toLowerCase().includes(query)
        );
      });
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.visitor.fullName.localeCompare(b.visitor.fullName)
          : b.visitor.fullName.localeCompare(a.visitor.fullName);
      } else if (sortField === "municipality") {
        const municipalityA = a.visitor.municipality || "";
        const municipalityB = b.visitor.municipality || "";
        return sortDirection === "asc"
          ? municipalityA.localeCompare(municipalityB)
          : municipalityB.localeCompare(municipalityA);
      } else if (sortField === "badge") {
        return sortDirection === "asc"
          ? a.visitor.id - b.visitor.id
          : b.visitor.id - a.visitor.id;
      } else if (sortField === "visitCount") {
        const countA = a.visitor.visitCount || 0;
        const countB = b.visitor.visitCount || 0;
        return sortDirection === "asc" ? countA - countB : countB - countA;
      } else if (sortField === "checkIn") {
        const checkInA = new Date(a.visit.checkInTime).getTime();
        const checkInB = new Date(b.visit.checkInTime).getTime();
        return sortDirection === "asc" ? checkInA - checkInB : checkInB - checkInA;
      }
      return 0;
    });
    
    setFilteredVisits(result);
  };
  
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  const handleCheckOut = async (visitId: number) => {
    if (processingIds.has(visitId)) return;
    
    try {
      // Add to processing set
      setProcessingIds(new Set(processingIds.add(visitId)));
      
      // Check if this visit has a partner
      const visit = visits.find(item => item.visit.id === visitId)?.visit;
      const checkOutVisitIds = [visitId];
      
      if (visit?.partnerId) {
        // If partner exists, add to the checkOutVisitIds
        checkOutVisitIds.push(visit.partnerId);
      }
      
      // Check out all visits
      await Promise.all(
        checkOutVisitIds.map(id => 
          apiRequest("POST", "/api/admin/check-out-visitor", { visitId: id })
            .then(res => res.json())
        )
      );
      
      // Show success message
      toast({
        title: t("success"),
        description: checkOutVisitIds.length > 1 
          ? t("partnersCheckedOut", { defaultValue: "Visitor and partner checked out successfully" })
          : t("visitorCheckedOut", { defaultValue: "Visitor checked out successfully" }),
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (error) {
      toast({
        title: t("error"),
        description: `Failed to check out visitor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      processingIds.delete(visitId);
      setProcessingIds(new Set(processingIds));
    }
  };

  const handleHeaderCheckChange = (checked: boolean) => {
    if (checked) {
      setSelectedVisitors(paginatedVisits.map(item => item.visitor.id));
    } else {
      setSelectedVisitors([]);
    }
  };
  
  const handlePartnerDialog = (visitor: Visitor, visit: Visit) => {
    setSelectedVisitForPartner({ visitor, visit });
    setIsPartnerDialogOpen(true);
  };
  
  const handleOpenDetailModal = (visitor: Visitor, visit: Visit) => {
    setSelectedVisitDetails({ visitor, visit });
    setIsDetailDialogOpen(true);
  };
  
  const handleEditVisitor = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    
    // Format phone number with leading zero for local format display
    let formattedPhoneNumber = visitor.phoneNumber || '';
    
    // Clean up the phone number from any formatting
    const digitsOnly = formattedPhoneNumber.replace(/\D/g, '');
    
    // Apply local format with leading zero if not already present
    // and if not starting with country code
    if (digitsOnly && 
        !digitsOnly.startsWith('0') && 
        !digitsOnly.startsWith('243') &&
        !digitsOnly.startsWith('+243')) {
      formattedPhoneNumber = '0' + digitsOnly;
    } else if (digitsOnly.startsWith('243')) {
      // If it has country code without leading zero, format to local
      formattedPhoneNumber = '0' + digitsOnly.substring(3);
    } else if (digitsOnly.startsWith('+243')) {
      // If it has country code with plus, format to local
      formattedPhoneNumber = '0' + digitsOnly.substring(4);
    } else {
      // Keep original digits
      formattedPhoneNumber = digitsOnly;
    }
    
    form.reset({
      fullName: visitor.fullName,
      yearOfBirth: visitor.yearOfBirth,
      sex: visitor.sex,
      municipality: visitor.municipality,
      email: visitor.email || "",
      phoneNumber: formattedPhoneNumber,
    });
    setIsEditDialogOpen(true);
  };
  
  const onSubmit = (data: EditVisitorFormValues) => {
    if (!selectedVisitor) return;
    
    // Clone the data object to avoid modifying the original form data
    const formattedData = { ...data };
    
    // Clean and format phone number for international storage
    let phoneNumber = formattedData.phoneNumber || '';
    phoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digit characters
    
    // Format for storage: if starts with 0, replace with country code
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '243' + phoneNumber.substring(1);
    } else if (phoneNumber && !phoneNumber.startsWith('243') && !phoneNumber.startsWith('+243')) {
      // If no prefix, add country code
      phoneNumber = '243' + phoneNumber;
    }
    
    // Update the data with the formatted phone number
    formattedData.phoneNumber = phoneNumber;
    
    apiRequest("PATCH", `/api/admin/visitors/${selectedVisitor.id}`, formattedData)
      .then(res => {
        if (!res.ok) throw new Error("Failed to update visitor");
        return res.json();
      })
      .then(() => {
        toast({
          title: t("success"),
          description: t("visitorUpdated", { defaultValue: "Visitor information updated successfully" }),
        });
        setIsEditDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/visitors"] });
      })
      .catch(error => {
        toast({
          title: t("error"),
          description: `Failed to update visitor: ${error.message}`,
          variant: "destructive",
        });
      });
  };
  
  const handleAssignPartner = (partnerId: number | null) => {
    if (!selectedVisitForPartner) return;
    
    const visitId = selectedVisitForPartner.visit.id;
    
    apiRequest("POST", "/api/admin/assign-partner", { visitId, partnerId })
      .then(res => {
        if (!res.ok) throw new Error("Failed to assign partner");
        return res.json();
      })
      .then(() => {
        toast({
          title: t("success"),
          description: partnerId 
            ? t("partnerAssigned", { defaultValue: "Partner assigned successfully" })
            : t("partnerRemoved", { defaultValue: "Partner removed successfully" }),
        });
        setIsPartnerDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      })
      .catch(error => {
        toast({
          title: t("error"),
          description: `Failed to update partner: ${error.message}`,
          variant: "destructive",
        });
      });
  };
  
  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between px-4 pt-4">
        <div className="relative w-full sm:w-64 lg:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder={t("searchVisitors", { defaultValue: "Search visitors..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1.5"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <Filter className="h-4 w-4" />
          {t("filters", { defaultValue: "Filters" })}
          <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      
      {/* Filters panel */}
      {isFilterOpen && (
        <div className="border rounded-md mx-4 mt-2 p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Municipality Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("municipality", { defaultValue: "Municipality" })}</label>
              <Select
                onValueChange={(value) => {
                  // Apply municipality filter
                  let result = [...visits];
                  if (value !== "all") {
                    result = result.filter(({visitor}) => visitor.municipality === value);
                  }
                  setFilteredVisits(result);
                  setPage(1);
                }}
                defaultValue="all"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectMunicipality", { defaultValue: "Select municipality" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all", { defaultValue: "All municipalities" })}</SelectItem>
                  {KINSHASA_MUNICIPALITIES.map((municipality) => (
                    <SelectItem key={municipality} value={municipality}>
                      {municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("duration", { defaultValue: "Duration" })}</label>
              <Select
                onValueChange={(value) => {
                  // Apply duration filter
                  let result = [...visits];
                  const now = new Date();
                  
                  if (value === "lessThan30min") {
                    result = result.filter(({visit}) => {
                      const diffMs = now.getTime() - new Date(visit.checkInTime).getTime();
                      return diffMs < 30 * 60 * 1000; // Less than 30 minutes
                    });
                  } else if (value === "30minTo1hour") {
                    result = result.filter(({visit}) => {
                      const diffMs = now.getTime() - new Date(visit.checkInTime).getTime();
                      return diffMs >= 30 * 60 * 1000 && diffMs < 60 * 60 * 1000;
                    });
                  } else if (value === "1hourTo3hours") {
                    result = result.filter(({visit}) => {
                      const diffMs = now.getTime() - new Date(visit.checkInTime).getTime();
                      return diffMs >= 60 * 60 * 1000 && diffMs < 3 * 60 * 60 * 1000;
                    });
                  } else if (value === "moreThan3hours") {
                    result = result.filter(({visit}) => {
                      const diffMs = now.getTime() - new Date(visit.checkInTime).getTime();
                      return diffMs >= 3 * 60 * 60 * 1000;
                    });
                  }
                  
                  setFilteredVisits(result);
                  setPage(1);
                }}
                defaultValue="all"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectDuration", { defaultValue: "Select duration" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allDurations", { defaultValue: "All durations" })}</SelectItem>
                  <SelectItem value="lessThan30min">{t("lessThan30min", { defaultValue: "Less than 30 minutes" })}</SelectItem>
                  <SelectItem value="30minTo1hour">{t("30minTo1hour", { defaultValue: "30 minutes to 1 hour" })}</SelectItem>
                  <SelectItem value="1hourTo3hours">{t("1hourTo3hours", { defaultValue: "1 hour to 3 hours" })}</SelectItem>
                  <SelectItem value="moreThan3hours">{t("moreThan3hours", { defaultValue: "More than 3 hours" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Visit Count Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("visitorType", { defaultValue: "Visitor Type" })}</label>
              <Select
                onValueChange={(value) => {
                  // Apply visitor type filter
                  let result = [...visits];
                  if (value === "firstTime") {
                    result = result.filter(({visitor}) => visitor.visitCount === 1);
                  } else if (value === "regular") {
                    result = result.filter(({visitor}) => visitor.visitCount > 1 && visitor.visitCount < 10);
                  } else if (value === "frequent") {
                    result = result.filter(({visitor}) => visitor.visitCount >= 10);
                  }
                  
                  setFilteredVisits(result);
                  setPage(1);
                }}
                defaultValue="all"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectVisitorType", { defaultValue: "Select visitor type" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allVisitors", { defaultValue: "All visitors" })}</SelectItem>
                  <SelectItem value="firstTime">{t("firstTimeVisitors", { defaultValue: "First-time visitors" })}</SelectItem>
                  <SelectItem value="regular">{t("regularVisitors", { defaultValue: "Regular visitors (2-9 visits)" })}</SelectItem>
                  <SelectItem value="frequent">{t("frequentVisitors", { defaultValue: "Frequent visitors (10+ visits)" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Reset all filters
                setFilteredVisits(visits);
                setSearchQuery("");
                setPage(1);
              }}
            >
              {t("resetFilters", { defaultValue: "Reset Filters" })}
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setIsFilterOpen(false)}
            >
              {t("applyFilters", { defaultValue: "Apply Filters" })}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px] lg:min-w-[1100px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40px]">
                    <Checkbox
                      checked={headerChecked}
                      onCheckedChange={handleHeaderCheckChange}
                      aria-label={t("selectAll", { defaultValue: "Select all" })}
                    />
                  </th>
                  
                  {/* Visitor Information */}
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("name")}
                  >
                    <div className="flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      <span>{t("visitor", { defaultValue: "Visitor" })}</span>
                      {sortField === "name" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  
                  {/* Contact Information */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    <div className="flex items-center">
                      <Mail className="mr-1 h-4 w-4" />
                      <span>{t("contact", { defaultValue: "Contact" })}</span>
                    </div>
                  </th>
                  
                  {/* Municipality Column */}
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer"
                    onClick={() => handleSortChange("municipality")}
                  >
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      <span>{t("municipality", { defaultValue: "Municipality" })}</span>
                      {sortField === "municipality" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  
                  {/* Badge ID Column */}
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                  </th>
                  
                  {/* Visit Count Column */}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer"
                    onClick={() => handleSortChange("visitCount")}
                  >
                    <div className="flex items-center">
                      <Repeat className="mr-1 h-4 w-4" />
                      <span>{t("visits", { defaultValue: "Visits" })}</span>
                      {sortField === "visitCount" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  
                  {/* Partner Column */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      <span>{t("partner", { defaultValue: "Partner" })}</span>
                    </div>
                  </th>
                  
                  {/* Visit Time Information */}
                  <th 
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" 
                    onClick={() => handleSortChange("checkIn")}
                  >
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>{t("time", { defaultValue: "Time" })}</span>
                      {sortField === "checkIn" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="ml-1 h-4 w-4" /> : 
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  
                  {/* Actions */}
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end">
                      <Settings className="mr-1 h-4 w-4" />
                      <span>{t("actions", { defaultValue: "Actions" })}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedVisits.length > 0 ? (
                  paginatedVisits.map(({ visitor, visit }) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                      
                      {/* Visitor Information */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {getInitials(visitor.fullName)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                            <div className="text-sm text-gray-500">
                              {visitor.sex} {visitor.yearOfBirth} ({calculateAge(visitor.yearOfBirth)} ans)
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Contact Information */}
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-500">
                          {visitor.email ? (
                            <div>{visitor.email}</div>
                          ) : (
                            <div className="italic">{t("noEmail", { defaultValue: "No email provided" })}</div>
                          )}
                          {visitor.phoneNumber ? (
                            <div>
                              <PhoneNumberLink 
                                phoneNumber={visitor.phoneNumber} 
                                showWhatsAppIcon={true}
                              />
                            </div>
                          ) : (
                            <div className="italic">{t("noPhone", { defaultValue: "No phone provided" })}</div>
                          )}
                        </div>
                      </td>
                      
                      {/* Municipality */}
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm text-gray-500">
                          {visitor.municipality || t("valueNotSpecified", { defaultValue: "Not specified" })}
                        </div>
                      </td>
                      
                      {/* Badge ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-md bg-blue-100 text-blue-800">
                          {formatBadgeId(visitor.id)}
                        </span>
                      </td>
                      
                      {/* Visit Count */}
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {visitor.visitCount || 1}
                        </span>
                      </td>
                      
                      {/* Partner */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visit.partnerId ? (
                          <div className="flex items-center text-blue-600">
                            <span className="inline-block h-5 w-5 mr-1.5">
                              <User size={18} className="text-blue-600" />
                            </span>
                            <span className="text-sm font-medium" title={paginatedVisits.find(item => item.visit.id === visit.partnerId)?.visitor.fullName || ''}>
                              {paginatedVisits.find(item => item.visit.id === visit.partnerId)?.visitor.fullName || 
                                formatBadgeId(paginatedVisits.find(item => item.visit.id === visit.partnerId)?.visitor.id || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{t("noPartner", { defaultValue: "No partner" })}</span>
                        )}
                      </td>
                      
                      {/* Visit Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                          <div className="text-sm font-medium">{formatTimeOnly(visit.checkInTime, language)}</div>
                          <div className="text-sm text-gray-500 ml-2">{calculateDuration(visit.checkInTime)}</div>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        <div className="flex space-x-2 justify-end">
                          <button 
                            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                            onClick={() => handleOpenDetailModal(visitor, visit)}
                            title={t("view", { defaultValue: "View" })}
                          >
                            <Eye size={16} className="text-gray-500" />
                          </button>
                          
                          <button 
                            className="p-1 rounded-md text-green-600 hover:bg-green-100"
                            onClick={() => handleCheckOut(visit.id)}
                            disabled={processingIds.has(visit.id)}
                            title={t("checkOut", { defaultValue: "Check out" })}
                          >
                            {processingIds.has(visit.id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                            ) : (
                              <LogOut size={16} className="text-green-600" />
                            )}
                          </button>
                          
                          <button 
                            className="p-1 rounded-md text-purple-600 hover:bg-purple-100"
                            onClick={() => handlePartnerDialog(visitor, visit)}
                            title={t("partner", { defaultValue: "Partner" })}
                          >
                            <UserPlus size={16} className="text-purple-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      {isLoading 
                        ? t("loading", { defaultValue: "Loading..." })
                        : t("noVisitorsMatch", { defaultValue: "No visitors match your search criteria" })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Add mobile swipe indicator */}
        <div className="md:hidden text-xs text-center text-gray-500 pb-2 pt-1">
          <span>{t("swipeToSeeMore", { defaultValue: "← Swipe to see more →" })}</span>
        </div>
      </div>
      
      {/* Bulk actions and pagination controls */}
      <div className="flex flex-wrap justify-between items-center gap-2 mt-4 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {selectedVisitors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => {
                if (window.confirm(t("confirmCheckOutSelected", { count: selectedVisitors.length, defaultValue: `Are you sure you want to check out ${selectedVisitors.length} selected visitors?` }))) {
                  // Find visits for selected visitors
                  const selectedVisits = visits
                    .filter(({ visitor }) => selectedVisitors.includes(visitor.id))
                    .map(({ visit }) => visit.id);
                  
                  // Check out each visit
                  Promise.all(
                    selectedVisits.map(visitId => 
                      apiRequest("POST", "/api/admin/check-out-visitor", { visitId })
                        .then(res => res.json())
                    )
                  )
                    .then(() => {
                      toast({
                        title: t("success"),
                        description: t("visitorsCheckedOut", { count: selectedVisitors.length, defaultValue: `Successfully checked out ${selectedVisitors.length} visitors` }),
                      });
                      setSelectedVisitors([]);
                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                    })
                    .catch(error => {
                      toast({
                        title: t("error"),
                        description: `Failed to check out visitors: ${error.message}`,
                        variant: "destructive",
                      });
                    });
                }
              }}
            >
              <LogOut className="h-4 w-4 mr-1" />
              {t("checkOutSelected", { defaultValue: "Check Out Selected" })} ({selectedVisitors.length})
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder={`10 ${t("itemsPerPage")}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 {t("itemsPerPage", { defaultValue: "items per page" })}</SelectItem>
              <SelectItem value="20">20 {t("itemsPerPage", { defaultValue: "items per page" })}</SelectItem>
              <SelectItem value="30">30 {t("itemsPerPage", { defaultValue: "items per page" })}</SelectItem>
              <SelectItem value="50">50 {t("itemsPerPage", { defaultValue: "items per page" })}</SelectItem>
              <SelectItem value="100">100 {t("itemsPerPage", { defaultValue: "items per page" })}</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.max(1, (page || 1) - 1))}
              disabled={(page || 0) <= 1}
              className="h-9 w-9 rounded-r-none"
            >
              &lt;
            </Button>
            <div className="border-y px-3 flex items-center text-sm">
              <span className="text-gray-500">{t("page", { defaultValue: "Page" })} {page || 1} {t("of", { defaultValue: "of" })} {Math.max(1, totalPages || 1)}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.min((totalPages || 1), (page || 1) + 1))}
              disabled={(page || 0) >= (totalPages || 0) || (totalPages || 0) === 0}
              className="h-9 w-9 rounded-l-none"
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>
      
      {/* Edit Visitor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editVisitorInformation", { defaultValue: "Edit Visitor Information" })}</DialogTitle>
            <DialogDescription>
              {t("updateVisitorDetails", { defaultValue: "Update the visitor's personal information and contact details." })}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fullName", { defaultValue: "Full Name" })}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="yearOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("yearOfBirth", { defaultValue: "Year of Birth" })}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1980" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || new Date().getFullYear())}
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
              
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("municipality", { defaultValue: "Municipality" })}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectMunicipality", { defaultValue: "Select municipality" })} />
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
                    <FormLabel>{t("emailAddressOptional", { defaultValue: "Email Address (Optional)" })}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="john@example.com" 
                        type="email" 
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
                    <FormLabel>{t("phoneNumber", { defaultValue: "Phone Number" })}</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t("cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button type="submit">{t("saveChanges", { defaultValue: "Save Changes" })}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Partner Selection Dialog */}
      <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("selectPartner", { defaultValue: "Select a Partner" })}</DialogTitle>
            <DialogDescription>
              {t("partnerDescription", { defaultValue: "Link this visitor with another visitor who arrived together." })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current partner info if any */}
            {selectedVisitForPartner?.visit.partnerId && (
              <div className="flex items-center p-4 bg-blue-50 rounded-md text-blue-700">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium">{t("currentPartner", { defaultValue: "Current partner" })}: </span>
                  {visits.find(item => item.visit.id === selectedVisitForPartner?.visit.partnerId)?.visitor.fullName || 
                    formatBadgeId(visits.find(item => item.visit.id === selectedVisitForPartner?.visit.partnerId)?.visitor.id || 0)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 h-auto"
                  onClick={() => handleAssignPartner(null)}
                >
                  {t("remove", { defaultValue: "Remove" })}
                </Button>
              </div>
            )}
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {/* List of potential partners (all other current visitors) */}
              {visits
                .filter(({ visit }) => 
                  visit.id !== selectedVisitForPartner?.visit.id && 
                  visit.partnerId !== selectedVisitForPartner?.visit.id &&
                  !visit.partnerId
                )
                .map(({ visitor, visit }) => (
                  <div 
                    key={visit.id}
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer border"
                    onClick={() => handleAssignPartner(visit.id)}
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {getInitials(visitor.fullName)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium">{visitor.fullName}</div>
                      <div className="text-xs text-gray-500">
                        {formatBadgeId(visitor.id)} • {formatTimeOnly(visit.checkInTime, language)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {visits.filter(({ visit }) => 
                  visit.id !== selectedVisitForPartner?.visit.id && 
                  visit.partnerId !== selectedVisitForPartner?.visit.id &&
                  !visit.partnerId
                ).length === 0 && (
                  <div className="text-center p-4 text-gray-500 italic">
                    {t("noAvailablePartners", { defaultValue: "No available partners. All visitors are already paired or checked out." })}
                  </div>
                )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPartnerDialogOpen(false)}>{t("close", { defaultValue: "Close" })}</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Visitor Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("visitorDetails", { defaultValue: "Visitor Details" })}</DialogTitle>
          </DialogHeader>
          
          {selectedVisitDetails && (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-lg">
                    {getInitials(selectedVisitDetails.visitor.fullName)}
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">{selectedVisitDetails.visitor.fullName}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedVisitDetails.visitor.sex} • {calculateAge(selectedVisitDetails.visitor.yearOfBirth)} {t("yearsOld", { defaultValue: "years old" })}
                  </p>
                </div>
                <Badge className="ml-auto px-2 py-1" variant="outline">
                  {formatBadgeId(selectedVisitDetails.visitor.id)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("contact", { defaultValue: "Contact" })}</h4>
                  <p className="text-sm mt-1">
                    {selectedVisitDetails.visitor.email || t("noEmail", { defaultValue: "No email provided" })}
                  </p>
                  <p className="text-sm">
                    {selectedVisitDetails.visitor.phoneNumber ? (
                      <PhoneNumberLink 
                        phoneNumber={selectedVisitDetails.visitor.phoneNumber} 
                        showWhatsAppIcon={true}
                      />
                    ) : (
                      t("noPhone", { defaultValue: "No phone provided" })
                    )}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("location", { defaultValue: "Location" })}</h4>
                  <p className="text-sm mt-1">{selectedVisitDetails.visitor.municipality || t("valueNotSpecified", { defaultValue: "Not specified" })}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("checkInTime", { defaultValue: "Check-in Time" })}</h4>
                  <p className="text-sm mt-1">{formatDateTime(selectedVisitDetails.visit.checkInTime, language)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("visitPurpose", { defaultValue: "Visit Purpose" })}</h4>
                  <p className="text-sm mt-1">{selectedVisitDetails.visit.purpose || t("valueNotSpecified", { defaultValue: "Not specified" })}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("totalVisits", { defaultValue: "Total Visits" })}</h4>
                  <p className="text-sm mt-1">{selectedVisitDetails.visitor.visitCount || 1}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t("partner", { defaultValue: "Partner" })}</h4>
                  <p className="text-sm mt-1">
                    {selectedVisitDetails.visit.partnerId 
                      ? visits.find(item => item.visit.id === selectedVisitDetails.visit.partnerId)?.visitor.fullName || formatBadgeId(visits.find(item => item.visit.id === selectedVisitDetails.visit.partnerId)?.visitor.id || 0)
                      : t("noPartner", { defaultValue: "No partner" })}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    handleEditVisitor(selectedVisitDetails.visitor);
                  }}
                >
                  {t("edit", { defaultValue: "Edit Visitor" })}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => {
                    if (window.confirm(t("confirmCheckOut", { defaultValue: "Are you sure you want to check out this visitor?" }))) {
                      handleCheckOut(selectedVisitDetails.visit.id);
                      setIsDetailDialogOpen(false);
                    }
                  }}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  {t("checkOut", { defaultValue: "Check Out" })}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export
export type { AdminVisitorsTableProps };
export function AdminVisitorsTable(props: AdminVisitorsTableProps) {
  return <AdminVisitorsTableComponent {...props} />;
}
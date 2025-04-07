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
import { formatTimeOnly, formatDateShort, formatDuration, formatBadgeId, calculateAge, normalizeText } from "@/lib/utils";
import { Visit, Visitor, UpdateVisitor } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiRequestWithRetry, useGlobalErrorHandler } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { ErrorBoundary } from "@/components/error-boundary";
import { Loading, ButtonLoading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { VisitorDetailModal } from "./visitor-detail-modal";
import { 
  Search, 
  UserRound, 
  Clock, 
  CalendarClock, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  Phone, 
  ShieldCheck, 
  CheckCircle,
  Pencil, 
  Trash2,
  X,
  LogOut,
  Eye
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PhoneNumberLink } from "@/components/phone-number-link";

type AdminVisitorsTableProps = {
  visits: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Form schema for editing visitor
const editVisitorSchema = z.object({
  id: z.number(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
  sex: z.enum(["Masculin", "Feminin"], {
    errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
  }),
  email: z.string().email("Invalid email format").nullable().optional(),
  phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
});

type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;

// Wrap component with error boundary
function AdminVisitorsTableComponent({ visits, isLoading }: AdminVisitorsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleApiError } = useGlobalErrorHandler();
  const { t, language } = useLanguage();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search input by 300ms
  const [sortField, setSortField] = useState<"name" | "checkIn" | "duration">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoCheckoutProcessing, setIsAutoCheckoutProcessing] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState<{ visitor: Visitor, visit: Visit } | null>(null);

  const checkOutMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const res = await apiRequest("POST", "/api/admin/check-out-visitor", { visitId });
      return await res.json();
    },
    onMutate: (visitId) => {
      setProcessingIds(prev => new Set(prev).add(visitId));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: t("checkoutSuccess"),
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `Failed to check out visitor: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: (_, __, visitId) => {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitId);
        return newSet;
      });
    }
  });

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
        title: t("success"),
        description: verified ? t("visitorVerified") : t("visitorUnverified"),
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `Failed to update verification status: ${error.message}`,
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

  // Edit visitor mutation
  const editVisitorMutation = useMutation({
    mutationFn: async (visitorData: EditVisitorFormValues) => {
      const res = await apiRequest("PUT", "/api/admin/update-visitor", visitorData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("success"),
        description: t("visitorUpdated"),
      });
      // Close the dialog
      setIsEditDialogOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `Failed to update visitor: ${error.message}`,
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
        title: t("success"),
        description: data.message || t("visitorDeleted"),
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `Failed to delete visitor: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Auto-checkout all visitors mutation
  const autoCheckoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/auto-checkout");
      return await res.json();
    },
    onMutate: () => {
      setIsAutoCheckoutProcessing(true);
    },
    onSuccess: (data) => {
      toast({
        title: t("success"),
        description: data.message || `Successfully checked out ${data.count} visitors`,
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: `Failed to auto-checkout visitors: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsAutoCheckoutProcessing(false);
    }
  });

  // Handle opening visitor detail modal
  const handleOpenDetailModal = (visitor: Visitor, visit: Visit) => {
    setSelectedVisitDetails({ visitor, visit });
    setIsDetailModalOpen(true);
  };
  
  // Handle edit visitor
  const handleEditVisitor = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsEditDialogOpen(true);
  };
  
  // Handle delete visitor
  const handleDeleteVisitor = (visitorId: number, fullName: string) => {
    if (confirm(t("confirmDeleteVisitor", { name: fullName }))) {
      deleteVisitorMutation.mutate(visitorId);
    }
  };
  
  // Edit form
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: selectedVisitor ? {
      id: selectedVisitor.id,
      fullName: selectedVisitor.fullName,
      yearOfBirth: selectedVisitor.yearOfBirth,
      sex: selectedVisitor.sex as "Masculin" | "Feminin",
      email: selectedVisitor.email,
      phoneNumber: selectedVisitor.phoneNumber
    } : undefined
  });
  
  // Update form values when selectedVisitor changes
  useEffect(() => {
    if (selectedVisitor) {
      form.reset({
        id: selectedVisitor.id,
        fullName: selectedVisitor.fullName,
        yearOfBirth: selectedVisitor.yearOfBirth,
        sex: selectedVisitor.sex as "Masculin" | "Feminin",
        email: selectedVisitor.email,
        phoneNumber: selectedVisitor.phoneNumber
      });
    }
  }, [selectedVisitor, form]);
  
  const onSubmit = (data: EditVisitorFormValues) => {
    editVisitorMutation.mutate(data);
  };
  
  const handleCheckOut = (visitId: number) => {
    if (confirm(t("confirmCheckout"))) {
      checkOutMutation.mutate(visitId);
    }
  };

  // Calculate visit duration
  const calculateDuration = (checkInTime: Date | string): string => {
    const startTime = new Date(checkInTime).getTime();
    const currentTime = new Date().getTime();
    const durationMs = currentTime - startTime;
    
    // Convert to minutes
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    return `${minutes} min`;
  };

  // Handle sort change
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "checkIn" | "duration") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading current visitors...</div>;
  }

  if (visits.length === 0) {
    return <div className="py-4 text-center">No visitors currently checked in.</div>;
  }

  // Filter visits based on search term (using debounced search term for better performance)
  const filteredVisits = visits.filter(({ visitor }) => {
    if (!debouncedSearchTerm) return true;
    
    // Generate badge ID for searching
    const badgeId = formatBadgeId(visitor.id).toLowerCase();
    const normalizedSearchTerm = normalizeText(debouncedSearchTerm);
    
    return (
      normalizeText(visitor.fullName).includes(normalizedSearchTerm) ||
      (visitor.email && normalizeText(visitor.email).includes(normalizedSearchTerm)) ||
      normalizeText(visitor.phoneNumber).includes(normalizedSearchTerm) ||
      badgeId.includes(normalizedSearchTerm)
    );
  });

  // Sort the filtered visits
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "name":
        comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
        break;
      case "checkIn":
        comparison = new Date(a.visit.checkInTime).getTime() - new Date(b.visit.checkInTime).getTime();
        break;
      case "duration":
        const aDuration = new Date().getTime() - new Date(a.visit.checkInTime).getTime();
        const bDuration = new Date().getTime() - new Date(b.visit.checkInTime).getTime();
        comparison = aDuration - bDuration;
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedVisits.length / itemsPerPage);
  const paginatedVisits = sortedVisits.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Safely show loading state
  if (isLoading) {
    return <Loading text={t("loadingCurrentVisitors")} />;
  }

  // Safely show empty state
  if (visits.length === 0) {
    return (
      <div className="py-6 text-center">
        <div className="text-gray-500 mb-2">{t("noVisitorsCurrentlyCheckedIn")}</div>
        <div className="text-sm text-gray-400">{t("whenVisitorsCheckIn")}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder={t("searchByNameBadgePhoneEmail")}
            className="w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Auto-checkout button */}
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="text-sm text-gray-500">
          {t("showing")} {paginatedVisits.length} {t("of")} {sortedVisits.length} {t("activeVisitors")}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => {
            if (confirm(t("confirmAutoCheckout", { defaultValue: "Are you sure you want to check out all active visitors?" }))) {
              autoCheckoutMutation.mutate();
            }
          }}
          disabled={isAutoCheckoutProcessing || visits.length === 0}
        >
          {isAutoCheckoutProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {t("processing", { defaultValue: "Processing..." })}
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              {t("checkOutAll", { defaultValue: "Check Out All Visitors" })}
            </>
          )}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-md shadow-sm">
        <Table className="w-full min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={paginatedVisits.length > 0 && selectedVisitors.length === paginatedVisits.length}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) {
                      setSelectedVisitors(paginatedVisits.map(item => item.visitor.id));
                    } else {
                      setSelectedVisitors([]);
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
                  <span className="uppercase text-xs font-medium text-gray-500">{t("visiteur")}</span>
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
                  <span className="uppercase text-xs font-medium text-gray-500">{t("contact")}</span>
                </div>
              </TableHead>
              
              {/* Badge ID Column */}
              <TableHead>
                <div className="flex items-center">
                  <Tag className="mr-1 h-4 w-4" />
                  <span className="uppercase text-xs font-medium text-gray-500">{t("badge")}</span>
                </div>
              </TableHead>
              
              {/* Visit Time Information */}
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("checkIn")}
              >
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span className="uppercase text-xs font-medium text-gray-500">{t("visite")}</span>
                  {sortField === "checkIn" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              
              {/* Actions */}
              <TableHead className="text-right">
                <span className="uppercase text-xs font-medium text-gray-500">{t("actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVisits.length > 0 ? (
              paginatedVisits.map(({ visitor, visit }) => (
                <TableRow key={visit.id}>
                  <TableCell className="py-2">
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
                  </TableCell>
                  
                  {/* Visitor Information */}
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{visitor.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {visitor.sex} {visitor.yearOfBirth} ({calculateAge(visitor.yearOfBirth)} {language === 'fr' ? 'ans' : 'yrs'})
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Contact Information */}
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="text-sm text-gray-600">{visitor.email || t("noEmailProvided")}</div>
                      <div className="text-sm">
                        {visitor.phoneNumber ? (
                          <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                        ) : (
                          t("noPhoneProvided")
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Badge ID */}
                  <TableCell>
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
                  
                  {/* Visit Time */}
                  <TableCell>
                    <div className="flex items-center">
                      <span className="inline-flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                        <span className="font-medium">{formatTimeOnly(visit.checkInTime, language)}</span>
                      </span>
                      <div className="ml-3 text-sm text-gray-500 font-medium">
                        {calculateDuration(visit.checkInTime)}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell>
                    <div className="flex justify-end space-x-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 flex items-center h-8"
                        onClick={() => handleOpenDetailModal(visitor, visit)}
                        title={t("viewVisitor")}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span>{t("view")}</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckOut(visit.id)}
                        disabled={processingIds.has(visit.id)}
                        className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                      >
                        {processingIds.has(visit.id) ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-1" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-1" />
                        )}
                        <span>{processingIds.has(visit.id) ? t("processing") : t("checkOut")}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4 text-gray-500">
                  {t("noVisitorsMatch")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Bulk actions and pagination controls */}
      <div className="flex flex-wrap justify-between items-center gap-2 mt-4 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {selectedVisitors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(t("confirmDeleteSelected", { count: selectedVisitors.length }))) {
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
                    });
                }
              }}
            >
              {t("deleteSelected")} ({selectedVisitors.length})
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
              <SelectItem value="10">10 {t("itemsPerPage")}</SelectItem>
              <SelectItem value="20">20 {t("itemsPerPage")}</SelectItem>
              <SelectItem value="30">30 {t("itemsPerPage")}</SelectItem>
              <SelectItem value="50">50 {t("itemsPerPage")}</SelectItem>
              <SelectItem value="100">100 {t("itemsPerPage")}</SelectItem>
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
              <span className="text-gray-500">{t("page")} {page || 1} {t("of")} {Math.max(1, totalPages || 1)}</span>
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
            <DialogTitle>{t("editVisitor")}</DialogTitle>
            <DialogDescription>
              {t("editVisitorDescription")}
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
                    <FormLabel>{t("yearOfBirth")}</FormLabel>
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
                    <FormLabel>{t("sex")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("emailAddressOptional")}</FormLabel>
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
                    <FormLabel>{t("phoneNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 123 456 7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="sm:justify-between">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={editVisitorMutation.isPending}
                  className="min-w-[100px]"
                >
                  {editVisitorMutation.isPending ? 
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mx-auto" /> : 
                    <>{t("saveChanges")}</>
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Visitor Detail Modal */}
      {selectedVisitDetails && (
        <VisitorDetailModal
          visitor={selectedVisitDetails.visitor}
          visit={selectedVisitDetails.visit}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => {
            setIsDetailModalOpen(false);
            handleEditVisitor(selectedVisitDetails.visitor);
          }}
          onDelete={() => {
            setIsDetailModalOpen(false);
            handleDeleteVisitor(selectedVisitDetails.visitor.id, selectedVisitDetails.visitor.fullName);
          }}
        />
      )}
    </div>
  );
}

// Export the component directly
export type { AdminVisitorsTableProps };
export function AdminVisitorsTable(props: AdminVisitorsTableProps) {
  return <AdminVisitorsTableComponent {...props} />;
}

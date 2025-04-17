import React, { useState, useEffect } from "react";
import { Visit, Visitor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTimeOnly, formatDateShort, formatDuration, formatBadgeId, formatYearWithAge } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { X, Pencil, Trash2, ShieldCheck, Users, Link2 } from "lucide-react";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type VisitorDetailModalProps = {
  visitor?: Visitor;
  visit?: Visit;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVerify?: (verified: boolean) => void; // Add onVerify callback
  showDeleteButton?: boolean;
};

export function VisitorDetailModal({
  visitor,
  visit,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onVerify,
  showDeleteButton = true, // Default to showing the delete button
}: VisitorDetailModalProps) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [partnerInfo, setPartnerInfo] = useState<{visitor: Visitor, visit: Visit} | null>(null);

  // Fetch partner information if this visit has a partner
  const { data: visitsData } = useQuery({
    queryKey: ['/api/admin/visit-history'],
    enabled: isOpen && !!visit && !!visit.partnerId,
    staleTime: 30000 // 30 seconds
  });

  // Update partner info when visitsData changes or partnerId changes
  useEffect(() => {
    if (visit?.partnerId && visitsData && Array.isArray(visitsData)) {
      const partnerVisit = visitsData.find(item => item.visit.id === visit.partnerId);
      if (partnerVisit) {
        setPartnerInfo(partnerVisit);
      } else {
        setPartnerInfo(null);
      }
    } else {
      setPartnerInfo(null);
    }
  }, [visit?.partnerId, visitsData]);

  if (!visitor || !visit) {
    return null;
  }

  // Calculate the current duration if visitor is still checked in
  const getCurrentDuration = () => {
    if (!visit.checkOutTime) {
      const now = new Date();
      const checkIn = new Date(visit.checkInTime);
      const diffMs = now.getTime() - checkIn.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      // Format to hours and minutes
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;

      if (hours > 0) {
        return `${hours}h ${mins}min`;
      } else {
        return `${mins}min`;
      }
    }
    return formatDuration(visit.checkInTime, visit.checkOutTime, language);
  };

  const [processingVerification, setProcessingVerification] = useState<boolean>(false);
  
  const verifyMutation = useMutation({
    mutationFn: async () => {
      setProcessingVerification(true);
      const res = await apiRequest("POST", "/api/admin/verify-visitor", {
        visitorId: visitor?.id, // Added ? to handle potential undefined visitor
        verified: !visitor?.verified // Added ? to handle potential undefined visitor.verified
      });
      return res.json();
    },
    onSuccess: () => {
      // Using the queryClient from useQueryClient hook
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-visitors"] });
    },
    onSettled: () => {
      setProcessingVerification(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">{t("visitorDetails")}</DialogTitle>
              {visitor?.verified && (
                <Badge variant="outline" className="bg-purple-50 flex items-center gap-1" style={{ borderColor: '#da32e1', color: '#da32e1' }}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="text-xs">{t("verified")}</span>
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (onVerify) {
                  // If onVerify is provided, use it
                  onVerify(!visitor.verified);
                } else {
                  // Otherwise use the internal mutation
                  verifyMutation.mutate();
                }
              }}
              style={visitor?.verified ? {backgroundColor: 'rgba(218, 50, 225, 0.1)', color: '#da32e1', borderColor: '#da32e1'} : {}}
              disabled={processingVerification}
            >
              {processingVerification ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              {visitor?.verified ? t("verified", { defaultValue: "Verified" }) : t("verify", { defaultValue: "Verify" })}
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-8 py-6">
          {/* Left Column - Personal & Contact */}
          <div>
            {/* Personal Information Section */}
            <div className="mb-8">
              <h3 className="text-md font-semibold border-b pb-2 mb-4 text-gray-700">{t("personalInformation")}</h3>
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <div className="text-sm text-gray-500">{t("name")}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{visitor.fullName}</span>
                    {visitor.verified && (
                      <span title={t("verifiedVisitor")}>
                        <ShieldCheck className="h-4 w-4" style={{ color: '#da32e1' }} />
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("gender")}</div>
                  <div>
                    {visitor.sex === "Masculin"
                      ? t("male")
                      : visitor.sex === "Feminin"
                      ? t("female")
                      : visitor.sex}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("birthYear")}</div>
                  <div>{formatYearWithAge(visitor.yearOfBirth, language)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("municipality")}</div>
                  <div>{visitor.municipality || t("notSpecified")}</div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-md font-semibold border-b pb-2 mb-4 text-gray-700">{t("contactDetails")}</h3>
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <div className="text-sm text-gray-500">{t("email")}</div>
                  <div className="text-blue-600 break-words">
                    {visitor.email ? (
                      <a href={`mailto:${visitor.email}`} className="hover:underline">
                        {visitor.email}
                      </a>
                    ) : (
                      <span className="text-gray-500 italic">{t("noEmailProvided")}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("phone")}</div>
                  <div className="text-blue-600">
                    {visitor.phoneNumber ? (
                      <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                    ) : (
                      <span className="text-gray-500 italic">{t("noPhoneProvided")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Visit Information */}
          <div>
            <div className="mb-8">
              <h3 className="text-md font-semibold border-b pb-2 mb-4 text-gray-700">{t("visitInformation")}</h3>
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <div className="text-sm text-gray-500">{t("badgeId")}</div>
                  <div className="font-mono text-blue-600">{formatBadgeId(visitor.id)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("checkIn")}</div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      <span className="font-medium">{formatTimeOnly(visit.checkInTime, language)}</span>
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {formatDateShort(visit.checkInTime, language)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("checkOut")}</div>
                  {visit.checkOutTime ? (
                    <div className="flex items-center">
                      <span className="inline-flex items-center">
                        <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                        <span className="font-medium">{formatTimeOnly(visit.checkOutTime, language)}</span>
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatDateShort(visit.checkOutTime, language)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-amber-600 font-medium">{t("ongoing")}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-500">{t("duration")}</div>
                  <div className="font-medium">
                    {visit.checkOutTime ? 
                      formatDuration(visit.checkInTime, visit.checkOutTime, language) : 
                      getCurrentDuration()}
                  </div>
                </div>

                {/* Partner Information */}
                <div>
                  <div className="text-sm text-gray-500">{t("partner")}</div>
                  {visit.partnerId && partnerInfo ? (
                    <div>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1 pl-1.5 pr-3 py-1">
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        <span className="font-medium">{partnerInfo.visitor.fullName}</span>
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1 ml-1">
                        {t("badgeColon", { defaultValue: "Badge:" })} {formatBadgeId(partnerInfo.visitor.id)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">{t("noPartner")}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <h3 className="text-md font-semibold border-b pb-2 mb-4 text-gray-700">{t("actions")}</h3>
              <div className="flex gap-4 justify-between">
                <Button
                  variant="outline"
                  className={showDeleteButton ? "w-1/2 gap-2 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" : "w-full gap-2 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"}
                  onClick={onEdit}
                >
                  <Pencil className="h-4 w-4" />
                  {t("editDetails")}
                </Button>

                {showDeleteButton && (
                  <Button
                    variant="outline"
                    className="w-1/2 gap-2 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 whitespace-nowrap"
                    onClick={() => {
                      if (confirm(t("confirmDeleteVisitor", { name: visitor.fullName }))) {
                        onDelete();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{t("deleteRecord")}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
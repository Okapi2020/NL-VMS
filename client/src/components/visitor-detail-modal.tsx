import React from "react";
import { Visit, Visitor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, formatTimeOnly, formatDateShort, formatDuration, formatBadgeId, formatYearWithAge } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { X, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { PhoneNumberLink } from "@/components/phone-number-link";

type VisitorDetailModalProps = {
  visitor?: Visitor;
  visit?: Visit;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDeleteButton?: boolean;
};

export function VisitorDetailModal({
  visitor,
  visit,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  showDeleteButton = true, // Default to showing the delete button
}: VisitorDetailModalProps) {
  const { t, language } = useLanguage();

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">{t("visitorDetails")}</DialogTitle>
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
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
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
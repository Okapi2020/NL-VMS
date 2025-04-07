import React from "react";
import { Visit, Visitor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId, formatYearWithAge } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { X, Pencil, Trash2 } from "lucide-react";

type VisitorDetailModalProps = {
  visitor?: Visitor;
  visit?: Visit;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function VisitorDetailModal({
  visitor,
  visit,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: VisitorDetailModalProps) {
  const { language } = useLanguage();

  if (!visitor || !visit) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">Visitor Details</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Left Column - Personal & Contact */}
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-md font-medium border-b pb-2">Personal Information</h3>
              <div className="space-y-4 mt-3">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium">{visitor.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Gender</div>
                  <div>
                    {visitor.sex === "Masculin"
                      ? "Masculin"
                      : visitor.sex === "Feminin"
                      ? "Feminin"
                      : visitor.sex}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Birth Year</div>
                  <div>{formatYearWithAge(visitor.yearOfBirth, language)}</div>
                </div>
              </div>
            </div>
            
            {/* Contact Information Section */}
            <div>
              <h3 className="text-md font-medium border-b pb-2">Contact Details</h3>
              <div className="space-y-4 mt-3">
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="text-blue-600">
                    {visitor.email ? (
                      <a href={`mailto:${visitor.email}`} className="hover:underline">
                        {visitor.email}
                      </a>
                    ) : (
                      "No email provided"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="text-blue-600">
                    {visitor.phoneNumber ? (
                      <a href={`tel:${visitor.phoneNumber}`} className="hover:underline">
                        +{visitor.phoneNumber}
                      </a>
                    ) : (
                      "No phone provided"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Visit Information */}
          <div>
            <h3 className="text-md font-medium border-b pb-2">Visit Information</h3>
            <div className="space-y-4 mt-3">
              <div>
                <div className="text-sm text-gray-500">Badge ID</div>
                <div className="font-mono text-blue-600">{formatBadgeId(visitor.id)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Check-in</div>
                <div className="flex items-center">
                  <span className="inline-flex items-center pr-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    {formatTimeOnly(visit.checkInTime, language)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(visit.checkInTime, language).split(",")[0]}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Check-out</div>
                <div className="flex items-center">
                  {visit.checkOutTime ? (
                    <>
                      <span className="inline-flex items-center pr-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                        {formatTimeOnly(visit.checkOutTime, language)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(visit.checkOutTime, language).split(",")[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-600">Active</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div>
                  {visit.checkOutTime ? (
                    formatDuration(visit.checkInTime, visit.checkOutTime, language)
                  ) : (
                    "Active"
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions Section */}
            <div className="mt-8">
              <h3 className="text-md font-medium border-b pb-2">Actions</h3>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-1 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"
                  onClick={onEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1 bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Record
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
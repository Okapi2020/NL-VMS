import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Link } from "wouter";
import { VisitorCheckInForm } from "@/components/visitor-check-in-form";
import { VisitorCheckedIn } from "@/components/visitor-checked-in";
import { Visitor, Visit } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function VisitorPortal() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);

  // We don't want to automatically check for stored visitor IDs
  // on the visitor portal page - it should only show the form

  // Query for active visit if visitor ID is available
  const { refetch } = useQuery({
    queryKey: ["/api/visitors/active-visit"],
    queryFn: async () => {
      const visitorId = localStorage.getItem("visitorId");
      if (!visitorId) return null;
      
      const res = await fetch(`/api/visitors/${visitorId}/active-visit`);
      if (res.status === 404) {
        // No active visit, clear localStorage
        localStorage.removeItem("visitorId");
        return null;
      }
      
      if (!res.ok) throw new Error("Failed to fetch active visit");
      
      const data = await res.json();
      setVisitor(data.visitor);
      setVisit(data.visit);
      setCheckedIn(true);
      return data;
    },
    enabled: false, // Don't run automatically, we'll trigger with refetch
  });

  const handleCheckInSuccess = (visitor: Visitor, visit: Visit) => {
    setVisitor(visitor);
    setVisit(visit);
    setCheckedIn(true);
    localStorage.setItem("visitorId", visitor.id.toString());
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setVisitor(null);
    setVisit(null);
    localStorage.removeItem("visitorId");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <svg
                    className="h-8 w-8 text-primary-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span className="ml-2 text-lg font-semibold text-gray-900">
                    Visitor Management System
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Link href="/auth" 
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Visitor Check-in
            </h1>
            <p className="mt-2 text-gray-600">
              Please fill out the form below to register your visit
            </p>
          </div>

          {/* Check-in Form or Checked-in Confirmation */}
          {checkedIn && visitor && visit ? (
            <VisitorCheckedIn 
              visitor={visitor} 
              visit={visit} 
              onCheckOut={handleCheckOut} 
            />
          ) : (
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <VisitorCheckInForm onSuccess={handleCheckInSuccess} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

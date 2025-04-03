import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserCheck } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with minimalistic logo and admin login */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Visitor Management System</h1>
          <Link href="/auth" 
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Admin Login
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Welcome card with big check-in button */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
              <CardContent className="pt-6 pb-10 px-8 flex flex-col items-center text-center">
                <div className="mb-6 h-24 w-24 rounded-full bg-primary-50 flex items-center justify-center">
                  <UserCheck className="h-12 w-12 text-primary-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome, Visitor!</h2>
                
                <p className="text-gray-500 mb-8">
                  Thank you for visiting. Please check in by clicking the button below.
                </p>
                
                <Link href="/visitor">
                  <Button size="lg" className="w-full text-lg py-6 font-medium">
                    <LogIn className="mr-2 h-6 w-6" />
                    Check In Now
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Information card */}
            <Card className="bg-white">
              <CardContent className="pt-6 px-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Information</h3>
                
                <div className="space-y-4 text-gray-600">
                  <p>
                    Our visitor management system helps us create a safe and efficient environment.
                  </p>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">Benefits:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Fast and easy check-in process</li>
                      <li>Digital visitor records</li>
                      <li>Improved security and compliance</li>
                      <li>Professional visitor experience</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">Need Help?</h4>
                    <p>
                      Please approach the front desk if you need any assistance with the check-in process.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Visitor Management System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateAge } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Visitor, Visit, visitorFormSchema, VisitorFormValues } from "@shared/schema";
import { MultiStepForm } from "@/components/multi-step-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

type VisitorCheckInFormProps = {
  onSuccess: (visitor: Visitor, visit: Visit) => void;
};

export function VisitorCheckInForm({ onSuccess }: VisitorCheckInFormProps) {
  const [ageValue, setAgeValue] = useState<string>("Age will be calculated automatically");
  // Create separate state for step 2 to avoid overlapping values
  const [contactDetailsValues, setContactDetailsValues] = useState({
    email: "",
    phoneNumber: ""
  });
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      yearOfBirth: undefined,
      email: "",
      phoneNumber: "",
    },
  });

  // Handle input changes for step 2
  const handleContactDetailsChange = (field: string, value: string) => {
    setContactDetailsValues(prev => ({
      ...prev,
      [field]: value
    }));
    // Update form values
    form.setValue(field as any, value);
  };

  const checkInMutation = useMutation({
    mutationFn: async (formData: VisitorFormValues) => {
      const res = await apiRequest("POST", "/api/visitors/check-in", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Check-in successful",
        description: "You have been checked in successfully!",
      });
      // Save data in session first
      onSuccess(data.visitor, data.visit);
      form.reset();
      setContactDetailsValues({ email: "", phoneNumber: "" });
      
      // Redirect to welcome page after successful check-in
      setTimeout(() => {
        setLocation("/");
      }, 1500); // Short delay to let toast appear
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleYearOfBirthChange = (value: number) => {
    if (value && value > 1900 && value <= new Date().getFullYear()) {
      const age = calculateAge(value);
      setAgeValue(`${age} years`);
    } else {
      setAgeValue("Invalid year");
    }
  };

  const onSubmit = (data: VisitorFormValues) => {
    // Merge contact details with form data
    const formData = {
      ...data,
      ...contactDetailsValues
    };
    checkInMutation.mutate(formData);
  };

  // Multi-step form configuration
  const steps = [
    {
      id: "personal-info",
      title: "Personal Info",
      content: (
        <div className="space-y-4">
          {/* Name fields in a 2-row layout */}
          <div className="space-y-4">
            {/* First row: First Name and Middle Name side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <span>First Name</span>
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        {...field} 
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span>Middle Name</span>
                      <span className="ml-1 text-xs text-muted-foreground">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Robert" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Second row: Last Name */}
            <div>
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <span>Last Name</span>
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Smith" 
                        {...field} 
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="yearOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year of Birth</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1985" 
                    min="1900" 
                    max={new Date().getFullYear()}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      field.onChange(value);
                      handleYearOfBirthChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <FormLabel>Age</FormLabel>
            <div className="mt-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-md">
              {ageValue}
            </div>
          </div>
        </div>
      ),
      validate: async () => {
        const result = await form.trigger(["firstName", "lastName", "yearOfBirth"]);
        return result;
      }
    },
    {
      id: "contact-details",
      title: "Contact Details",
      content: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="john.doe@example.com" 
                    value={contactDetailsValues.email}
                    onChange={(e) => handleContactDetailsChange("email", e.target.value)}
                    onBlur={field.onBlur}
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
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    value={contactDetailsValues.phoneNumber}
                    onChange={(e) => handleContactDetailsChange("phoneNumber", e.target.value)}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      validate: async () => {
        return await form.trigger(["phoneNumber"]);
      }
    },
    {
      id: "review-info",
      title: "Review Information",
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Please review your information</h3>
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Full Name</h4>
                  <p className="mt-1">
                    {form.getValues("firstName")}{" "}
                    {form.getValues("middleName") ? form.getValues("middleName") + " " : ""}
                    {form.getValues("lastName")}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Age</h4>
                  <p className="mt-1">{ageValue}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Email</h4>
                  <p className="mt-1">{contactDetailsValues.email || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Phone</h4>
                  <p className="mt-1">{contactDetailsValues.phoneNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              By clicking "Check In", you confirm that the information above is correct.
            </p>
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Returning visitor?</span> If you've checked in before using the same email or phone number, our system will recognize you and update your information.
              </p>
            </div>
          </div>
        </div>
      ),
      validate: () => true
    }
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <MultiStepForm 
          steps={steps} 
          onComplete={form.handleSubmit(onSubmit)}
          submitButtonText="Check In"
        />
      </form>
    </Form>
  );
}

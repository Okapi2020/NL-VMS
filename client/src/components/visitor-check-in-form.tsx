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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type VisitorCheckInFormProps = {
  onSuccess: (visitor: Visitor, visit: Visit) => void;
};

export function VisitorCheckInForm({ onSuccess }: VisitorCheckInFormProps) {
  const [ageValue, setAgeValue] = useState<string>("Age will be calculated automatically");
  const [showOtherPurpose, setShowOtherPurpose] = useState(false);
  const { toast } = useToast();

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: undefined,
      email: "",
      phoneNumber: "",
      company: "",
      purpose: "",
      otherPurpose: "",
      host: "",
    },
  });

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
      onSuccess(data.visitor, data.visit);
      form.reset();
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

  const handlePurposeChange = (value: string) => {
    setShowOtherPurpose(value === "other");
  };

  const onSubmit = (data: VisitorFormValues) => {
    checkInMutation.mutate(data);
  };

  // Multi-step form configuration
  const steps = [
    {
      id: "personal-info",
      title: "Personal Info",
      content: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
      validate: () => {
        const result = form.trigger(["fullName", "yearOfBirth"]);
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
                    {...field} 
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
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Acme Inc." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      validate: () => {
        return form.trigger(["phoneNumber"]);
      }
    },
    {
      id: "visit-purpose",
      title: "Visit Purpose",
      content: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose of Visit</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handlePurposeChange(value);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {showOtherPurpose && (
            <FormField
              control={form.control}
              name="otherPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please specify</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Specify purpose" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Person to Visit</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Name of person you're visiting" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      validate: () => {
        const fields = ["purpose", "host"];
        if (form.getValues("purpose") === "other") {
          fields.push("otherPurpose");
        }
        return form.trigger(fields);
      }
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

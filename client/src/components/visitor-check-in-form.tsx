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

type VisitorCheckInFormProps = {
  onSuccess: (visitor: Visitor, visit: Visit) => void;
};

export function VisitorCheckInForm({ onSuccess }: VisitorCheckInFormProps) {
  const [ageValue, setAgeValue] = useState<string>("Age will be calculated automatically");
  const { toast } = useToast();

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: undefined,
      email: "",
      phoneNumber: "",
      company: "",
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
      validate: async () => {
        const result = await form.trigger(["fullName", "yearOfBirth"]);
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
      validate: async () => {
        return await form.trigger(["phoneNumber", "host"]);
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
                  <p className="mt-1">{form.getValues("fullName")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Age</h4>
                  <p className="mt-1">{ageValue}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Email</h4>
                  <p className="mt-1">{form.getValues("email") || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Phone</h4>
                  <p className="mt-1">{form.getValues("phoneNumber")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Company</h4>
                  <p className="mt-1">{form.getValues("company") || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Host</h4>
                  <p className="mt-1">{form.getValues("host")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">
            By clicking "Check In", you confirm that the information above is correct.
          </p>
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

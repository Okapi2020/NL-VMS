import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateAge } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Visitor, Visit, VisitorFormValues } from "@shared/schema";
import { useLocalizedFormSchema } from "@/hooks/use-localized-form-schema";
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
import { useLocation, Link } from "wouter";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type VisitorCheckInFormProps = {
  onSuccess: (visitor: Visitor, visit: Visit) => void;
  isEnglish?: boolean;
};

export function VisitorCheckInForm({ onSuccess, isEnglish = true }: VisitorCheckInFormProps) {
  const [ageValue, setAgeValue] = useState<string>(
    isEnglish 
      ? "Age will be calculated automatically" 
      : "L'âge sera calculé automatiquement"
  );
  // Create separate state for step 2 to avoid overlapping values
  const [contactDetailsValues, setContactDetailsValues] = useState({
    email: "",
    phoneNumber: ""
  });
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get the localized schema based on current language
  const visitorFormSchema = useLocalizedFormSchema(isEnglish);
  
  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      yearOfBirth: undefined,
      sex: undefined,
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
        title: isEnglish ? "Check-in successful" : "Enregistrement réussi",
        description: isEnglish 
          ? "You have been checked in successfully!" 
          : "Vous avez été enregistré avec succès !",
      });
      // Save data in session first
      onSuccess(data.visitor, data.visit);
      form.reset();
      setContactDetailsValues({ email: "", phoneNumber: "" });
      
      // No immediate redirect - visitor will see confirmation screen first
    },
    onError: (error: Error) => {
      toast({
        title: isEnglish ? "Check-in failed" : "Échec de l'enregistrement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleYearOfBirthChange = (value: number) => {
    if (value && value > 1900 && value <= new Date().getFullYear()) {
      const age = calculateAge(value);
      setAgeValue(isEnglish ? `${age} years` : `${age} ans`);
    } else {
      setAgeValue(isEnglish ? "Invalid year" : "Année invalide");
    }
  };

  const onSubmit = (data: VisitorFormValues) => {
    // Prevent duplicate submissions
    if (checkInMutation.isPending) {
      return;
    }
    
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
      title: isEnglish ? "Personal Info" : "Informations Personnelles",
      content: (
        <div className="space-y-4">
          {/* Name fields in a simple vertical layout */}
          <div className="space-y-4">
            {/* First name and middle name in the same row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center h-6"> {/* Fixed height for alignment */}
                      <span>{isEnglish ? "First Name" : "Prénom"}</span>
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isEnglish ? "John" : "Jean"} 
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
                    <FormLabel className="h-6 flex items-center"> {/* Fixed height for alignment */}
                      <span>{isEnglish ? "Middle Name" : "Postnom"}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {isEnglish ? "(Optional)" : "(Optionnel)"}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isEnglish ? "Robert" : "Pierre"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="h-6 flex items-center">
                    <span>{isEnglish ? "Last Name" : "Nom de Famille"}</span>
                    <span className="ml-1 text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={isEnglish ? "Smith" : "Dupont"} 
                      {...field} 
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="yearOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="h-6 flex items-center">{isEnglish ? "Year of Birth" : "Année de Naissance"}</FormLabel>
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
            
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="h-6 flex items-center">
                    <span>{isEnglish ? "Sex" : "Sexe"}</span>
                    <span className="ml-1 text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isEnglish ? "Select sex" : "Sélectionner le sexe"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Masculin">
                        {isEnglish ? "Male (Masculin)" : "Masculin"}
                      </SelectItem>
                      <SelectItem value="Feminin">
                        {isEnglish ? "Female (Feminin)" : "Feminin"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormLabel className="h-6 flex items-center">{isEnglish ? "Age" : "Âge"}</FormLabel>
            <div className="mt-1 py-2 px-3 bg-muted text-foreground rounded-md border border-border">
              {ageValue}
            </div>
          </div>
        </div>
      ),
      validate: async () => {
        const result = await form.trigger(["firstName", "lastName", "yearOfBirth", "sex"]);
        return result;
      }
    },
    {
      id: "contact-details",
      title: isEnglish ? "Contact Details" : "Coordonnées",
      content: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="h-6 flex items-center">
                  <span>{isEnglish ? "Email Address" : "Adresse Email"}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {isEnglish ? "(Optional)" : "(Optionnel)"}
                  </span>
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="email" 
                      placeholder="john.doe@example.com"
                      className="pl-10"
                      value={contactDetailsValues.email}
                      onChange={(e) => {
                        // Only allow valid email characters
                        const value = e.target.value.replace(/[^\w.@+-]/g, '');
                        handleContactDetailsChange("email", value);
                        
                        // Clear error when field is emptied
                        if (!value) {
                          form.clearErrors("email");
                        }
                      }}
                      onBlur={(e) => {
                        // Basic email format validation on blur
                        const value = e.target.value;
                        if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                          form.setError("email", { 
                            type: "manual", 
                            message: isEnglish 
                              ? "Please enter a valid email address format (e.g., name@example.com)" 
                              : "Veuillez entrer une adresse email valide (ex: nom@exemple.com)"
                          });
                        }
                        field.onBlur();
                      }}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                  </div>
                </FormControl>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isEnglish 
                    ? "Enter a valid email address format (e.g., name@example.com)" 
                    : "Entrez une adresse email valide (ex: nom@exemple.com)"}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="h-6 flex items-center">{isEnglish ? "Phone Number" : "Numéro de Téléphone"}</FormLabel>
                <FormControl>
                  <div>
                    <Input 
                      type="tel" 
                      placeholder="0808 382 697" 
                      value={contactDetailsValues.phoneNumber}
                      onChange={(e) => {
                        // Allow only numbers and basic formatting characters
                        const value = e.target.value.replace(/[^\d\s-]/g, '');
                        handleContactDetailsChange("phoneNumber", value);
                      }}
                      onBlur={field.onBlur}
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {isEnglish 
                        ? "Enter a 10-digit phone number (e.g., 0808 382 697)"
                        : "Entrez un numéro de téléphone à 10 chiffres (ex: 0612 345 678)"}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      validate: async () => {
        // Validate both phone number and email (if provided)
        return await form.trigger(["phoneNumber", "email"]);
      }
    },
    {
      id: "review-info",
      title: isEnglish ? "Review Information" : "Vérification des Informations",
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">
            {isEnglish ? "Please review your information" : "Veuillez vérifier vos informations"}
          </h3>
          
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isEnglish ? "Full Name" : "Nom Complet"}
                  </h4>
                  <p className="mt-1">
                    {form.getValues("firstName")}{" "}
                    {form.getValues("middleName") ? form.getValues("middleName") + " " : ""}
                    {form.getValues("lastName")}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isEnglish ? "Age" : "Âge"}
                  </h4>
                  <p className="mt-1">{ageValue}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isEnglish ? "Sex" : "Sexe"}
                  </h4>
                  <p className="mt-1">{form.getValues("sex")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isEnglish ? "Email" : "Courriel"}
                  </h4>
                  <p className="mt-1">{contactDetailsValues.email || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isEnglish ? "Phone" : "Téléphone"}
                  </h4>
                  <p className="mt-1">{contactDetailsValues.phoneNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {isEnglish 
                ? "By clicking \"Check In\", you confirm that the information above is correct."
                : "En cliquant sur \"Enregistrez-vous\", vous confirmez que les informations ci-dessus sont correctes."}
            </p>
            <div className="bg-gray-100/20 dark:bg-gray-800/30 p-2.5 rounded-md border border-gray-200/30 dark:border-gray-700/40">
              <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                {isEnglish
                  ? "Your information will be securely stored and used only for visitor management purposes. We respect your privacy and will not share your data with third parties."
                  : "Vos informations seront stockées en toute sécurité et utilisées uniquement à des fins de gestion des visiteurs. Nous respectons votre vie privée et ne partagerons pas vos données avec des tiers."}
              </p>
            </div>
          </div>
        </div>
      ),
      validate: () => true
    }
  ];

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <MultiStepForm 
            steps={steps} 
            onComplete={form.handleSubmit(onSubmit)}
            submitButtonText={isEnglish ? "Check In" : "Enregistrez-vous"}
            previousButtonText={isEnglish ? "Previous" : "Précédent"}
            nextButtonText={isEnglish ? "Next" : "Suivant"}
            isSubmitting={checkInMutation.isPending}
            renderCustomButtons={(currentStepIndex, isFirstStep) => (
              isFirstStep ? (
                <Link 
                  href="/" 
                  className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-md border bg-background text-foreground hover:bg-muted shadow-sm"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                    />
                  </svg>
                  {isEnglish ? "Home" : "Accueil"}
                </Link>
              ) : null
            )}
          />
        </form>
      </Form>
    </div>
  );
}

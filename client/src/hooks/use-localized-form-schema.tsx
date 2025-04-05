import { z } from "zod";

/**
 * Creates a localized visitor form schema based on the language setting
 */
export function useLocalizedFormSchema(isEnglish: boolean = true) {
  const localizedSchema = z.object({
    firstName: z.string()
      .min(2, isEnglish ? "First name is required" : "Le prénom est requis")
      .refine(name => /^[a-zA-Z.\-']+$/.test(name.trim()), {
        message: isEnglish 
          ? "Name should contain only letters and basic characters"
          : "Le nom ne doit contenir que des lettres et des caractères basiques"
      })
      .refine(name => !name.trim().includes(' '), {
        message: isEnglish 
          ? "First name should not contain spaces (enter only one name)"
          : "Le prénom ne doit pas contenir d'espaces (entrez un seul nom)"
      }),
    middleName: z.string()
      .optional()
      .transform(val => (!val || val.trim() === '') ? undefined : val)
      .refine(name => !name || !name.trim().includes(' '), {
        message: isEnglish 
          ? "Middle name should not contain spaces (enter only one name)"
          : "Le postnom ne doit pas contenir d'espaces (entrez un seul nom)"
      }),
    lastName: z.string()
      .min(2, isEnglish ? "Last name is required" : "Le nom de famille est requis")
      .refine(name => /^[a-zA-Z.\-']+$/.test(name.trim()), {
        message: isEnglish 
          ? "Name should contain only letters and basic characters"
          : "Le nom ne doit contenir que des lettres et des caractères basiques"
      })
      .refine(name => !name.trim().includes(' '), {
        message: isEnglish 
          ? "Last name should not contain spaces (enter only one name)"
          : "Le nom de famille ne doit pas contenir d'espaces (entrez un seul nom)"
      }),
    yearOfBirth: z.number()
      .min(1900, isEnglish ? "Year cannot be before 1900" : "L'année ne peut pas être antérieure à 1900")
      .max(new Date().getFullYear(), isEnglish ? "Year cannot be in the future" : "L'année ne peut pas être dans le futur"),
    sex: z.enum(["Masculin", "Feminin"], {
      errorMap: () => ({ 
        message: isEnglish 
          ? "Please select either Masculin or Feminin" 
          : "Veuillez sélectionner Masculin ou Feminin" 
      }),
    }),
    email: z.string()
      .email(isEnglish ? "Please enter a valid email address" : "Veuillez saisir une adresse email valide")
      .refine(email => email === "" || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email), {
        message: isEnglish
          ? "Please enter a valid email address with proper format (e.g., name@example.com)"
          : "Veuillez saisir une adresse email valide (ex: nom@exemple.com)"
      })
      .optional()
      .or(z.literal("")),
    phoneNumber: z.string()
      .min(1, isEnglish ? "Phone number is required" : "Le numéro de téléphone est requis")
      .refine(
        phone => {
          // Remove all non-digit characters for validation
          const digits = phone.replace(/\D/g, '');
          // Phone should have exactly 10 digits
          return digits.length === 10;
        },
        {
          message: isEnglish 
            ? "Phone number must be exactly 10 digits"
            : "Le numéro de téléphone doit comporter exactement 10 chiffres"
        }
      ),
    purpose: z.string()
      .min(1, isEnglish ? "Purpose of visit is required" : "Le motif de la visite est requis")
      .optional(),
  })
  .transform((data) => {
    // Combine name fields into fullName for backend compatibility
    const middleName = data.middleName ? ` ${data.middleName} ` : ' ';
    const fullName = data.firstName + middleName + data.lastName;
    
    // Normalize phone number to remove any non-digit characters
    let phoneNumber = data.phoneNumber.replace(/\D/g, '');
    
    // Remove leading zero if present (for country code format)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    return {
      ...data,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber
    };
  });

  return localizedSchema;
}
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/hooks/use-language";
import { Visitor } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Define the form schema
export const editVisitorSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().min(1, "Phone number is required"),
  yearOfBirth: z.coerce.number().min(1900).max(new Date().getFullYear()),
  company: z.string().optional().or(z.literal("")),
});

export type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;

interface EditVisitorFormProps {
  visitor: Visitor;
  onSubmit?: (data: EditVisitorFormValues) => void;
  isSubmitting?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditVisitorForm({ 
  visitor, 
  onSubmit, 
  isSubmitting = false,
  onSuccess,
  onCancel
}: EditVisitorFormProps) {
  const { t } = useLanguage();
  
  // Initialize form with visitor data
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: {
      fullName: visitor.fullName,
      email: visitor.email || "",
      phoneNumber: visitor.phoneNumber,
      yearOfBirth: visitor.yearOfBirth,
      company: visitor.company || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fullName")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")} ({t("optional")})</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
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
              <FormLabel>{t("phoneNumber")}</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>{t("yearOfBirth")}</FormLabel>
              <FormControl>
                <Input {...field} type="number" min={1900} max={new Date().getFullYear()} />
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
              <FormLabel>{t("company")} ({t("optional")})</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveChanges")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
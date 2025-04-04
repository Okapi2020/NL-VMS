import { useQuery } from "@tanstack/react-query";
import { formatPhoneWithCountryCode, getWhatsAppUrl } from "@/lib/utils";

type PhoneNumberLinkProps = {
  phoneNumber: string;
  className?: string;
};

export function PhoneNumberLink({ phoneNumber, className = "" }: PhoneNumberLinkProps) {
  // Get settings to retrieve the country code
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });
  
  const countryCode = settings?.countryCode || "243";
  const formattedPhone = formatPhoneWithCountryCode(phoneNumber, countryCode);
  const whatsappUrl = getWhatsAppUrl(phoneNumber, countryCode);
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary hover:text-primary/80 hover:underline ${className}`}
      title="Open in WhatsApp"
    >
      {formattedPhone}
    </a>
  );
}
import { useQuery } from "@tanstack/react-query";
import { formatPhoneNumber, formatPhoneWithCountryCode, getWhatsAppUrl } from "@/lib/utils";

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
  
  // Format the phone number for display (using 10-digit format with leading zero)
  const formattedPhoneDisplay = formatPhoneNumber(phoneNumber);
  
  // Format for WhatsApp link (keeping the international format)
  const whatsappUrl = getWhatsAppUrl(phoneNumber, countryCode);
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-600 hover:text-blue-800 hover:underline flex items-center ${className}`}
      title="Open in WhatsApp"
    >
      {formattedPhoneDisplay}
    </a>
  );
}
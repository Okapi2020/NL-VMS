import { useQuery } from "@tanstack/react-query";
import { formatPhoneWithCountryCode, getWhatsAppUrl } from "@/lib/utils";
import { SiWhatsapp } from "react-icons/si";

type PhoneNumberLinkProps = {
  phoneNumber: string;
  className?: string;
  showWhatsAppIcon?: boolean;
};

export function PhoneNumberLink({ phoneNumber, className = "", showWhatsAppIcon = true }: PhoneNumberLinkProps) {
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
    <div className="flex items-center gap-2">
      <a
        href={`tel:${formattedPhone}`}
        className={`text-blue-600 hover:text-blue-800 hover:underline flex items-center ${className}`}
      >
        {formattedPhone}
      </a>
      
      {showWhatsAppIcon && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-800"
          title="Open in WhatsApp"
        >
          <SiWhatsapp className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
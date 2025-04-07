import { InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";

export function AutoCheckoutNotice() {
  const { t } = useLanguage();
  
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-950 dark:bg-amber-950/30 mb-4">
      <CardContent className="p-4 flex items-center gap-3">
        <InfoIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t("autoCheckoutNotice", {})}
        </p>
      </CardContent>
    </Card>
  );
}
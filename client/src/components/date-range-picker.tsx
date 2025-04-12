import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/hooks/use-language";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
  className?: string;
  calendarLabel?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  calendarLabel,
}: DateRangePickerProps) {
  const { language, t } = useLanguage();
  
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y", { locale: language === 'fr' ? fr : undefined })} -{" "}
                  {format(value.to, "LLL dd, y", { locale: language === 'fr' ? fr : undefined })}
                </>
              ) : (
                format(value.from, "LLL dd, y", { locale: language === 'fr' ? fr : undefined })
              )
            ) : (
              <span>{calendarLabel || t("selectDateRange", { defaultValue: "Select date range" })}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            locale={language === 'fr' ? fr : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
          <div className="flex justify-end gap-2 p-3">
            <Button variant="outline" size="sm" onClick={() => onDateRangeChange(undefined)}>
              Clear
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                onDateRangeChange({ from: lastWeek, to: today });
              }}
            >
              Last 7 Days
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(today.getMonth() - 1);
                onDateRangeChange({ from: lastMonth, to: today });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
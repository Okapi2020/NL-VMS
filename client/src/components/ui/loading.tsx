import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  /** Size of the spinner (default: 'md') */
  size?: "sm" | "md" | "lg" | "xl";
  /** Text to display along with the spinner */
  text?: string;
  /** Class to apply to the container */
  className?: string;
  /** Class to apply to the spinner */
  spinnerClassName?: string;
  /** Class to apply to the text */
  textClassName?: string;
  /** Whether the loading indicator should be centered (default: true) */
  centered?: boolean;
  /** Whether the loading indicator should take up the full parent height (default: false) */
  fullHeight?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function Loading({
  size = "md",
  text,
  className,
  spinnerClassName,
  textClassName,
  centered = true,
  fullHeight = false,
}: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center",
        centered && "justify-center",
        fullHeight && "h-full",
        className
      )}
    >
      <Loader2
        className={cn(
          "animate-spin text-primary/80",
          sizeClasses[size],
          spinnerClassName
        )}
      />
      {text && (
        <p
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            textClassName
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}

export function FullPageLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}

export function TableRowsLoading({
  colSpan,
  rows = 3,
}: {
  colSpan: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function ButtonLoading({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn(
        "h-4 w-4 animate-spin",
        className
      )}
    />
  );
}
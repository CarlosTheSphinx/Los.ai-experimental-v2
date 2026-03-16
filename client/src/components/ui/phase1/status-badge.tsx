import React from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "active" | "inactive" | "pending" | "closed" | "template" | "error" | "info";

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  closed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  template: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  error: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  info: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const style = variantStyles[variant] || variantStyles.inactive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium",
        style.bg,
        style.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {label}
    </span>
  );
}

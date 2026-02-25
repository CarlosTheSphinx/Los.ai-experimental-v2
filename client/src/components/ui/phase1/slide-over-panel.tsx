import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function SlideOverPanel({ open, onClose, title, subtitle, width = "720px", headerActions, children }: SlideOverPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative bg-white h-full overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-300"
        style={{ width }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-saved
          </div>
          {headerActions && <div className="flex items-center gap-2 ml-3">{headerActions}</div>}
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

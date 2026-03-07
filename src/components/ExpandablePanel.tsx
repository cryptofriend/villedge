import { useState, useCallback, useRef } from "react";
import { GripHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type PanelSize = "default" | "expanded" | "full";

interface ExpandablePanelProps {
  children: React.ReactNode;
  className?: string;
}

export const ExpandablePanel = ({ children, className }: ExpandablePanelProps) => {
  const [panelSize, setPanelSize] = useState<PanelSize>("default");
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const startSize = useRef<PanelSize>("default");

  const sizeClasses: Record<PanelSize, string> = {
    default: "h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)]",
    expanded: "h-[calc(100vh-130px)] sm:h-[calc(100vh-110px)]",
    full: "h-[calc(100vh-80px)] sm:h-[calc(100vh-60px)]",
  };

  const cycleSize = useCallback(() => {
    setPanelSize((current) => {
      if (current === "default") return "expanded";
      if (current === "expanded") return "full";
      return "default";
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startSize.current = panelSize;
  }, [panelSize]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    const diff = startY.current - endY;
    
    // Swipe up to expand, swipe down to collapse
    if (diff > 50) {
      // Swipe up
      setPanelSize((current) => {
        if (current === "default") return "expanded";
        if (current === "expanded") return "full";
        return current;
      });
    } else if (diff < -50) {
      // Swipe down
      setPanelSize((current) => {
        if (current === "full") return "expanded";
        if (current === "expanded") return "default";
        return current;
      });
    }
  }, []);

  return (
    <div
      ref={panelRef}
      className={cn(
        "w-full rounded-xl bg-card/95 shadow-lg backdrop-blur-sm flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out",
        sizeClasses[panelSize],
        className
      )}
      onWheelCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      {/* Drag handle - only visible on mobile */}
      <div
        className="md:hidden flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none select-none"
        onClick={cycleSize}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col items-center gap-0.5">
          <GripHorizontal className="h-5 w-5 text-muted-foreground/60" />
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              panelSize === "default" ? "bg-primary" : "bg-muted-foreground/30"
            )} />
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              panelSize === "expanded" ? "bg-primary" : "bg-muted-foreground/30"
            )} />
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              panelSize === "full" ? "bg-primary" : "bg-muted-foreground/30"
            )} />
          </div>
        </div>
      </div>
      
      {children}
    </div>
  );
};

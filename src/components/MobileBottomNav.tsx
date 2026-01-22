import { MapPin, CalendarDays, Sparkles, MessageSquare, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveView = "map" | "residents" | "scenius" | "bulletin" | "events";

interface MobileBottomNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const navItems: { id: ActiveView; icon: typeof MapPin; label: string }[] = [
  { id: "map", icon: MapPin, label: "Map" },
  { id: "residents", icon: CalendarDays, label: "Residents" },
  { id: "scenius", icon: Sparkles, label: "Scenius" },
  { id: "bulletin", icon: MessageSquare, label: "Bulletin" },
  { id: "events", icon: Calendar, label: "Events" },
];

export const MobileBottomNav = ({ activeView, onViewChange }: MobileBottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg sm:hidden">
      <div className="flex justify-around items-center h-16 px-2 pb-safe">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-all min-w-[60px]",
              activeView === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 transition-transform",
              activeView === id && "scale-110"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              activeView === id && "font-semibold"
            )}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

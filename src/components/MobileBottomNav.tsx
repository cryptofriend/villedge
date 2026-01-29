import { MapPin, CalendarDays, Sparkles, MessageSquare, Calendar, User, Coins, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type ActiveView = "map" | "residents" | "scenius" | "bulletin" | "events" | "treasury";

interface MobileBottomNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  isVerified?: boolean;
}

const navItems: { id: ActiveView; icon: typeof MapPin; label: string; requiresVerification: boolean }[] = [
  { id: "map", icon: MapPin, label: "Map", requiresVerification: false },
  { id: "residents", icon: CalendarDays, label: "Residents", requiresVerification: true },
  { id: "scenius", icon: Sparkles, label: "Scenius", requiresVerification: true },
  { id: "bulletin", icon: MessageSquare, label: "Bulletin", requiresVerification: true },
  { id: "treasury", icon: Coins, label: "Treasury", requiresVerification: true },
  { id: "events", icon: Calendar, label: "Events", requiresVerification: true },
];

export const MobileBottomNav = ({ activeView, onViewChange, isVerified = false }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading } = useAuth();

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.requiresVerification && !isVerified) {
      toast.error("Get an invitation code from a verified member to unlock full access", {
        action: { label: "DM @boogaav", onClick: () => window.open("https://x.com/boogaav", "_blank") }
      });
      return;
    }
    onViewChange(item.id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg sm:hidden">
      <div className="flex justify-around items-center h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const { id, icon: Icon, label, requiresVerification } = item;
          const isLocked = requiresVerification && !isVerified;
          
          return (
            <button
              key={id}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-lg transition-all min-w-[50px]",
                isLocked
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : activeView === id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isLocked ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  activeView === id && "scale-110"
                )} />
              )}
              <span className={cn(
                "text-[10px] font-medium",
                activeView === id && !isLocked && "font-semibold"
              )}>
                {label}
              </span>
            </button>
          );
        })}
        
        {/* Auth button */}
        <button
          onClick={() => navigate("/auth")}
          className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-lg transition-all min-w-[50px] text-muted-foreground hover:text-foreground"
        >
          {loading ? (
            <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">
            {isAuthenticated ? "Profile" : "Login"}
          </span>
        </button>
      </div>
    </div>
  );
};

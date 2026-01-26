import { History, Users, MapPin, Calendar, MessageSquare, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserActivity } from "@/pages/Profile";
import { format } from "date-fns";

interface ProfileActivityHistoryProps {
  activities: UserActivity[];
}

const typeConfig = {
  village_create: { icon: Home, label: "Created Village", color: "text-primary" },
  village_join: { icon: Users, label: "Joined", color: "text-blue-500" },
  stay_register: { icon: Calendar, label: "Stay", color: "text-emerald-500" },
  spot_add: { icon: MapPin, label: "Spot", color: "text-amber-500" },
  event_create: { icon: Calendar, label: "Event", color: "text-violet-500" },
  bulletin_post: { icon: MessageSquare, label: "Post", color: "text-sky-500" },
};

export const ProfileActivityHistory = ({ activities }: ProfileActivityHistoryProps) => {
  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-semibold text-foreground">Activity History</h2>
        <Badge variant="secondary" className="text-xs">
          {activities.length} activities
        </Badge>
      </div>

      {activities.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-4">
            {activities.slice(0, 20).map((activity) => {
              const config = typeConfig[activity.type];
              const Icon = config.icon;
              return (
                <div key={activity.id} className="relative flex items-start gap-4 pl-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-card border-2 border-border">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        {activity.village_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.village_name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(activity.date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground italic">
            No activity yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Join villages and participate to build your activity history
          </p>
        </div>
      )}

      {/* Activity source note */}
      <p className="text-xs text-muted-foreground mt-6 text-center italic">
        Activity from Villedge platform
      </p>
    </section>
  );
};
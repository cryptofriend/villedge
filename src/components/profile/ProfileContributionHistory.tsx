import { History, Users, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Contribution } from "@/pages/Profile";
import { format } from "date-fns";

interface ProfileContributionHistoryProps {
  contributions: Contribution[];
}

const typeIcons = {
  village_join: Users,
  contribution: FileText,
  event: Calendar,
  proposal: CheckCircle2,
};

const typeLabels = {
  village_join: "Village",
  contribution: "Contribution",
  event: "Event",
  proposal: "Proposal",
};

export const ProfileContributionHistory = ({ contributions }: ProfileContributionHistoryProps) => {
  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-semibold text-foreground">Contribution History</h2>
        <Badge variant="secondary" className="text-xs">
          {contributions.length} entries
        </Badge>
      </div>

      {contributions.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-4">
            {contributions.map((contribution, index) => {
              const Icon = typeIcons[contribution.type];
              return (
                <div key={contribution.id} className="relative flex items-start gap-4 pl-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-card border-2 border-border">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {contribution.title}
                        </p>
                        {contribution.village_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {contribution.village_name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(contribution.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    {contribution.type === "proposal" && (
                      <Badge 
                        variant="outline" 
                        className={`mt-1.5 text-xs ${
                          contribution.passed 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {contribution.passed ? "Passed" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground italic">
            No contribution history yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Join villages and participate to build your history
          </p>
        </div>
      )}

      {/* Read-only notice */}
      <p className="text-xs text-muted-foreground mt-6 text-center italic">
        This history is automatically generated and cannot be edited
      </p>
    </section>
  );
};

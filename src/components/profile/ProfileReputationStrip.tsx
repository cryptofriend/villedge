import { Star, GitCommit, Vote, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProfileReputationStripProps {
  reputationScore: number;
  contributionCount: number;
  votingPower: number;
  trustLevel: number;
}

const trustLevelLabels = ["Newcomer", "Member", "Contributor", "Builder", "Guardian"];

export const ProfileReputationStrip = ({
  reputationScore,
  contributionCount,
  votingPower,
  trustLevel,
}: ProfileReputationStripProps) => {
  const stats = [
    {
      icon: Star,
      label: "Reputation",
      value: reputationScore.toLocaleString(),
      tooltip: "Cumulative reputation earned through contributions and governance participation",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: GitCommit,
      label: "Contributions",
      value: contributionCount.toString(),
      tooltip: "Total contributions made across all villages",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Vote,
      label: "Voting Power",
      value: votingPower.toLocaleString(),
      tooltip: "Current voting weight in governance proposals",
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: Shield,
      label: "Trust Level",
      value: `L${trustLevel}`,
      tooltip: trustLevelLabels[trustLevel] || "Unknown",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      sublabel: trustLevelLabels[trustLevel],
    },
  ];

  return (
    <section className="sticky top-0 z-40 py-4 -mx-4 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between gap-3">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <div
                className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl ${stat.bgColor} border border-transparent hover:border-border/50 transition-colors cursor-default`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground leading-tight">
                    {stat.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                    {stat.sublabel || stat.label}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">{stat.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </section>
  );
};

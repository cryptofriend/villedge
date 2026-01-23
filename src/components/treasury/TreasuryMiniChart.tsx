import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Transaction } from "@/hooks/useWalletTransactions";
import { subDays, format, startOfDay, isAfter } from "date-fns";

interface TreasuryMiniChartProps {
  incoming: Transaction[];
  outgoing: Transaction[];
  isLoading?: boolean;
}

export const TreasuryMiniChart = ({ incoming, outgoing, isLoading }: TreasuryMiniChartProps) => {
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);
    
    // Create array of last 30 days
    const days: { date: Date; label: string; incoming: number; outgoing: number; net: number }[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = subDays(today, i);
      days.push({
        date,
        label: format(date, "MMM d"),
        incoming: 0,
        outgoing: 0,
        net: 0,
      });
    }
    
    // Aggregate incoming transactions
    incoming
      .filter(tx => isAfter(new Date(tx.timestamp), thirtyDaysAgo))
      .forEach(tx => {
        const txDate = startOfDay(new Date(tx.timestamp));
        const dayIndex = days.findIndex(d => 
          format(d.date, "yyyy-MM-dd") === format(txDate, "yyyy-MM-dd")
        );
        if (dayIndex !== -1) {
          days[dayIndex].incoming += tx.valueUsd;
        }
      });
    
    // Aggregate outgoing transactions
    outgoing
      .filter(tx => isAfter(new Date(tx.timestamp), thirtyDaysAgo))
      .forEach(tx => {
        const txDate = startOfDay(new Date(tx.timestamp));
        const dayIndex = days.findIndex(d => 
          format(d.date, "yyyy-MM-dd") === format(txDate, "yyyy-MM-dd")
        );
        if (dayIndex !== -1) {
          days[dayIndex].outgoing += tx.valueUsd;
        }
      });
    
    // Calculate net and cumulative
    let cumulative = 0;
    return days.map(day => {
      day.net = day.incoming - day.outgoing;
      cumulative += day.net;
      return {
        ...day,
        cumulative,
      };
    });
  }, [incoming, outgoing]);

  const totalIncoming = chartData.reduce((sum, d) => sum + d.incoming, 0);
  const totalOutgoing = chartData.reduce((sum, d) => sum + d.outgoing, 0);
  const netChange = totalIncoming - totalOutgoing;

  if (isLoading) {
    return (
      <div className="h-16 bg-muted/30 animate-pulse rounded" />
    );
  }

  // Check if there's any activity
  const hasActivity = totalIncoming > 0 || totalOutgoing > 0;

  if (!hasActivity) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
        No activity in the last 30 days
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">30 Day Activity</span>
        <span className={netChange >= 0 ? "text-green-500" : "text-red-500"}>
          {netChange >= 0 ? "+" : ""}{netChange.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded px-2 py-1 text-xs shadow-md">
                    <div className="font-medium">{data.label}</div>
                    {data.incoming > 0 && (
                      <div className="text-green-500">+${data.incoming.toFixed(0)}</div>
                    )}
                    {data.outgoing > 0 && (
                      <div className="text-red-500">-${data.outgoing.toFixed(0)}</div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill="url(#incomingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>30d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
};

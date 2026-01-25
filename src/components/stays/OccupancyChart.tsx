import { useMemo, useState } from "react";
import { format, parseISO, eachDayOfInterval, isToday } from "date-fns";
import { Stay } from "@/hooks/useStays";
import { cn } from "@/lib/utils";

interface OccupancyChartProps {
  stays: Stay[];
  days: Date[];
  dayWidth: number;
}

export const OccupancyChart = ({ stays, days, dayWidth }: OccupancyChartProps) => {
  // Calculate occupancy for each day
  const data = useMemo(() => {
    return days.map((day) => {
      const count = stays.filter((stay) => {
        const startDate = parseISO(stay.start_date);
        const endDate = parseISO(stay.end_date);
        return day >= startDate && day <= endDate;
      }).length;
      return { date: day, count };
    });
  }, [stays, days]);

  const maxOccupancy = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  const chartHeight = 60;

  return (
    <div className="flex" style={{ height: chartHeight }}>
      {data.map((item, index) => {
        const barHeight = (item.count / maxOccupancy) * (chartHeight - 8);
        const isCurrent = isToday(item.date);
        
        return (
          <div
            key={index}
            className="flex flex-col items-center justify-end border-r border-border/30"
            style={{ width: dayWidth }}
          >
            <div
              className={cn(
                "w-[60%] rounded-t transition-all relative group cursor-default",
                isCurrent
                  ? "bg-primary shadow-md"
                  : item.count > 0
                  ? "bg-primary/50 hover:bg-primary/60"
                  : "bg-muted/30"
              )}
              style={{ height: Math.max(barHeight, 2) }}
              title={`${format(item.date, "MMM d")}: ${item.count} ${item.count === 1 ? "person" : "people"}`}
            >
              {item.count > 0 && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-1 rounded whitespace-nowrap">
                  {item.count}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

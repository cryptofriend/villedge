import { useMemo } from "react";
import { format, isSameDay, parseISO, eachDayOfInterval, isToday } from "date-fns";
import { Stay } from "@/hooks/useStays";

interface OccupancyChartProps {
  stays: Stay[];
  dateRange: { start: Date; end: Date };
  dayWidth: number;
}

export const OccupancyChart = ({ stays, dateRange, dayWidth }: OccupancyChartProps) => {
  const occupancyData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const count = stays.filter((stay) => {
        const startDate = parseISO(stay.start_date);
        const endDate = parseISO(stay.end_date);
        return day >= startDate && day <= endDate;
      }).length;
      
      return { date: day, count };
    });
  }, [stays, dateRange]);

  const maxOccupancy = useMemo(() => {
    return Math.max(...occupancyData.map((d) => d.count), 1);
  }, [occupancyData]);

  const chartHeight = 60;

  return (
    <div className="relative mb-2">
      <div className="absolute left-0 top-0 w-10 h-full flex flex-col justify-between text-[10px] text-muted-foreground pr-1 text-right">
        <span>{maxOccupancy}</span>
        <span>0</span>
      </div>
      <div className="ml-10 flex items-end" style={{ height: chartHeight }}>
        {occupancyData.map(({ date, count }, index) => {
          const barHeight = (count / maxOccupancy) * chartHeight;
          const isCurrentDay = isToday(date);
          
          return (
            <div
              key={index}
              className="flex-shrink-0 flex flex-col items-center justify-end"
              style={{ width: dayWidth }}
            >
              <div
                className={`w-full max-w-[calc(100%-2px)] rounded-t transition-all ${
                  isCurrentDay
                    ? "bg-primary shadow-sm"
                    : count > 0
                    ? "bg-primary/40"
                    : "bg-muted/30"
                }`}
                style={{ height: barHeight || 2 }}
                title={`${format(date, "MMM d")}: ${count} ${count === 1 ? "person" : "people"}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

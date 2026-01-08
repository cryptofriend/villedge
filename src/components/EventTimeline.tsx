import { useRef, useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { format, addDays, subDays, isSameDay, startOfDay } from "date-fns";
import { DbEvent } from "@/hooks/useEvents";

interface EventTimelineProps {
  events: DbEvent[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export const EventTimeline = ({ events, onDateSelect, selectedDate }: EventTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date>(selectedDate || new Date());
  
  // Generate dates: 60 days before and after today
  const today = startOfDay(new Date());
  const dates: Date[] = [];
  for (let i = -60; i <= 60; i++) {
    dates.push(addDays(today, i));
  }
  
  // Get events count for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = startOfDay(new Date(event.start_time));
      return isSameDay(eventDate, date);
    });
  };
  
  // Scroll to center on today on mount
  useEffect(() => {
    if (todayRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayButton = todayRef.current;
      
      // Calculate scroll position to center today
      const containerWidth = container.offsetWidth;
      const todayOffset = todayButton.offsetLeft;
      const todayWidth = todayButton.offsetWidth;
      
      container.scrollLeft = todayOffset - (containerWidth / 2) + (todayWidth / 2);
    }
  }, []);
  
  const handleDateClick = (date: Date) => {
    setCurrentSelectedDate(date);
    onDateSelect?.(date);
  };
  
  const isToday = (date: Date) => isSameDay(date, today);
  const isSelected = (date: Date) => isSameDay(date, currentSelectedDate);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-t border-border">
        <div className="flex items-center h-[64px] sm:h-[72px]">
          {/* Calendar icon */}
          <div className="flex-shrink-0 px-2 sm:px-4 py-2 sm:py-3 border-r border-border">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          </div>
          
          {/* Scrollable date timeline */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex items-center py-1.5 sm:py-2 px-1 sm:px-2 min-w-max">
              {dates.map((date, index) => {
                const eventsOnDate = getEventsForDate(date);
                const hasEvents = eventsOnDate.length > 0;
                const dayIsToday = isToday(date);
                const dayIsSelected = isSelected(date);
                
                return (
                  <button
                    key={index}
                    ref={dayIsToday ? todayRef : undefined}
                    onClick={() => handleDateClick(date)}
                    className={`
                      flex flex-col items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 mx-0.5 sm:mx-1 rounded-lg
                      transition-all duration-200 min-w-[48px] sm:min-w-[60px]
                      ${dayIsSelected 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : dayIsToday 
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }
                    `}
                  >
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wide opacity-70">
                      {format(date, 'EEE')}
                    </span>
                    <span className={`text-base sm:text-lg font-medium ${dayIsSelected ? 'font-bold' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] opacity-70">
                      {format(date, 'MMM')}
                    </span>
                    {hasEvents && (
                      <div className={`
                        w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-0.5 sm:mt-1
                        ${dayIsSelected ? 'bg-primary-foreground' : 'bg-primary'}
                      `} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

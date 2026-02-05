import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Clock } from "lucide-react";

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

export const LocalTimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState(() => toZonedTime(new Date(), VIETNAM_TZ));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(toZonedTime(new Date(), VIETNAM_TZ));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span className="font-medium text-foreground">{format(currentTime, "h:mm a")}</span>
    </div>
  );
};

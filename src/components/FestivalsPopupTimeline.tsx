import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Festival } from "@/hooks/useFestivals";

interface Props {
  festivals: Festival[];
  activeId?: string | null;
  onFestivalClick: (f: Festival) => void;
}

const MS_DAY = 86400000;

const getPos = (
  start: Date,
  end: Date,
  tStart: Date,
  tEnd: Date,
): { left: number; width: number } => {
  const total = tEnd.getTime() - tStart.getTime();
  const s = Math.max(start.getTime(), tStart.getTime());
  const e = Math.min(end.getTime(), tEnd.getTime());
  const left = ((s - tStart.getTime()) / total) * 100;
  const width = ((e - s) / total) * 100;
  return {
    left: Math.max(0, left),
    width: Math.max(1, Math.min(width, 100 - left)),
  };
};

// Stable color from id
const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 45%)`;
};

export const FestivalsPopupTimeline = ({
  festivals,
  activeId,
  onFestivalClick,
}: Props) => {
  const [expanded, setExpanded] = useState(true);

  const { timelineStart, timelineEnd, months, todayPosition } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 12, 0);
    const labels: { label: string; position: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
      labels.push({
        label: m.toLocaleDateString("en-US", { month: "short" }),
        position: (i / 12) * 100,
      });
    }
    const total = end.getTime() - start.getTime();
    const todayPos = ((now.getTime() - start.getTime()) / total) * 100;
    return {
      timelineStart: start,
      timelineEnd: end,
      months: labels,
      todayPosition: Math.max(0, Math.min(100, todayPos)),
    };
  }, []);

  const positions = useMemo(() => {
    return festivals
      .map((f) => {
        if (!f.start_date) return null;
        const start = new Date(f.start_date);
        const end = new Date(f.end_date ?? f.start_date);
        if (end < timelineStart || start > timelineEnd) return null;
        return { festival: f, position: getPos(start, end, timelineStart, timelineEnd) };
      })
      .filter(Boolean) as {
      festival: Festival;
      position: { left: number; width: number };
    }[];
  }, [festivals, timelineStart, timelineEnd]);

  // Pack into rows
  const rows = useMemo(() => {
    const MIN_W = 6;
    const GAP = 1.5;
    const sorted = [...positions].sort(
      (a, b) => a.position.left - b.position.left,
    );
    const out: typeof positions[] = [];
    const bounds = (it: (typeof positions)[number]) => {
      const w = Math.max(it.position.width, MIN_W);
      return { s: it.position.left - GAP, e: it.position.left + w + GAP };
    };
    sorted.forEach((it) => {
      const ib = bounds(it);
      let placed = false;
      for (const row of out) {
        if (
          !row.some((ex) => {
            const eb = bounds(ex);
            return !(ib.e <= eb.s || ib.s >= eb.e);
          })
        ) {
          row.push(it);
          placed = true;
          break;
        }
      }
      if (!placed) out.push([it]);
    });
    return out;
  }, [positions]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {!expanded && (
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setExpanded(true)}
            aria-label="Show Timeline"
            className="h-9 w-9 rounded-full bg-card/95 shadow-lg backdrop-blur-sm sm:h-auto sm:w-auto sm:gap-2 sm:px-3"
          >
            <Calendar className="hidden h-4 w-4 sm:block" />
            <span className="hidden sm:inline">Show Timeline</span>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}

      {expanded && (
        <div className="bg-gradient-to-t from-background/95 via-background/80 to-transparent px-4 pb-4 pt-8 md:px-6">
          <div className="mb-2 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
              className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3" />
              Hide
            </Button>
          </div>

          <div className="relative mb-2 h-6">
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute text-xs font-medium text-muted-foreground"
                style={{ left: `${m.position}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div
            className="relative rounded-lg bg-secondary/30 backdrop-blur-sm"
            style={{ minHeight: `${Math.max(1, rows.length) * 32 + 8}px` }}
          >
            <div className="absolute inset-0 flex">
              {months.map((_, i) => (
                <div
                  key={i}
                  className="h-full border-l border-border/30"
                  style={{ width: `${100 / 12}%` }}
                />
              ))}
            </div>

            <div
              className="absolute top-0 z-10 h-full w-0.5 bg-primary"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Today
              </div>
            </div>

            {rows.map((row, ri) => (
              <div key={ri} className="relative h-8">
                {row.map(({ festival, position }) => (
                  <button
                    key={festival.id}
                    onClick={() => onFestivalClick(festival)}
                    className={`absolute top-1 flex h-6 items-center gap-1 overflow-hidden rounded-full px-2 text-xs font-medium text-white transition-all hover:scale-105 hover:shadow-lg ${
                      activeId === festival.id
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : ""
                    }`}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      minWidth: "60px",
                      backgroundColor: colorFor(festival.id),
                    }}
                    title={`${festival.name}\n${festival.start_date ?? ""}`}
                  >
                    {festival.logo_url && (
                      <img
                        src={festival.logo_url}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded-sm object-cover"
                      />
                    )}
                    <span className="truncate">{festival.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

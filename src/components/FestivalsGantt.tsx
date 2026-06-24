import { useMemo } from "react";
import { useFestivals, type Festival } from "@/hooks/useFestivals";

const MS_DAY = 86400000;

const fmtMonth = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", year: "numeric" });

const fmtRange = (start: string, end: string | null) => {
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!end || start === end) return s.toLocaleDateString("en-US", opts);
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
};

interface Props {
  /** Tailwind text color for bars, e.g. "bg-primary" */
  barClassName?: string;
}

export const FestivalsGantt = ({ barClassName = "bg-primary" }: Props) => {
  const { festivals, loading } = useFestivals();

  const { items, months, totalDays, minTime } = useMemo(() => {
    const dated = festivals.filter((f): f is Festival & { start_date: string } => !!f.start_date);
    if (dated.length === 0) {
      return { items: [], months: [] as Date[], totalDays: 0, minTime: 0 };
    }

    const starts = dated.map((f) => new Date(f.start_date).getTime());
    const ends = dated.map((f) =>
      new Date(f.end_date ?? f.start_date).getTime(),
    );
    const minTs = Math.min(...starts);
    const maxTs = Math.max(...ends);

    const min = new Date(minTs);
    min.setUTCDate(1);
    const max = new Date(maxTs);
    max.setUTCMonth(max.getUTCMonth() + 1, 1);

    const ms: Date[] = [];
    const cursor = new Date(min);
    while (cursor < max) {
      ms.push(new Date(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const total = Math.round((max.getTime() - min.getTime()) / MS_DAY);
    const sorted = [...dated].sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );

    return { items: sorted, months: ms, totalDays: total, minTime: min.getTime() };
  }, [festivals]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading timeline…</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No dated festivals yet.</div>
    );
  }

  const LABEL_W = 220;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="flex border-b border-border sticky top-0 bg-background z-10">
          <div
            className="shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground"
            style={{ width: LABEL_W }}
          >
            Festival
          </div>
          <div className="flex-1 relative h-8">
            <div className="absolute inset-0 flex">
              {months.map((m, i) => {
                const next = new Date(m);
                next.setUTCMonth(next.getUTCMonth() + 1);
                const days = Math.round((next.getTime() - m.getTime()) / MS_DAY);
                const widthPct = (days / totalDays) * 100;
                return (
                  <div
                    key={i}
                    className="border-l border-border/60 px-2 py-2 text-[11px] text-muted-foreground whitespace-nowrap"
                    style={{ width: `${widthPct}%` }}
                  >
                    {fmtMonth(m)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div>
          {items.map((f) => {
            const start = new Date(f.start_date!).getTime();
            const end = new Date(f.end_date ?? f.start_date!).getTime();
            const leftPct = ((start - minTime) / MS_DAY / totalDays) * 100;
            const spanDays = Math.max(
              1,
              Math.round((end - start) / MS_DAY) + 1,
            );
            const widthPct = (spanDays / totalDays) * 100;
            return (
              <div
                key={f.id}
                className="flex items-center border-b border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div
                  className="shrink-0 px-3 py-2 text-sm truncate"
                  style={{ width: LABEL_W }}
                  title={f.name}
                >
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {f.city ? `${f.city}, ` : ""}
                    {f.country ?? ""}
                  </div>
                </div>
                <div className="flex-1 relative h-12">
                  {/* month gridlines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {months.map((m, i) => {
                      const next = new Date(m);
                      next.setUTCMonth(next.getUTCMonth() + 1);
                      const days = Math.round(
                        (next.getTime() - m.getTime()) / MS_DAY,
                      );
                      const widthPct = (days / totalDays) * 100;
                      return (
                        <div
                          key={i}
                          className="border-l border-border/40 h-full"
                          style={{ width: `${widthPct}%` }}
                        />
                      );
                    })}
                  </div>
                  {/* bar */}
                  <a
                    href={f.website_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${barClassName} text-primary-foreground text-[11px] px-2 flex items-center shadow-sm hover:opacity-90`}
                    style={{
                      left: `${leftPct}%`,
                      width: `max(${widthPct}%, 90px)`,
                    }}
                    title={`${f.name} · ${fmtRange(f.start_date!, f.end_date)}`}
                  >
                    <span className="truncate">
                      {fmtRange(f.start_date!, f.end_date)}
                    </span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

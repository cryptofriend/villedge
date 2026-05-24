import { Village } from "@/hooks/useVillages";
import { VillageSocialIcons } from "@/components/VillageSocialIcons";
import { MapPin, Calendar, Users, Globe, ExternalLink, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { SocialWebSwitcher } from "./SocialWebSwitcher";

interface VillageAboutProps {
  village: Village;
}

// Extract username from social URLs
const extractTwitterUsername = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean)[0];
    return path || null;
  } catch {
    return null;
  }
};

const extractInstagramUsername = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean)[0];
    return path || null;
  } catch {
    return null;
  }
};


export const VillageAbout = ({ village }: VillageAboutProps) => {
  const aboutContent = (village as any).about_content as string | null;
  const twitterUsername = extractTwitterUsername(village.twitter_url);
  const instagramUsername = extractInstagramUsername(village.instagram_url);

  // Parse village.dates (free text like "June 1-15, 2025") into ISO start/end
  const parseDates = (input: string | null | undefined): { start: string | null; end: string | null } => {
    if (!input) return { start: null, end: null };
    const yearMatch = input.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    const months: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
      sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
    };
    const re = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–to]+\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?/;
    const m = input.match(re);
    if (!m) return { start: null, end: null };
    const m1 = months[m[1].toLowerCase()];
    if (m1 === undefined) return { start: null, end: null };
    const d1 = parseInt(m[2], 10);
    const start = new Date(Date.UTC(year, m1, d1)).toISOString().slice(0, 10);
    let end: string | null = null;
    if (m[4]) {
      const m2 = m[3] ? months[m[3].toLowerCase()] ?? m1 : m1;
      const d2 = parseInt(m[4], 10);
      end = new Date(Date.UTC(year, m2, d2)).toISOString().slice(0, 10);
    }
    return { start, end };
  };

  const { start: startDate, end: endDate } = parseDates(village.dates);

  // JSON-LD structured data for SEO
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": village.village_type === "popup" ? "Event" : "Organization",
    name: village.name,
    description: village.description,
    ...(village.village_type === "popup"
      ? {
          startDate: startDate || new Date(village.created_at || Date.now()).toISOString().slice(0, 10),
          ...(endDate && { endDate }),
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: village.location,
            address: {
              "@type": "PostalAddress",
              addressLocality: village.location,
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: village.center[1],
              longitude: village.center[0],
            },
          },
          organizer: {
            "@type": "Organization",
            name: village.name,
            ...(village.website_url && { url: village.website_url }),
          },
        }
      : {
          address: {
            "@type": "PostalAddress",
            addressLocality: village.location,
          },
        }),
    ...(village.logo_url && { image: village.logo_url }),
    ...(village.website_url && { url: village.website_url }),
  };

  return (
    <article className="flex flex-col p-4 flex-1 min-h-0" itemScope itemType={village.village_type === "popup" ? "https://schema.org/Event" : "https://schema.org/Organization"}>
      {/* JSON-LD for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Social / Web Switcher */}
      <div className="flex flex-col flex-1 min-h-0">
        {((twitterUsername || instagramUsername) || village.website_url) && (
          <SocialWebSwitcher
            village={village}
            twitterUsername={twitterUsername}
            instagramUsername={instagramUsername}
            backlinkSlot={
              <div className="space-y-3">
                {(village.website_url || village.apply_url) && (
                  <div className="flex flex-wrap gap-2">
                    {village.website_url && (
                      <a
                        href={village.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        itemProp="url"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {village.apply_url && (
                      <a
                        href={village.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        Apply
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                )}
                <VillageSocialIcons village={village as any} />
              </div>
            }
          />
        )}
      </div>

      {/* Coordinates meta for SEO */}
      <meta itemProp="latitude" content={String(village.center[1])} />
      <meta itemProp="longitude" content={String(village.center[0])} />
    </article>
  );
};

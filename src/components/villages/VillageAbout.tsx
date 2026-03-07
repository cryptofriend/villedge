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

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": village.village_type === "popup" ? "Event" : "Organization",
    name: village.name,
    description: village.description,
    ...(village.village_type === "popup"
      ? {
          location: {
            "@type": "Place",
            name: village.location,
            geo: {
              "@type": "GeoCoordinates",
              latitude: village.center[1],
              longitude: village.center[0],
            },
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
      {((twitterUsername || instagramUsername) || village.website_url) ? (
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
      ) : null}

      {/* Coordinates meta for SEO */}
      <meta itemProp="latitude" content={String(village.center[1])} />
      <meta itemProp="longitude" content={String(village.center[0])} />
    </article>
  );
};

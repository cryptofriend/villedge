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
    <article className="space-y-5 p-4" itemScope itemType={village.village_type === "popup" ? "https://schema.org/Event" : "https://schema.org/Organization"}>
      {/* JSON-LD for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Social / Web Switcher */}
      {((twitterUsername || instagramUsername) || village.website_url) && (
        <SocialWebSwitcher
          village={village}
          twitterUsername={twitterUsername}
          instagramUsername={instagramUsername}
        />
      )}

      {/* Backlinks */}
      <section className="space-y-3">
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
      </section>

      {/* Header */}
      <header className="flex items-start gap-3">
        {village.logo_url && (
          <img
            src={village.logo_url}
            alt={`${village.name} logo`}
            className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border border-border"
            itemProp="image"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground" itemProp="name">
            {village.name}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span itemProp={village.village_type === "popup" ? "location" : "address"}>
              {village.location}
            </span>
          </div>
        </div>
      </header>

      {/* Key details */}
      <section className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dates</p>
            <p className="text-xs font-medium text-foreground truncate" itemProp={village.village_type === "popup" ? "startDate" : undefined}>
              {village.dates}
            </p>
          </div>
        </div>

        {village.participants && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Participants</p>
              <p className="text-xs font-medium text-foreground truncate">{village.participants}</p>
            </div>
          </div>
        )}

        {village.focus && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 col-span-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Focus</p>
              <p className="text-xs font-medium text-foreground">{village.focus}</p>
            </div>
          </div>
        )}
      </section>

      {/* AI-generated About Content OR fallback description */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">About</h3>
        {aboutContent ? (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-h2:text-sm prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1.5 prose-h3:text-xs prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1" itemProp="description">
            <ReactMarkdown>{aboutContent}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90" itemProp="description">
            {village.description}
          </p>
        )}
      </section>

      {/* Coordinates meta for SEO */}
      <meta itemProp="latitude" content={String(village.center[1])} />
      <meta itemProp="longitude" content={String(village.center[0])} />
    </article>
  );
};

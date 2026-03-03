import { Village } from "@/hooks/useVillages";
import { VillageSocialIcons } from "@/components/VillageSocialIcons";
import { MapPin, Calendar, Users, Globe, ExternalLink, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef } from "react";

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

const TwitterEmbed = ({ username }: { username: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Twitter widget script
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    ref.current?.appendChild(script);

    return () => {
      script.remove();
    };
  }, [username]);

  return (
    <div ref={ref} className="rounded-lg overflow-hidden border border-border">
      <a
        className="twitter-timeline"
        data-height="400"
        data-theme="dark"
        data-chrome="noheader nofooter noborders transparent"
        href={`https://twitter.com/${username}`}
      >
        Loading posts by @{username}...
      </a>
    </div>
  );
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

      {/* Social Embeds */}
      {(twitterUsername || instagramUsername) && (
        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Social</h3>

          {twitterUsername && (
            <TwitterEmbed username={twitterUsername} />
          )}

          {instagramUsername && (
            <a
              href={village.instagram_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3 hover:bg-secondary/60 transition-colors"
            >
              <svg className="h-5 w-5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">@{instagramUsername}</p>
                <p className="text-xs text-muted-foreground">Follow on Instagram</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0" />
            </a>
          )}
        </section>
      )}

      {/* Links & Social */}
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

      {/* Coordinates meta for SEO */}
      <meta itemProp="latitude" content={String(village.center[1])} />
      <meta itemProp="longitude" content={String(village.center[0])} />
    </article>
  );
};
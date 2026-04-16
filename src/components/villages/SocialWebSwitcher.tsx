import { useState } from "react";
import { Village } from "@/hooks/useVillages";
import { ExternalLink, Globe, Search, MapPin, Calendar, Users, Info } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface SocialWebSwitcherProps {
  village: Village;
  twitterUsername: string | null;
  instagramUsername: string | null;
  backlinkSlot?: React.ReactNode;
}

const VillagePageContent = ({ village }: { village: Village }) => {
  const typeLabel = village.village_type === "popup" ? "Popup Village" : "Community";

  return (
    <div className="space-y-4">
      {/* Village header */}
      <header className="flex items-start gap-3">
        {village.logo_url && (
          <img
            src={village.logo_url}
            alt={`${village.name} logo`}
            className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border border-border"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground leading-tight">
            {village.name}
          </h2>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
      </header>

      {/* Key details */}
      <section className="grid grid-cols-2 gap-3">
        {village.location && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Location</p>
              <p className="text-xs font-medium text-foreground truncate">{village.location}</p>
            </div>
          </div>
        )}
        {village.dates && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dates</p>
              <p className="text-xs font-medium text-foreground truncate">{village.dates}</p>
            </div>
          </div>
        )}
        {village.participants && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Participants</p>
              <p className="text-xs font-medium text-foreground truncate">{village.participants}</p>
            </div>
          </div>
        )}
        {village.focus && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 col-span-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Focus</p>
              <p className="text-xs font-medium text-foreground">{village.focus}</p>
            </div>
          </div>
        )}
      </section>

      {/* Description */}
      {village.description && (
        <section>
          <p className="text-sm leading-relaxed text-foreground/90">{village.description}</p>
        </section>
      )}

      {/* Links */}
      <section className="flex flex-wrap gap-2">
        {village.website_url && (
          <a href={village.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {village.apply_url && (
          <a href={village.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
            Apply <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </section>
    </div>
  );
};


// Cache: track which usernames have already had their widget rendered
const renderedTimelines = new Set<string>();

const TwitterEmbed = ({ username }: { username: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const getContainerHeight = () => {
    if (!ref.current) return 600;
    const h = ref.current.clientHeight;
    return h > 100 ? h : 600;
  };

  const loadTimeline = useCallback(() => {
    if (!ref.current) return;
    setLoading(true);
    const container = ref.current;
    const height = String(getContainerHeight());
    container.innerHTML = "";
    const a = document.createElement("a");
    a.className = "twitter-timeline";
    a.setAttribute("data-height", height);
    a.setAttribute("data-theme", "light");
    a.setAttribute("data-chrome", "nofooter noborders");
    a.href = `https://twitter.com/${username}`;
    a.textContent = `Loading posts by @${username}...`;
    container.appendChild(a);

    const win = window as any;
    if (win.twttr?.widgets) {
      win.twttr.widgets.load(container);
      renderedTimelines.add(username);
      setTimeout(() => setLoading(false), 1500);
    } else {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.onload = () => {
        renderedTimelines.add(username);
        setTimeout(() => setLoading(false), 1500);
      };
      document.head.appendChild(script);
    }
  }, [username]);

  useEffect(() => {
    // Delay slightly to let flexbox layout settle before measuring
    const timer = setTimeout(() => loadTimeline(), 100);
    return () => clearTimeout(timer);
  }, [loadTimeline]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">@{username} on X</span>
        <button
          onClick={loadTimeline}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          title="Refresh feed"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
      <div
        ref={ref}
        className="rounded-lg overflow-hidden border border-border bg-background max-w-full flex-1 min-h-0"
        style={{ overflowY: "auto" }}
      />
    </div>
  );
};

const InstagramLink = ({ username, url }: { username: string; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3 hover:bg-secondary/60 transition-colors"
  >
    <svg className="h-5 w-5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">@{username}</p>
      <p className="text-xs text-muted-foreground">Follow on Instagram</p>
    </div>
    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0" />
  </a>
);

const SEOContent = ({ village }: { village: Village }) => {
  const aboutContent = (village as any).about_content as string | null;
  const typeLabel = village.village_type === "popup" ? "Popup Village" : "Community";

  const faqItems = [
    { q: `What is ${village.name}?`, a: village.description },
    village.focus && { q: `What is the focus of ${village.name}?`, a: village.focus },
    village.location && { q: `Where is ${village.name} located?`, a: `${village.name} is located in ${village.location}.` },
    village.dates && { q: `When does ${village.name} take place?`, a: `${village.name} runs during: ${village.dates}.` },
    village.participants && { q: `How many participants does ${village.name} have?`, a: `${village.name} hosts ${village.participants} participants.` },
    village.website_url && { q: `What is the official website of ${village.name}?`, a: `The official website is ${village.website_url}` },
  ].filter(Boolean) as { q: string; a: string }[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Optimized for AI Search & SEO</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This page is structured for search engines and AI assistants like ChatGPT, Perplexity, and Google AI Overviews.
        </p>
      </div>

      {/* Village header */}
      <header className="flex items-start gap-3">
        {village.logo_url && (
          <img
            src={village.logo_url}
            alt={`${village.name} logo`}
            className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border border-border"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground leading-tight">
            {village.name} — {typeLabel}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span>{village.location}</span>
          </div>
        </div>
      </header>

      {/* Key details */}
      <section className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dates</p>
            <p className="text-xs font-medium text-foreground truncate">{village.dates}</p>
          </div>
        </div>
        {village.participants && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Participants</p>
              <p className="text-xs font-medium text-foreground truncate">{village.participants}</p>
            </div>
          </div>
        )}
        {village.focus && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 col-span-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Focus</p>
              <p className="text-xs font-medium text-foreground">{village.focus}</p>
            </div>
          </div>
        )}
      </section>

      {/* About content */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">About</h2>
        {aboutContent ? (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-h2:text-sm prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1.5 prose-h3:text-xs prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1">
            <ReactMarkdown>{aboutContent}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">{village.description}</p>
        )}
      </section>

      {/* FAQ section */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-1">
              <h3 className="text-xs font-semibold text-foreground">{item.q}</h3>
              <p className="text-xs text-foreground/80 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social links */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Connect</h2>
        <div className="flex flex-wrap gap-2">
          {village.twitter_url && (
            <a href={village.twitter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              X / Twitter <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {village.instagram_url && (
            <a href={village.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              Instagram <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {village.telegram_url && (
            <a href={village.telegram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
              Telegram <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {village.website_url && (
            <a href={village.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
              Official Website <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {village.apply_url && (
            <a href={village.apply_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              Apply Now <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
};

export const SocialWebSwitcher = ({ village, twitterUsername, instagramUsername, backlinkSlot }: SocialWebSwitcherProps) => {
  const hasSocial = !!(twitterUsername || instagramUsername);
  const hasWeb = !!village.website_url;

  // Default to "web" (embedded website) if available, otherwise "social"
  const [activeTab, setActiveTab] = useState<"social" | "web" | "seo">(hasWeb ? "web" : hasSocial ? "social" : "seo");

  // Always show switcher now (SEO tab is always available)
  const tabs: { key: "social" | "web" | "seo"; label: string; icon?: React.ReactNode; show: boolean }[] = [
    { key: "social", label: "Social", show: hasSocial },
    { key: "web", label: "Website", icon: <Globe className="h-3 w-3" />, show: hasWeb },
    { key: "seo", label: "SEO", icon: <Search className="h-3 w-3" />, show: true },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <section className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Tab switcher */}
      {visibleTabs.length > 1 ? (
        <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-0.5 w-fit">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {visibleTabs[0]?.label}
        </h3>
      )}

      {/* Social tab content */}
      {activeTab === "social" && hasSocial && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="shrink-0">
            {backlinkSlot}
          </div>
          {instagramUsername && village.instagram_url && (
            <div className="shrink-0">
              <InstagramLink username={instagramUsername} url={village.instagram_url} />
            </div>
          )}
          {twitterUsername && <TwitterEmbed username={twitterUsername} />}
        </div>
      )}

      {/* Web tab content */}
      {activeTab === "web" && hasWeb && village.website_url && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="rounded-lg overflow-hidden border border-border bg-background flex-1 min-h-0">
            <iframe
              src={village.website_url}
              title={`${village.name} website`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-popups"
              loading="lazy"
            />
          </div>
          <a
            href={village.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
          >
            <Globe className="h-3 w-3" />
            Open {(() => { try { return new URL(village.website_url!).hostname; } catch { return village.website_url; } })()}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}

      {/* SEO tab content */}
      {activeTab === "seo" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SEOContent village={village} />
        </div>
      )}
    </section>
  );
};

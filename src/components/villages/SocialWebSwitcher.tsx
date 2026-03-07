import { useState } from "react";
import { Village } from "@/hooks/useVillages";
import { ExternalLink, Globe } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { useRef, useCallback, useEffect } from "react";

interface SocialWebSwitcherProps {
  village: Village;
  twitterUsername: string | null;
  instagramUsername: string | null;
}

// Cache: track which usernames have already had their widget rendered
const renderedTimelines = new Set<string>();

const TwitterEmbed = ({ username }: { username: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const loadTimeline = useCallback(() => {
    if (!ref.current) return;
    setLoading(true);
    const container = ref.current;
    const linkEl = container.querySelector("a.twitter-timeline");
    if (!linkEl) {
      container.innerHTML = "";
      const a = document.createElement("a");
      a.className = "twitter-timeline";
      a.setAttribute("data-height", "500");
      a.setAttribute("data-theme", "light");
      a.setAttribute("data-chrome", "nofooter noborders");
      a.href = `https://twitter.com/${username}`;
      a.textContent = `Loading posts by @${username}...`;
      container.appendChild(a);
    }
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
    loadTimeline();
  }, [loadTimeline]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
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
        className="rounded-lg overflow-hidden border border-border bg-background max-w-full"
        style={{ maxHeight: 500, overflowY: "auto" }}
      >
        <a
          className="twitter-timeline"
          data-height="500"
          data-theme="light"
          data-chrome="nofooter noborders"
          href={`https://twitter.com/${username}`}
        >
          {loading ? "Loading posts..." : `Posts by @${username}`}
        </a>
      </div>
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

export const SocialWebSwitcher = ({ village, twitterUsername, instagramUsername }: SocialWebSwitcherProps) => {
  const hasSocial = !!(twitterUsername || instagramUsername);
  const hasWeb = !!village.website_url;

  // Default to "social" if available, otherwise "web"
  const [activeTab, setActiveTab] = useState<"social" | "web">(hasSocial ? "social" : "web");

  // Only show switcher if both tabs have content
  const showSwitcher = hasSocial && hasWeb;

  return (
    <section className="space-y-3">
      {/* Tab switcher */}
      {showSwitcher ? (
        <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-0.5 w-fit">
          <button
            onClick={() => setActiveTab("social")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "social"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Social
          </button>
          <button
            onClick={() => setActiveTab("web")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "web"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3 w-3" />
            Website
          </button>
        </div>
      ) : (
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {hasSocial ? "Social" : "Website"}
        </h3>
      )}

      {/* Social tab content */}
      {activeTab === "social" && hasSocial && (
        <div className="space-y-4">
          {twitterUsername && <TwitterEmbed username={twitterUsername} />}
          {instagramUsername && village.instagram_url && (
            <InstagramLink username={instagramUsername} url={village.instagram_url} />
          )}
        </div>
      )}

      {/* Web tab content */}
      {activeTab === "web" && hasWeb && village.website_url && (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border bg-background" style={{ height: 500 }}>
            <iframe
              src={village.website_url}
              title={`${village.name} website`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
            />
          </div>
          <a
            href={village.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Globe className="h-3 w-3" />
            Open {new URL(village.website_url).hostname}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}
    </section>
  );
};

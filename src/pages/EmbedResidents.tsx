import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ExternalLink, UserPlus, Loader2 } from "lucide-react";
import { useStays } from "@/hooks/useStays";
import { supabase } from "@/integrations/supabase/client";
import { StayResidentCards } from "@/components/stays/StayResidentCards";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

/**
 * Embeddable residents grid for a single village.
 * - Renders the same residents UI used inside the app
 * - Posts messages to the parent window on load / when residents change
 * - Provides an "Add yourself" button that opens villedge.tech in a new tab
 *
 * URL: /embed/:villageSlug/residents?mode=interactive&theme=light
 */
const EmbedResidents = () => {
  const { villageSlug } = useParams<{ villageSlug: string }>();
  const [params] = useSearchParams();
  const interactive = (params.get("mode") ?? "interactive") !== "readonly";
  const villageId = villageSlug ?? "";

  const { stays, loading } = useStays(villageId);
  const [villageName, setVillageName] = useState<string>("");
  const [applyUrl, setApplyUrl] = useState<string | null>(null);
  const lastCountRef = useRef<number>(-1);

  // Look up village name + apply URL (lightweight - 1 row)
  useEffect(() => {
    if (!villageId) return;
    let cancelled = false;
    supabase
      .from("villages")
      .select("name, apply_url")
      .eq("id", villageId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setVillageName(data.name ?? "");
        setApplyUrl(data.apply_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [villageId]);

  // postMessage bridge: notify parent when data changes
  useEffect(() => {
    if (loading) return;
    if (lastCountRef.current === stays.length) return;
    const prev = lastCountRef.current;
    lastCountRef.current = stays.length;
    if (typeof window === "undefined" || window.parent === window) return;
    try {
      window.parent.postMessage(
        {
          type: prev === -1 ? "villedge:residents-loaded" : "villedge:residents-changed",
          villageId,
          count: stays.length,
        },
        "*",
      );
    } catch {
      /* noop */
    }
  }, [stays.length, loading, villageId]);

  // Auto-resize: tell parent the content height
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const post = () => {
      try {
        window.parent.postMessage(
          {
            type: "villedge:resize",
            villageId,
            height: document.documentElement.scrollHeight,
          },
          "*",
        );
      } catch {
        /* noop */
      }
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [villageId, stays.length, loading]);

  const addUrl = useMemo(() => {
    // Open the village residents tab on villedge.tech in a new tab.
    // The user can log in and submit there; realtime + our postMessage will
    // reflect the new resident inside the iframe automatically.
    const origin = "https://villedge.tech";
    return applyUrl || `${origin}/${villageId}/residents`;
  }, [applyUrl, villageId]);

  const handleAdd = () => {
    if (typeof window === "undefined") return;
    window.open(addUrl, "_blank", "noopener,noreferrer");
    try {
      window.parent?.postMessage(
        { type: "villedge:add-resident-clicked", villageId, url: addUrl },
        "*",
      );
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <SEO
        title={`Residents — ${villageName || villageSlug}`}
        description="Embeddable residents list for a Villedge village."
        path={`/embed/${villageSlug}/residents`}
        noIndex
      />
      <main className="min-h-screen bg-background px-3 py-3">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-semibold text-foreground">
              Residents{villageName ? ` — ${villageName}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${stays.length} resident${stays.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {interactive && (
            <Button onClick={handleAdd} size="sm" className="shrink-0 gap-1">
              <UserPlus className="h-4 w-4" />
              Add yourself
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading residents…
          </div>
        ) : (
          <StayResidentCards stays={stays} loading={false} applyUrl={applyUrl} />
        )}

        <footer className="mt-4 flex justify-end">
          <a
            href={`https://villedge.tech/${villageId}/residents`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Powered by Villedge
            <ExternalLink className="h-3 w-3" />
          </a>
        </footer>
      </main>
    </>
  );
};

export default EmbedResidents;

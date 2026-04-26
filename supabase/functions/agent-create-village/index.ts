import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://villedge.tech";

// ── Retry with backoff ──────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  backoffMs = [3000, 10000, 30000]
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isDnsOrNetwork =
        e?.message?.includes("dns") ||
        e?.message?.includes("nodename") ||
        e?.message?.includes("ENOTFOUND") ||
        e?.message?.includes("NetworkError") ||
        e?.message?.includes("fetch failed") ||
        e?.message?.includes("connection") ||
        e?.name === "TypeError";
      if (!isDnsOrNetwork || attempt >= maxRetries) {
        throw e;
      }
      const delay = backoffMs[attempt] || 30000;
      console.warn(
        `[retry] ${label} attempt ${attempt + 1}/${maxRetries} failed (${e?.message}), retrying in ${delay}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ── Twitter/X OAuth 1.0a ────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function postTweet(text: string): Promise<boolean> {
  const consumerKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    const missing = [
      !consumerKey && "CONSUMER_KEY",
      !consumerSecret && "CONSUMER_SECRET",
      !accessToken && "ACCESS_TOKEN",
      !accessTokenSecret && "ACCESS_TOKEN_SECRET",
    ].filter(Boolean);
    console.error(`Twitter credentials missing: ${missing.join(", ")}`);
    throw new Error(`missing_x_credentials: ${missing.join(", ")}`);
  }

  const method = "POST";
  const url = "https://api.x.com/2/tweets";
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, baseString);

  const authHeader = `OAuth ${Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ")}, oauth_signature="${percentEncode(signature)}"`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const resBody = await res.text();

  if (!res.ok) {
    console.error(`Twitter API error [${res.status}]:`, resBody);
    // Parse specific error type for agent
    if (res.status === 402) throw new Error("credits_depleted");
    if (res.status === 401) throw new Error("invalid_token");
    if (res.status === 429) throw new Error("rate_limited");
    if (res.status === 403) throw new Error("forbidden_read_only_app");
    throw new Error(`x_api_error_${res.status}`);
  }

  console.log("Tweet posted successfully:", resBody);
  return true;
}

// ── Helpers ─────────────────────────────────────────────────────────

function normalizeDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// ── Scrape ──────────────────────────────────────────────────────────

async function scrapeWebsite(
  url: string
): Promise<{ markdown: string; metadata: Record<string, any> }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  let markdown = "";
  let metadata: Record<string, any> = {};

  if (FIRECRAWL_API_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });
      const data = await res.json();
      markdown = data?.data?.markdown || data?.markdown || "";
      metadata = data?.data?.metadata || data?.metadata || {};
    } catch (e) {
      console.error("Firecrawl failed:", e);
    }
  }

  // Basic HTML scrape for social links, favicon, og:image
  try {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const pageRes = await fetch(formattedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });
    const html = await pageRes.text();

    const ogTitle = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    )?.[1];
    const ogDesc = html.match(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
    )?.[1];
    const ogImage = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    )?.[1];
    const title = html
      .match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?.trim();

    metadata = {
      ...metadata,
      title: ogTitle || title || metadata.title,
      description: ogDesc || metadata.description,
      ogImage: ogImage || metadata.ogImage,
    };

    const twitterMatch = html.match(
      /href=["'](https?:\/\/(?:www\.)?(twitter|x)\.com\/[^"'\s]+)["']/i
    );
    if (
      twitterMatch &&
      !twitterMatch[1].includes("/share") &&
      !twitterMatch[1].includes("/intent")
    )
      metadata.twitter_url = twitterMatch[1];

    const instaMatch = html.match(
      /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/i
    );
    if (instaMatch && !instaMatch[1].includes("/share"))
      metadata.instagram_url = instaMatch[1];

    const tgMatch = html.match(
      /href=["'](https?:\/\/(?:www\.)?(t\.me|telegram\.me)\/[^"'\s]+)["']/i
    );
    if (tgMatch) metadata.telegram_url = tgMatch[1];

    const fbMatch = html.match(
      /href=["'](https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^"'\s]+)["']/i
    );
    if (fbMatch && !fbMatch[1].includes("/sharer"))
      metadata.facebook_url = fbMatch[1];

    const domain = new URL(formattedUrl).hostname.replace("www.", "");
    const faviconMatch = html.match(
      /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i
    );
    if (faviconMatch?.[1]) {
      let href = faviconMatch[1];
      if (href.startsWith("//")) href = "https:" + href;
      else if (href.startsWith("/"))
        href = new URL(formattedUrl).origin + href;
      else if (!href.startsWith("http"))
        href = new URL(formattedUrl).origin + "/" + href;
      metadata.favicon_url = href;
    } else {
      metadata.favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    const mapsMatch = html.match(
      /href=["'](https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^"'\s]*)["']/i
    );
    if (mapsMatch) metadata.maps_url = mapsMatch[1];
  } catch (e) {
    console.error("HTML scrape failed:", e);
  }

  return { markdown, metadata };
}

// ── AI structuring ──────────────────────────────────────────────────

interface VillageData {
  website_url: string;
  name?: string;
  description?: string;
  dates?: string;
  village_type?: string;
  favicon_url?: string;
  thumbnail_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  telegram_url?: string;
  facebook_url?: string;
  location_hint?: string;
  maps_url?: string;
}

async function structureWithAI(
  markdown: string,
  metadata: Record<string, any>,
  websiteUrl: string
): Promise<VillageData> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return {
      website_url: websiteUrl,
      name: metadata.title,
      description: metadata.description,
      favicon_url: metadata.favicon_url,
      thumbnail_url: metadata.ogImage,
      twitter_url: metadata.twitter_url,
      instagram_url: metadata.instagram_url,
      telegram_url: metadata.telegram_url,
      facebook_url: metadata.facebook_url,
      maps_url: metadata.maps_url,
    };
  }

  const prompt = `Extract structured village/community/event data from this website content. Return a JSON object with these fields:

- name: The community/village/event name (clean, without taglines)
- description: A 1-2 sentence description
- dates: Date range string like "Mar 15 - Apr 20, 2025" or "Permanent" if no dates found
- village_type: "popup" if it has specific start/end dates, "permanent" if ongoing
- location_hint: The city/country/region where this takes place (e.g. "Mui Ne, Vietnam")
- maps_url: Any Google Maps or location URL found in the content (null if none)

Website URL: ${websiteUrl}
Page title: ${metadata.title || "unknown"}

Website content:
${markdown.slice(0, 6000)}

Return ONLY valid JSON, no markdown fences.`;

  try {
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You extract structured data from websites. Always return valid JSON.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);
    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(content);

    return {
      website_url: websiteUrl,
      name: parsed.name || metadata.title,
      description: parsed.description || metadata.description,
      dates: parsed.dates || "Permanent",
      village_type: parsed.village_type || "popup",
      location_hint: parsed.location_hint,
      maps_url: parsed.maps_url || metadata.maps_url,
      favicon_url: metadata.favicon_url,
      thumbnail_url: metadata.ogImage,
      twitter_url: metadata.twitter_url || parsed.twitter_url,
      instagram_url: metadata.instagram_url || parsed.instagram_url,
      telegram_url: metadata.telegram_url || parsed.telegram_url,
      facebook_url: metadata.facebook_url || parsed.facebook_url,
    };
  } catch (e) {
    console.error("AI structuring failed:", e);
    return {
      website_url: websiteUrl,
      name: metadata.title,
      description: metadata.description,
      favicon_url: metadata.favicon_url,
      thumbnail_url: metadata.ogImage,
      twitter_url: metadata.twitter_url,
      instagram_url: metadata.instagram_url,
      telegram_url: metadata.telegram_url,
      facebook_url: metadata.facebook_url,
      maps_url: metadata.maps_url,
    };
  }
}

// ── Maps resolution ─────────────────────────────────────────────────

async function resolveMapUrl(
  mapsUrl: string
): Promise<{ coordinates: [number, number]; name?: string } | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/resolve-google-maps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: mapsUrl }),
      }
    );
    const data = await res.json();
    if (data.success && data.data?.coordinates) {
      return { coordinates: data.data.coordinates, name: data.data.name };
    }
  } catch (e) {
    console.error("Maps resolution failed:", e);
  }
  return null;
}

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (obj: Record<string, any>, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // ── Auth ────────────────────────────────────────────────────────
  const AGENT_KEY = Deno.env.get("VILLEDGE_AGENT_API_KEY");
  if (!AGENT_KEY) {
    return json({ status: "error", message: "Agent API not configured" }, 500);
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token !== AGENT_KEY) {
    return json({ status: "error", message: "Unauthorized" }, 401);
  }

  // ── Parse request ───────────────────────────────────────────────
  let body: {
    website?: string;
    maps_url?: string;
    source?: string;
    mode?: string;
    tweet_text?: string;
    // Override fields — agent can supply these to skip/augment AI extraction
    name?: string;
    description?: string;
    dates?: string;
    village_type?: string;
    location?: string;
    facebook_url?: string;
    twitter_url?: string;
    instagram_url?: string;
    telegram_url?: string;
    logo_url?: string;
    thumbnail_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ status: "error", message: "Invalid JSON body" }, 400);
  }

  const website = body.website?.trim();
  if (!website) {
    return json({ status: "error", message: "website is required" }, 400);
  }

  // Validate URL
  let formattedUrl: string;
  try {
    formattedUrl = website.startsWith("http") ? website : `https://${website}`;
    new URL(formattedUrl); // throws if invalid
  } catch {
    return json({ status: "error", message: "Invalid website URL" }, 400);
  }

  const domain = normalizeDomain(formattedUrl);
  const logPrefix = `[agent] ${new Date().toISOString()} | ${domain}`;
  console.log(`${logPrefix} | START | source=${body.source || "agent"}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Duplicate check (by website domain) ─────────────────────────
  const { data: existing } = await withRetry(
    async () => await supabase.from("villages").select("id, name, website_url").not("website_url", "is", null),
    "duplicate-check-domain"
  );

  if (existing) {
    const dup = existing.find((v: any) => {
      if (!v.website_url) return false;
      return normalizeDomain(v.website_url) === domain;
    });
    if (dup) {
      console.log(`${logPrefix} | DUPLICATE | slug=${dup.id}`);
      return json({
        status: "duplicate",
        name: dup.name,
        slug: dup.id,
        link: `${SITE_URL}/${dup.id}`,
        message: "already exists",
      });
    }
  }

  // ── Scrape & structure ──────────────────────────────────────────
  console.log(`${logPrefix} | SCRAPING`);
  const { markdown, metadata } = await scrapeWebsite(formattedUrl);
  const villageData = await structureWithAI(markdown, metadata, formattedUrl);

  // Apply body overrides (agent-supplied values take priority)
  if (body.name) villageData.name = body.name;
  if (body.description) villageData.description = body.description;
  if (body.dates) villageData.dates = body.dates;
  if (body.village_type) villageData.village_type = body.village_type;
  if (body.location) villageData.location_hint = body.location;
  if (body.facebook_url) villageData.facebook_url = body.facebook_url;
  if (body.twitter_url) villageData.twitter_url = body.twitter_url;
  if (body.instagram_url) villageData.instagram_url = body.instagram_url;
  if (body.telegram_url) villageData.telegram_url = body.telegram_url;
  if (body.logo_url) villageData.favicon_url = body.logo_url;
  if (body.thumbnail_url) villageData.thumbnail_url = body.thumbnail_url;

  if (!villageData.name) {
    console.log(`${logPrefix} | ERROR | could not extract name`);
    return json({
      status: "error",
      message: "Could not extract village information from website",
    });
  }

  // ── Duplicate check (by slug) ───────────────────────────────────
  const slug = makeSlug(villageData.name);
  const { data: slugCheck } = await withRetry(
    async () => await supabase.from("villages").select("id, name").eq("id", slug).maybeSingle(),
    "duplicate-check-slug"
  );

  if (slugCheck) {
    console.log(`${logPrefix} | DUPLICATE | slug=${slug}`);
    return json({
      status: "duplicate",
      name: slugCheck.name,
      slug: slugCheck.id,
      link: `${SITE_URL}/${slugCheck.id}`,
      message: "already exists",
    });
  }

  // ── Resolve location ────────────────────────────────────────────
  const mapsUrl = body.maps_url || villageData.maps_url;
  let coordinates: [number, number] | null = null;
  let locationName = villageData.location_hint || "";

  if (mapsUrl) {
    console.log(`${logPrefix} | RESOLVING MAP | ${mapsUrl}`);
    const mapResult = await withRetry(
      () => resolveMapUrl(mapsUrl),
      "resolve-map"
    );
    if (mapResult) {
      coordinates = mapResult.coordinates;
      if (mapResult.name && !locationName) locationName = mapResult.name;
    }
  }

  if (!coordinates) {
    console.log(`${logPrefix} | NEEDS_LOCATION`);
    return json({
      status: "needs_location",
      name: villageData.name,
      message: "Google Maps URL required. Re-send with maps_url field.",
    });
  }

  // ── Create village ──────────────────────────────────────────────
  let websiteUrl = villageData.website_url?.trim() || "";
  if (websiteUrl && !websiteUrl.startsWith("http"))
    websiteUrl = `https://${websiteUrl}`;

  const { error } = await withRetry(
    () => supabase.from("villages").insert({
      id: slug,
      name: villageData.name,
      location: locationName || "Location",
      center: coordinates,
      dates: villageData.dates || "Permanent",
      description: villageData.description || `Welcome to ${villageData.name}`,
      village_type: villageData.village_type || "popup",
      website_url: websiteUrl || null,
      logo_url: villageData.favicon_url || null,
      thumbnail_url: villageData.thumbnail_url || null,
      twitter_url: villageData.twitter_url || null,
      instagram_url: villageData.instagram_url || null,
      telegram_url: villageData.telegram_url || null,
      facebook_url: villageData.facebook_url || null,
      created_by: null,
    }),
    "insert-village"
  );

  if (error) {
    if (error.code === "23505") {
      console.log(`${logPrefix} | DUPLICATE (insert conflict) | slug=${slug}`);
      return json({
        status: "duplicate",
        name: villageData.name,
        slug,
        link: `${SITE_URL}/${slug}`,
        message: "already exists",
      });
    }
    console.error(`${logPrefix} | ERROR | ${error.message}`);
    return json({ status: "error", message: error.message }, 500);
  }

  // Fire-and-forget: generate about content
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    fetch(`${SUPABASE_URL}/functions/v1/generate-village-about`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ village_id: slug }),
    }).catch(() => {});
  } catch {}

  const link = `${SITE_URL}/${slug}`;
  console.log(`${logPrefix} | PUBLISHED | slug=${slug} | ${link}`);

  // ── Auto-tweet if tweet_text provided ───────────────────────────
  let tweeted = false;
  let tweet_error: string | null = null;
  if (body.tweet_text) {
    console.log(`${logPrefix} | TWEET ATTEMPT | text=${body.tweet_text.slice(0, 80)}...`);
    try {
      tweeted = await postTweet(body.tweet_text);
      if (!tweeted) tweet_error = "post_failed";
      console.log(`${logPrefix} | TWEET | ${tweeted ? "OK" : "FAILED"}`);
    } catch (e: any) {
      tweet_error = e?.message || "unknown_error";
      console.error(`${logPrefix} | TWEET ERROR |`, e);
    }
  }

  return json({
    status: "published",
    name: villageData.name,
    slug,
    link,
    tweeted,
    ...(tweet_error && { tweet_error }),
    message: "created",
  });
});

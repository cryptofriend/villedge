import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

const SITE_URL = "https://villedge.lovable.app";

async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
}

async function getBotTokenForStay(supabase: any, stayId: string): Promise<string | null> {
  const { data: stay } = await supabase.from("stays").select("village_id").eq("id", stayId).maybeSingle();
  if (!stay) return null;

  const { data: village } = await supabase
    .from("villages")
    .select("bot_token, bot_token_secret_name")
    .eq("id", stay.village_id)
    .maybeSingle();

  if (village?.bot_token) return village.bot_token;
  if (village?.bot_token_secret_name) return Deno.env.get(village.bot_token_secret_name) || null;
  return null;
}

// ── /addvillage pipeline ────────────────────────────────────────────

interface ScrapedVillageData {
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
  location_hint?: string;
  maps_url?: string;
}

async function scrapeWebsite(url: string): Promise<{ markdown: string; metadata: any }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

  let markdown = "";
  let metadata: any = {};

  // Try Firecrawl first for rich markdown
  if (FIRECRAWL_API_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });
      const data = await res.json();
      markdown = data?.data?.markdown || data?.markdown || "";
      metadata = data?.data?.metadata || data?.metadata || {};
      console.log("Firecrawl scraped, markdown length:", markdown.length);
    } catch (e) {
      console.error("Firecrawl failed:", e);
    }
  }

  // Also do a basic HTML scrape for social links, favicon, og:image, dates
  try {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const pageRes = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });
    const html = await pageRes.text();

    // Extract OG metadata
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

    metadata = {
      ...metadata,
      title: ogTitle || title || metadata.title,
      description: ogDesc || metadata.description,
      ogImage: ogImage || metadata.ogImage,
    };

    // Extract social links from HTML
    const twitterMatch = html.match(/href=["'](https?:\/\/(?:www\.)?(twitter|x)\.com\/[^"'\s]+)["']/i);
    if (twitterMatch && !twitterMatch[1].includes("/share") && !twitterMatch[1].includes("/intent")) {
      metadata.twitter_url = twitterMatch[1];
    }
    const instaMatch = html.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/i);
    if (instaMatch && !instaMatch[1].includes("/share")) {
      metadata.instagram_url = instaMatch[1];
    }
    const tgMatch = html.match(/href=["'](https?:\/\/(?:www\.)?(t\.me|telegram\.me)\/[^"'\s]+)["']/i);
    if (tgMatch) metadata.telegram_url = tgMatch[1];

    // Extract favicon
    const domain = new URL(formattedUrl).hostname.replace("www.", "");
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i);
    if (faviconMatch?.[1]) {
      let href = faviconMatch[1];
      if (href.startsWith("//")) href = "https:" + href;
      else if (href.startsWith("/")) href = new URL(formattedUrl).origin + href;
      else if (!href.startsWith("http")) href = new URL(formattedUrl).origin + "/" + href;
      metadata.favicon_url = href;
    } else {
      metadata.favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    // Look for Google Maps links in the HTML
    const mapsMatch = html.match(/href=["'](https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^"'\s]*)["']/i);
    if (mapsMatch) metadata.maps_url = mapsMatch[1];
  } catch (e) {
    console.error("HTML scrape failed:", e);
  }

  return { markdown, metadata };
}

async function structureWithAI(markdown: string, metadata: any, websiteUrl: string): Promise<ScrapedVillageData> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not set, using basic metadata");
    return {
      website_url: websiteUrl,
      name: metadata.title,
      description: metadata.description,
      favicon_url: metadata.favicon_url,
      thumbnail_url: metadata.ogImage,
      twitter_url: metadata.twitter_url,
      instagram_url: metadata.instagram_url,
      telegram_url: metadata.telegram_url,
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
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from websites. Always return valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("AI error:", aiRes.status, await aiRes.text());
      throw new Error("AI failed");
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    // Strip markdown fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(content);
    console.log("AI structured data:", parsed);

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
      maps_url: metadata.maps_url,
    };
  }
}

async function resolveMapUrl(mapsUrl: string): Promise<{ coordinates: [number, number]; name?: string } | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-google-maps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: mapsUrl }),
    });
    const data = await res.json();
    if (data.success && data.data?.coordinates) {
      return { coordinates: data.data.coordinates, name: data.data.name };
    }
  } catch (e) {
    console.error("Maps resolution failed:", e);
  }
  return null;
}

async function createVillage(
  supabase: any,
  data: ScrapedVillageData,
  coordinates: [number, number],
  locationName: string,
  createdBy?: string
): Promise<{ slug: string; name: string } | { error: string }> {
  const name = data.name || "Unnamed Village";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  let websiteUrl = data.website_url.trim();
  if (websiteUrl && !websiteUrl.startsWith("http")) websiteUrl = `https://${websiteUrl}`;

  const insertData: any = {
    id: slug,
    name,
    location: locationName || "Location",
    center: coordinates,
    dates: data.dates || "Permanent",
    description: data.description || `Welcome to ${name}`,
    village_type: data.village_type || "popup",
    website_url: websiteUrl || null,
    logo_url: data.favicon_url || null,
    thumbnail_url: data.thumbnail_url || null,
    twitter_url: data.twitter_url || null,
    instagram_url: data.instagram_url || null,
    telegram_url: data.telegram_url || null,
    created_by: createdBy || null,
  };

  const { error } = await supabase.from("villages").insert(insertData);

  if (error) {
    if (error.code === "23505") return { error: "A village with this name already exists" };
    console.error("Insert error:", error);
    return { error: error.message };
  }

  // Auto-generate about content (fire-and-forget)
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    fetch(`${SUPABASE_URL}/functions/v1/generate-village-about`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ village_id: slug }),
    }).catch((e) => console.error("About generation fire-and-forget failed:", e));
  } catch (e) {
    console.error("Could not trigger about generation:", e);
  }

  return { slug, name };
}

async function handleAddVillage(
  supabase: any,
  botToken: string,
  chatId: number,
  username: string | undefined,
  urlArg: string
): Promise<void> {
  // Step 1: Acknowledge
  await sendTelegramMessage(botToken, chatId, "🔍 Analyzing website...");

  // Step 2: Scrape
  let formattedUrl = urlArg.trim();
  if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

  const { markdown, metadata } = await scrapeWebsite(formattedUrl);

  // Step 3: Structure with AI
  const villageData = await structureWithAI(markdown, metadata, formattedUrl);

  if (!villageData.name) {
    await sendTelegramMessage(botToken, chatId, "❌ Could not extract village info from that URL. Please check the link and try again.");
    return;
  }

  // Step 4: Try to resolve location
  let coordinates: [number, number] | null = null;
  let locationName = villageData.location_hint || "";

  if (villageData.maps_url) {
    const mapResult = await resolveMapUrl(villageData.maps_url);
    if (mapResult) {
      coordinates = mapResult.coordinates;
      if (mapResult.name && !locationName) locationName = mapResult.name;
    }
  }

  if (coordinates) {
    // We have everything — create the village
    await finalizeVillage(supabase, botToken, chatId, username, villageData, coordinates, locationName);
  } else {
    // Need a maps link — store pending and ask
    await supabase.from("pending_villages").delete().eq("chat_id", String(chatId));
    await supabase.from("pending_villages").insert({
      chat_id: String(chatId),
      username: username || null,
      scraped_data: villageData,
      status: "awaiting_location",
    });

    const preview = [
      `✅ <b>${villageData.name}</b>`,
      villageData.dates ? `📅 ${villageData.dates}` : null,
      villageData.location_hint ? `📍 ${villageData.location_hint}` : null,
      villageData.description ? `\n${villageData.description.slice(0, 150)}...` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await sendTelegramMessage(
      botToken,
      chatId,
      `${preview}\n\n📌 <b>Now send me a Google Maps link</b> for the exact location.\n\nPaste a Google Maps or Kakao Maps share link to complete the listing.`
    );
  }
}

async function finalizeVillage(
  supabase: any,
  botToken: string,
  chatId: number,
  username: string | undefined,
  data: ScrapedVillageData,
  coordinates: [number, number],
  locationName: string
): Promise<void> {
  // Try to find the user's Supabase ID from their telegram username
  let createdBy: string | undefined;
  if (username) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("telegram_id", username)
      .maybeSingle();
    if (profile?.user_id) createdBy = profile.user_id;
  }

  const result = await createVillage(supabase, data, coordinates, locationName, createdBy);

  if ("error" in result) {
    await sendTelegramMessage(botToken, chatId, `❌ ${result.error}`);
    return;
  }

  const villageUrl = `${SITE_URL}/${result.slug}`;
  const lines = [
    `🏘 <b>${result.name}</b> has been added to Villedge!`,
    "",
    `🔗 ${villageUrl}`,
    "",
    data.dates && data.dates !== "Permanent" ? `📅 ${data.dates}` : null,
    locationName ? `📍 ${locationName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramMessage(botToken, chatId, lines);
}

async function handleMapsLink(
  supabase: any,
  botToken: string,
  chatId: number,
  username: string | undefined,
  mapsUrl: string
): Promise<boolean> {
  // Check for pending village
  const { data: pending } = await supabase
    .from("pending_villages")
    .select("*")
    .eq("chat_id", String(chatId))
    .eq("status", "awaiting_location")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return false; // No pending village for this chat

  await sendTelegramMessage(botToken, chatId, "📍 Resolving location...");

  const mapResult = await resolveMapUrl(mapsUrl);
  if (!mapResult) {
    await sendTelegramMessage(botToken, chatId, "❌ Could not extract location from that link. Please send a valid Google Maps or Kakao Maps share link.");
    return true;
  }

  const villageData = pending.scraped_data as ScrapedVillageData;
  const locationName = mapResult.name || villageData.location_hint || "";

  // Clean up pending
  await supabase.from("pending_villages").delete().eq("id", pending.id);

  await finalizeVillage(supabase, botToken, chatId, username, villageData, mapResult.coordinates, locationName);
  return true;
}

// ── Main handler ────────────────────────────────────────────────────

function isMapUrl(text: string): boolean {
  return (
    text.includes("google.com/maps") ||
    text.includes("maps.app.goo.gl") ||
    text.includes("goo.gl/maps") ||
    text.includes("map.kakao.com") ||
    text.includes("map.kakao.co")
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const update: TelegramUpdate = await req.json();
    console.log("Received Telegram update:", JSON.stringify(update));

    const message = update.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;
    const username = message.from.username;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    // ── /addvillage <url> ──
    if (text.startsWith("/addvillage")) {
      const urlArg = text.replace(/^\/addvillage\s*/i, "").trim();
      if (!urlArg) {
        await sendTelegramMessage(botToken, chatId, "Usage: <code>/addvillage https://village-website.com</code>");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Run pipeline (don't await in response — but edge functions need to complete)
      await handleAddVillage(supabase, botToken, chatId, username, urlArg);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Maps link (for pending village completion) ──
    if (isMapUrl(text)) {
      const handled = await handleMapsLink(supabase, botToken, chatId, username, text);
      if (handled) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // ── /start command (stay notification subscription) ──
    if (text.startsWith("/start")) {
      const parts = text.split(" ");

      if (parts.length === 1) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "👋 <b>Welcome to Villedge!</b>\n\n" +
            "📌 Add a village: <code>/addvillage https://village-website.com</code>\n\n" +
            "I also notify you about application status updates."
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const payload = parts[1];

      if (payload.startsWith("stay_")) {
        const stayId = payload.replace("stay_", "");
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(stayId)) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const stayBotToken = await getBotTokenForStay(supabase, stayId);
        const tokenToUse = stayBotToken || botToken;

        const { data: stay } = await supabase
          .from("stays")
          .select("id, nickname, village_id, status")
          .eq("id", stayId)
          .maybeSingle();

        if (!stay) {
          await sendTelegramMessage(tokenToUse, chatId, "❌ Application not found.");
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data: village } = await supabase
          .from("villages")
          .select("name")
          .eq("id", stay.village_id)
          .maybeSingle();

        await supabase.from("stay_notifications").upsert(
          {
            stay_id: stayId,
            telegram_chat_id: String(chatId),
            telegram_username: username || null,
          },
          { onConflict: "stay_id" }
        );

        const villageName = village?.name || "the village";
        const statusEmoji = stay.status === "confirmed" ? "✅" : stay.status === "rejected" ? "❌" : "⏳";
        const statusText = stay.status === "confirmed" ? "Confirmed" : stay.status === "rejected" ? "Rejected" : "Pending";

        await sendTelegramMessage(
          tokenToUse,
          chatId,
          `🔔 <b>Notifications Enabled!</b>\n\n` +
            `You'll receive updates about your application to <b>${villageName}</b>.\n\n` +
            `📋 <b>Current Status:</b> ${statusEmoji} ${statusText}`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing Telegram webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

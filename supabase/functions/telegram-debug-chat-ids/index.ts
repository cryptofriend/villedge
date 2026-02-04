import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DebugRequest {
  botTokenSecretName?: string;
  villageId?: string;
  limit?: number;
}

interface TelegramChatInfo {
  id: string;
  type?: string;
  title?: string;
  username?: string;
  lastSeenAt?: string;
}

function safeJson(res: Response) {
  return res.json().catch(() => ({}));
}

// Fetch the bot token secret name from the villages table
async function getVillageBotTokenSecretName(villageId: string): Promise<string | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data, error } = await supabase
      .from("villages")
      .select("bot_token_secret_name")
      .eq("id", villageId)
      .maybeSingle();
    
    if (error || !data?.bot_token_secret_name) {
      console.log(`No bot token secret name found for village ${villageId}`);
      return null;
    }
    
    return data.bot_token_secret_name;
  } catch (e) {
    console.log("Could not fetch village bot token:", e);
    return null;
  }
}

async function pickBotToken(secretName?: string, villageId?: string): Promise<string> {
  const fallback = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  let requested = (secretName || "").trim().toUpperCase();

  // If villageId provided and no explicit secret name, look up from village config
  if (!requested && villageId) {
    const villageSecret = await getVillageBotTokenSecretName(villageId);
    if (villageSecret) {
      requested = villageSecret;
    }
  }

  if (!requested) return fallback;

  // Validate secret name format (alphanumeric + underscores, starts with letter)
  const isValidSecretName = /^[A-Z][A-Z0-9_]*$/.test(requested);
  if (!isValidSecretName) {
    console.log(`Invalid secret name format: ${requested}`);
    return fallback;
  }

  return Deno.env.get(requested) || fallback;
}

function dedupeChats(chats: TelegramChatInfo[]): TelegramChatInfo[] {
  const map = new Map<string, TelegramChatInfo>();
  for (const c of chats) {
    if (!c?.id) continue;
    const prev = map.get(c.id);
    if (!prev) {
      map.set(c.id, c);
      continue;
    }
    // Prefer entries with more metadata
    map.set(c.id, {
      ...prev,
      ...c,
      title: c.title || prev.title,
      username: c.username || prev.username,
      type: c.type || prev.type,
      lastSeenAt: c.lastSeenAt || prev.lastSeenAt,
    });
  }
  return [...map.values()];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as DebugRequest;
    const botToken = await pickBotToken(body.botTokenSecretName, body.villageId);

    if (!botToken) {
      throw new Error("Telegram bot token not configured");
    }

    const limit = Math.max(1, Math.min(100, Number(body.limit || 50)));

    // 1) Verify token (getMe)
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meJson = await safeJson(meRes);
    if (!meJson?.ok) {
      throw new Error(String(meJson?.description || "Telegram getMe failed"));
    }

    // 2) Read recent updates
    const updatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates?limit=${limit}&allowed_updates=${encodeURIComponent(
      JSON.stringify([
        "message",
        "edited_message",
        "channel_post",
        "edited_channel_post",
        "my_chat_member",
        "chat_member",
      ]),
    )}`;

    const updatesRes = await fetch(updatesUrl);
    const updatesJson = await safeJson(updatesRes);

    if (!updatesJson?.ok) {
      throw new Error(String(updatesJson?.description || "Telegram getUpdates failed"));
    }

    const updates: any[] = Array.isArray(updatesJson?.result) ? updatesJson.result : [];
    const chats: TelegramChatInfo[] = [];

    for (const u of updates) {
      const dt = u?.message?.date || u?.channel_post?.date || u?.edited_message?.edit_date || u?.edited_channel_post?.edit_date;
      const lastSeenAt = dt ? new Date(dt * 1000).toISOString() : undefined;

      const candidates = [
        u?.message?.chat,
        u?.edited_message?.chat,
        u?.channel_post?.chat,
        u?.edited_channel_post?.chat,
        u?.my_chat_member?.chat,
        u?.chat_member?.chat,
      ].filter(Boolean);

      for (const c of candidates) {
        chats.push({
          id: String(c.id),
          type: c.type,
          title: c.title,
          username: c.username,
          lastSeenAt,
        });
      }
    }

    const uniqueChats = dedupeChats(chats)
      // Sort: groups/channels first (usually negative IDs)
      .sort((a, b) => {
        const an = Number(a.id);
        const bn = Number(b.id);
        const aGroup = Number.isFinite(an) && an < 0;
        const bGroup = Number.isFinite(bn) && bn < 0;
        if (aGroup !== bGroup) return aGroup ? -1 : 1;
        return (b.lastSeenAt || "").localeCompare(a.lastSeenAt || "");
      });

    const hint =
      uniqueChats.length === 0
        ? "No updates found. In your Telegram group/channel, send a message that the bot can see (e.g., mention it or send /start@yourbot). If the bot has privacy mode enabled, disable it in @BotFather → /setprivacy."
        : undefined;

    return new Response(
      JSON.stringify({
        bot: {
          id: meJson?.result?.id,
          username: meJson?.result?.username,
        },
        chats: uniqueChats,
        hint,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("telegram-debug-chat-ids error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

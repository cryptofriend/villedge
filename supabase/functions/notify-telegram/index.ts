import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function tryResolveChatIdViaBotApi(botToken: string, chatId: string): Promise<string> {
  // Telegram Bot API supports passing @username to getChat; this can return a numeric chat id.
  // If resolution fails (e.g. bot lacks access), keep the original chatId.
  if (!chatId?.startsWith("@")) return chatId;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.ok && json?.result?.id) {
      return String(json.result.id);
    }
    console.log("Telegram getChat did not resolve username (continuing with @username)", {
      chatId,
      error_code: json?.error_code,
      description: json?.description,
    });
  } catch (e) {
    console.log("Telegram getChat lookup failed (continuing with @username)", e);
  }

  return chatId;
}

interface NotificationRequest {
  type: "spot" | "event" | "donation" | "bulletin" | "test" | "resident";
  name?: string;
  description?: string;
  location?: string;
  startTime?: string;
  category?: string;
  // Resident-specific fields
  residentName?: string;
  stayDates?: string;
  intention?: string;
  socialProfile?: string;
  botToken?: string; // Custom bot token for different villages
  // Donation-specific fields
  amount?: number;
  amountUsd?: number;
  symbol?: string;
  from?: string;
  fromName?: string;
  txHash?: string;
  chain?: string;
  treasuryBalance?: number;
  villageId?: string;
  // Bulletin-specific fields
  message?: string;
  bulletinChatId?: string;
  bulletinThreadId?: number;
  // Test-specific fields
  testChatId?: string;
  testThreadId?: number;
}

// Get chat ID from settings table, fallback to env variable
async function getChatId(): Promise<string | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "telegram_chat_id")
      .maybeSingle();
    
    if (!error && data?.value) {
      return data.value;
    }
  } catch (e) {
    console.log("Could not fetch chat ID from settings:", e);
  }
  
  // Fallback to env variable
  return Deno.env.get("TELEGRAM_CHAT_ID") || null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const defaultChatId = await getChatId();

    if (!botToken) {
      throw new Error("Telegram bot token not configured");
    }

    const { type, name, description, location, startTime, category, amount, amountUsd, symbol, from, fromName, txHash, chain, treasuryBalance, villageId, message: bulletinMessage, bulletinChatId, bulletinThreadId, testChatId, testThreadId, residentName, stayDates, intention, socialProfile, botToken: customBotToken }: NotificationRequest = await req.json();
    
    // Use custom bot token if provided, otherwise use default
    const effectiveBotToken = customBotToken || botToken;
    
    // Use test/bulletin-specific chat ID if provided, otherwise use default
    let chatId = testChatId || bulletinChatId || defaultChatId;
    
    if (!chatId) {
      throw new Error("Telegram chat ID not configured");
    }

    // Parse Telegram URL formats
    let parsedThreadId: number | undefined = testThreadId || bulletinThreadId || undefined;
    
    if (chatId.includes('t.me/')) {
      // Support both Telegram link styles:
      // - Private groups/channels (numeric): https://t.me/c/<numeric_id>/<message_or_topic_id>
      // - Public groups/channels (username): https://t.me/<username>/<message_id>
      // Some users also paste an invalid-but-common variant: https://t.me/c/<username>/<id>
      // We treat that as a username and continue.

      const cPathMatch = chatId.match(/t\.me\/c\/([^\/?#\s]+)(?:\/(\d+))?/);
      if (cPathMatch) {
        const idOrUsername = cPathMatch[1];
        if (/^\d+$/.test(idOrUsername)) {
          chatId = `-100${idOrUsername}`;
        } else if (/^[a-zA-Z][a-zA-Z0-9_]{3,}$/.test(idOrUsername)) {
          chatId = `@${idOrUsername}`;
        } else {
          throw new Error(
            "Invalid Telegram URL format. For public channels use: https://t.me/<username>/<post_id>. For private groups use: https://t.me/c/<numeric_id>/<id>."
          );
        }

        if (!parsedThreadId && cPathMatch[2]) {
          parsedThreadId = parseInt(cPathMatch[2], 10);
        }
      } else {
        const publicMatch = chatId.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]{3,})(?:\/(\d+))?/);
        if (publicMatch) {
          chatId = `@${publicMatch[1]}`;
          if (!parsedThreadId && publicMatch[2]) {
            parsedThreadId = parseInt(publicMatch[2], 10);
          }
        } else {
          throw new Error(
            "Invalid Telegram URL format. Use: https://t.me/<username>/<post_id> or https://t.me/c/<numeric_id>/<id>."
          );
        }
      }
    } else if (!chatId.startsWith('@') && !chatId.startsWith('-') && !/^\d+$/.test(chatId)) {
      // If it looks like a username without @, add it
      if (/^[a-zA-Z][a-zA-Z0-9_]{3,}$/.test(chatId)) {
        chatId = `@${chatId}`;
      }
    }

    // If destination is a public username, try resolving to a numeric chat id via Telegram API.
    // This can help when Telegram expects an internal id, but will still fail if the bot lacks access.
    chatId = await tryResolveChatIdViaBotApi(effectiveBotToken, chatId);

    let telegramMessage = "";

    if (type === "test") {
      telegramMessage = `🧪 <b>Test Connection</b>\n\n✅ Your Telegram bot is configured correctly!\n\n📅 ${new Date().toLocaleString()}`;
    } else if (type === "spot") {
      telegramMessage = `📍 <b>New Spot Added</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(name || "Unnamed")}</b>\n`;
      if (category) telegramMessage += `Category: ${escapeHtml(category)}\n`;
      if (description) telegramMessage += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
      // Mini-app deep link for map spots
      telegramMessage += `\n\n🔗 <a href="https://t.me/proofofretreatbot/app">View on Map</a>`;
    } else if (type === "event") {
      telegramMessage = `🗓️ <b>New Event Added</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(name || "Unnamed")}</b>\n`;
      if (startTime) {
        const date = new Date(startTime);
        telegramMessage += `📅 ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}\n`;
        telegramMessage += `🕐 ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\n`;
      }
      if (location) telegramMessage += `📌 ${escapeHtml(location)}\n`;
      if (description) telegramMessage += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
      // Mini-app deep link for events
      telegramMessage += `\n\n🔗 <a href="https://t.me/proofofretreatbot/events">View Events</a>`;
    } else if (type === "donation") {
      telegramMessage = `💰 <b>Treasury Donation Received</b>\n\n`;
      
      // Show donor name/address
      const donor = fromName || (from ? `${from.slice(0, 6)}...${from.slice(-4)}` : "Anonymous");
      telegramMessage += `From: <b>${escapeHtml(donor)}</b>\n`;
      
      // Show amount
      if (amount && symbol) {
        telegramMessage += `Amount: <b>${amount.toFixed(6)} ${escapeHtml(symbol)}</b>\n`;
      }
      if (amountUsd && amountUsd > 0) {
        telegramMessage += `Value: <b>$${amountUsd.toFixed(2)} USD</b>\n`;
      }
      
      // Show chain
      if (chain) {
        telegramMessage += `Chain: ${escapeHtml(chain)}\n`;
      }
      
      // Show treasury balance
      if (treasuryBalance && treasuryBalance > 0) {
        telegramMessage += `\n💼 <b>Treasury Balance: $${treasuryBalance.toFixed(2)} USD</b>\n`;
      }
      
      // Add transaction link
      if (txHash && chain) {
        const explorerUrl = getExplorerUrl(chain, txHash);
        if (explorerUrl) {
          telegramMessage += `\n🔗 <a href="${explorerUrl}">View Transaction</a>`;
        }
      }
      
      // Add top-up link
      const topUpUrl = villageId 
        ? `https://villedge.lovable.app/${villageId}?tab=treasury`
        : `https://villedge.lovable.app`;
      telegramMessage += `\n💳 <a href="${topUpUrl}">Top Up Treasury</a>`;
      
      telegramMessage += `\n\n🙏 Thank you for supporting the village!`;
    } else if (type === "bulletin") {
      // Bulletin notification - send the message with mini-app link
      telegramMessage = `📢 <b>New Bulletin Post</b>\n\n"${escapeHtml(bulletinMessage || name || "")}"`;
      // Mini-app deep link for bulletin
      telegramMessage += `\n\n🔗 <a href="https://t.me/proofofretreatbot/bulletin">View Bulletin</a>`;
    } else if (type === "resident") {
      // Resident/stay notification
      telegramMessage = `👋 <b>New Resident Joining!</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(residentName || name || "Someone")}</b>`;
      if (stayDates) {
        telegramMessage += `\n📅 ${escapeHtml(stayDates)}`;
      }
      if (intention) {
        telegramMessage += `\n\n💭 "${escapeHtml(intention.slice(0, 150))}${intention.length > 150 ? "..." : ""}"`;
      }
      if (socialProfile) {
        telegramMessage += `\n\n🔗 <a href="${escapeHtml(socialProfile)}">Profile</a>`;
      }
      // Link to residents view
      const residentsUrl = villageId 
        ? `https://villedge.lovable.app/${villageId}?tab=residents`
        : `https://villedge.lovable.app`;
      telegramMessage += `\n\n👥 <a href="${residentsUrl}">View Residents</a>`;
    }

    const telegramUrl = `https://api.telegram.org/bot${effectiveBotToken}/sendMessage`;
    
    console.log(`Sending Telegram message to chat: ${chatId}${parsedThreadId ? ` (thread: ${parsedThreadId})` : ''}`);
    
    const requestBody: Record<string, unknown> = {
      chat_id: chatId,
      text: telegramMessage,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    
    // Add thread ID for messages sent to specific topics
    if (parsedThreadId) {
      requestBody.message_thread_id = parsedThreadId;
    }
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error("Telegram API error:", result);

      const desc = String(result.description || "Failed to send Telegram message");

      // If thread/topic is invalid, automatically retry without thread_id so notifications still deliver.
      if (parsedThreadId && desc.toLowerCase().includes("message thread not found")) {
        console.log(
          `Thread ${parsedThreadId} not found for chat ${chatId}; retrying without message_thread_id...`
        );

        const retryBody = { ...requestBody };
        delete (retryBody as any).message_thread_id;

        const retryRes = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retryBody),
        });

        const retryJson = await retryRes.json();
        if (retryJson?.ok) {
          console.log("Telegram notification sent successfully (fallback without thread)");
          return new Response(JSON.stringify({ success: true, fallback: "no_thread" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        console.error("Telegram API error (retry without thread failed):", retryJson);
        throw new Error(String(retryJson?.description || desc));
      }

      if (desc.toLowerCase().includes("chat not found")) {
        throw new Error(
          "Bad Request: chat not found. This usually means the @username is wrong OR the bot is not a member/admin of that chat/channel. Add the bot to the target chat (and make it an admin for channels), then retry."
        );
      }
      
      if (desc.toLowerCase().includes("message thread not found")) {
        throw new Error(
          "Bad Request: message thread not found. The Thread ID doesn't exist in this chat. To find a valid Thread ID: open the topic/thread in Telegram, copy the message link, and extract the last number from the URL (e.g., https://t.me/c/123456789/42 → Thread ID is 42). Leave Thread ID empty to post to the main chat."
        );
      }

      throw new Error(desc);
    }

    console.log("Telegram notification sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending Telegram notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getExplorerUrl(chain: string, txHash: string): string | null {
  const explorers: Record<string, string> = {
    'ethereum': `https://etherscan.io/tx/${txHash}`,
    'base': `https://basescan.org/tx/${txHash}`,
    'optimism': `https://optimistic.etherscan.io/tx/${txHash}`,
    'arbitrum': `https://arbiscan.io/tx/${txHash}`,
    'polygon': `https://polygonscan.com/tx/${txHash}`,
    'avalanche': `https://snowtrace.io/tx/${txHash}`,
    'bsc': `https://bscscan.com/tx/${txHash}`,
  };
  return explorers[chain.toLowerCase()] || null;
}

serve(handler);

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
  type: "spot" | "event" | "donation" | "bulletin" | "test" | "resident" | "application_status";
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
  botToken?: string; // Custom bot token for different villages (deprecated, use botTokenSecretName)
  botTokenSecretName?: string; // Secret name to look up (e.g., "PROTOVILLE_BOT_TOKEN")
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
  // Application status notification fields
  stayId?: string;
  newStatus?: string;
  villageName?: string;
  applicantChatId?: string;
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

// Look up notification route from database for village-specific routing
interface NotificationRoute {
  chatId: string;
  threadId: number | null;
  botTokenSecretName: string | null;
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

async function getNotificationRoute(villageId: string, notificationType: string): Promise<NotificationRoute | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data, error } = await supabase
      .from("notification_routes")
      .select("chat_id, thread_id")
      .eq("village_id", villageId)
      .eq("notification_type", notificationType)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (error || !data) {
      console.log(`No notification route found for ${villageId}/${notificationType}`);
      return null;
    }
    
    // Get bot token from village configuration
    const botTokenSecretName = await getVillageBotTokenSecretName(villageId);
    
    return {
      chatId: data.chat_id,
      threadId: data.thread_id,
      botTokenSecretName,
    };
  } catch (e) {
    console.log("Could not fetch notification route:", e);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const defaultBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const defaultChatId = await getChatId();

    const requestBody = await req.json();
    const { 
      type, name, description, location, startTime, category, 
      amount, amountUsd, symbol, from, fromName, txHash, chain, treasuryBalance, villageId, 
      message: bulletinMessage, bulletinChatId, bulletinThreadId, 
      testChatId, testThreadId, 
      residentName, stayDates, intention, socialProfile, 
      botToken: customBotToken,
      botTokenSecretName,
      stayId, newStatus, villageName, applicantChatId
    }: NotificationRequest = requestBody;
    
    // Look up village-specific notification route for certain types
    let routeConfig: NotificationRoute | null = null;
    const routableTypes = ['spots', 'bulletin', 'donations', 'residents', 'events'];
    
    // Map notification type to route type in database
    // Note: database stores singular form (e.g., 'spot' not 'spots')
    const typeToRouteType: Record<string, string> = {
      'spot': 'spot',
      'bulletin': 'bulletin',
      'donation': 'donation',
      'resident': 'resident',
      'event': 'event',
    };
    
    const routeType = typeToRouteType[type];
    if (villageId && routeType) {
      routeConfig = await getNotificationRoute(villageId, routeType);
      if (routeConfig) {
        console.log(`Found notification route for ${villageId}/${routeType}: chat=${routeConfig.chatId}, thread=${routeConfig.threadId}`);
      }
    }
    
    // Determine which bot token to use:
    // 1. If route config has a bot token (from village config), use it
    // 2. Else if villageId is provided, look up from village config
    // 3. Else if botTokenSecretName is provided, look it up from env
    // 4. Else if customBotToken is provided directly, use it
    // 5. Else fallback to default TELEGRAM_BOT_TOKEN
    let effectiveBotToken = defaultBotToken;
    let effectiveBotTokenSecretName: string | undefined = routeConfig?.botTokenSecretName || botTokenSecretName || undefined;
    
    // If no route config but villageId provided, look up village's bot token
    if (!effectiveBotTokenSecretName && villageId) {
      const villageBotToken = await getVillageBotTokenSecretName(villageId);
      if (villageBotToken) {
        effectiveBotTokenSecretName = villageBotToken;
      }
    }
    
    if (effectiveBotTokenSecretName) {
      // Validate secret name format (alphanumeric + underscores, starts with letter)
      const isValidSecretName = /^[A-Z][A-Z0-9_]*$/.test(effectiveBotTokenSecretName);
      if (isValidSecretName) {
        const tokenFromSecret = Deno.env.get(effectiveBotTokenSecretName);
        if (tokenFromSecret) {
          effectiveBotToken = tokenFromSecret;
          console.log(`Using bot token from secret: ${effectiveBotTokenSecretName}`);
        } else {
          console.log(`Secret ${effectiveBotTokenSecretName} not found, falling back to default`);
        }
      } else {
        console.log(`Secret name ${effectiveBotTokenSecretName} has invalid format, using default`);
      }
    } else if (customBotToken) {
      effectiveBotToken = customBotToken;
    }
    
    if (!effectiveBotToken) {
      throw new Error("Telegram bot token not configured");
    }
    
    // Use route config chat ID if available, else test/bulletin-specific, else applicant-specific, else default
    let chatId = type === "application_status" && applicantChatId 
      ? applicantChatId 
      : (routeConfig?.chatId || testChatId || bulletinChatId || defaultChatId);
    
    if (!chatId) {
      throw new Error("Telegram chat ID not configured");
    }

    // Parse Telegram URL formats
    // Use route config thread ID if available, else test/bulletin-specific
    let parsedThreadId: number | undefined = routeConfig?.threadId ?? testThreadId ?? bulletinThreadId ?? undefined;
    
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

    // Village-specific timezone mapping based on location
    const villageTimezoneMap: Record<string, string> = {
      'protoville': 'Asia/Ho_Chi_Minh',
      'proof-of-retreat': 'Asia/Ho_Chi_Minh',
      // Add more villages as needed, default to UTC if not found
    };
    const villageTimezone = villageTimezoneMap[villageId || ''] || 'UTC';

    // Village-specific links (web pages or mini-apps)
    const villageLinksMap: Record<string, { app: string; events: string; bulletin: string }> = {
      'protoville': {
        app: 'https://villedge.tech/protoville',
        events: 'https://villedge.tech/protoville?tab=events',
        bulletin: 'https://villedge.tech/protoville?tab=bulletin',
      },
      'proof-of-retreat': {
        app: 'https://villedge.tech/proof-of-retreat',
        events: 'https://villedge.tech/proof-of-retreat?tab=events',
        bulletin: 'https://villedge.tech/proof-of-retreat?tab=bulletin',
      },
    };
    const miniAppLinks = villageLinksMap[villageId || ''] || {
      app: `https://villedge.tech/${villageId || ''}`,
      events: `https://villedge.tech/${villageId || ''}?tab=events`,
      bulletin: `https://villedge.tech/${villageId || ''}?tab=bulletin`,
    };

    let telegramMessage = "";

    if (type === "test") {
      telegramMessage = `🧪 <b>Test Connection</b>\n\n✅ Your Telegram bot is configured correctly!\n\n📅 ${new Date().toLocaleString()}`;
    } else if (type === "spot") {
      telegramMessage = `📍 <b>New Spot Added</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(name || "Unnamed")}</b>\n`;
      if (category) telegramMessage += `Category: ${escapeHtml(category)}\n`;
      if (description) telegramMessage += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
      // Mini-app deep link for map spots
      telegramMessage += `\n\n🔗 <a href="${miniAppLinks.app}">View on Map</a>`;
    } else if (type === "event") {
      telegramMessage = `🗓️ <b>New Event Added</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(name || "Unnamed")}</b>\n`;
      if (startTime) {
        const date = new Date(startTime);
        // Format date and time in the village's local timezone
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: villageTimezone,
        });
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: villageTimezone,
        });
        telegramMessage += `📅 ${dateFormatter.format(date)}\n`;
        telegramMessage += `🕐 ${timeFormatter.format(date)}\n`;
      }
      if (location) telegramMessage += `📌 ${escapeHtml(location)}\n`;
      if (description) telegramMessage += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
      // Mini-app deep link for events
      telegramMessage += `\n\n🔗 <a href="${miniAppLinks.events}">View Events</a>`;
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
      telegramMessage += `\n\n🔗 <a href="${miniAppLinks.bulletin}">View Bulletin</a>`;
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
      telegramMessage += `\n\n👥 <a href="${miniAppLinks.app}">View Residents</a>`;
    } else if (type === "application_status") {
      // Application status update notification to the applicant
      const statusEmoji = newStatus === "confirmed" ? "✅" : newStatus === "rejected" ? "❌" : "⏳";
      const statusLabel = newStatus === "confirmed" ? "Confirmed" : newStatus === "rejected" ? "Rejected" : "Updated";
      
      telegramMessage = `${statusEmoji} <b>Application Status Update</b>\n\n`;
      telegramMessage += `Your application to <b>${escapeHtml(villageName || "the village")}</b> has been <b>${statusLabel}</b>!\n\n`;
      
      if (newStatus === "confirmed") {
        telegramMessage += `🎉 Congratulations! We look forward to seeing you.\n\n`;
        telegramMessage += `🔗 <a href="${miniAppLinks.app}">View Village Details</a>`;
      } else if (newStatus === "rejected") {
        telegramMessage += `We appreciate your interest. Feel free to apply to other villages!`;
      } else {
        telegramMessage += `🔗 <a href="${miniAppLinks.app}">View Details</a>`;
      }
    }

    const telegramUrl = `https://api.telegram.org/bot${effectiveBotToken}/sendMessage`;
    
    console.log(`Sending Telegram message to chat: ${chatId}${parsedThreadId ? ` (thread: ${parsedThreadId})` : ''}`);
    
    const telegramPayload: Record<string, unknown> = {
      chat_id: chatId,
      text: telegramMessage,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    
    // Add thread ID for messages sent to specific topics
    if (parsedThreadId) {
      telegramPayload.message_thread_id = parsedThreadId;
    }
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telegramPayload),
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

        const retryBody = { ...telegramPayload };
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

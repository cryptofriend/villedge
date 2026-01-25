import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "spot" | "event" | "donation" | "bulletin" | "test";
  name?: string;
  description?: string;
  location?: string;
  startTime?: string;
  category?: string;
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

    const { type, name, description, location, startTime, category, amount, amountUsd, symbol, from, fromName, txHash, chain, treasuryBalance, villageId, message: bulletinMessage, bulletinChatId, bulletinThreadId, testChatId, testThreadId }: NotificationRequest = await req.json();
    
    // Use test/bulletin-specific chat ID if provided, otherwise use default
    let chatId = testChatId || bulletinChatId || defaultChatId;
    
    if (!chatId) {
      throw new Error("Telegram chat ID not configured");
    }

    // Parse Telegram URL format: https://t.me/c/{channel_id}/{thread_id}
    let parsedThreadId: number | undefined = testThreadId || bulletinThreadId || undefined;
    if (chatId.includes('t.me/c/')) {
      const urlMatch = chatId.match(/t\.me\/c\/(\d+)(?:\/(\d+))?/);
      if (urlMatch) {
        // Convert to API format: prepend -100 to the channel ID
        chatId = `-100${urlMatch[1]}`;
        // Use thread from URL if not already specified
        if (!parsedThreadId && urlMatch[2]) {
          parsedThreadId = parseInt(urlMatch[2], 10);
        }
      } else {
        throw new Error("Invalid Telegram URL format. Use: https://t.me/c/{numeric_channel_id}/{thread_id}");
      }
    }

    let telegramMessage = "";

    if (type === "test") {
      telegramMessage = `🧪 <b>Test Connection</b>\n\n✅ Your Telegram bot is configured correctly!\n\n📅 ${new Date().toLocaleString()}`;
    } else if (type === "spot") {
      telegramMessage = `📍 <b>New Spot Added</b>\n\n`;
      telegramMessage += `<b>${escapeHtml(name || "Unnamed")}</b>\n`;
      if (category) telegramMessage += `Category: ${escapeHtml(category)}\n`;
      if (description) telegramMessage += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
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
      // Bulletin notification - send the message with village link
      telegramMessage = `📢 <b>New Bulletin Post</b>\n\n"${escapeHtml(bulletinMessage || name || "")}"`;
      if (villageId) {
        telegramMessage += `\n\n🔗 <a href="https://villedge.lovable.app/${villageId}?tab=bulletin">View Bulletin</a>`;
      }
    }

    if (type !== "donation" && type !== "bulletin" && type !== "test") {
      telegramMessage += `\n\n🔗 <a href="https://map.proofofretreat.me">View on map</a>`;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
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
      throw new Error(result.description || "Failed to send Telegram message");
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

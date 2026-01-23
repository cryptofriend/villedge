import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "spot" | "event" | "donation";
  name: string;
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      throw new Error("Telegram credentials not configured");
    }

    const { type, name, description, location, startTime, category, amount, amountUsd, symbol, from, fromName, txHash, chain }: NotificationRequest = await req.json();

    let message = "";

    if (type === "spot") {
      message = `📍 <b>New Spot Added</b>\n\n`;
      message += `<b>${escapeHtml(name)}</b>\n`;
      if (category) message += `Category: ${escapeHtml(category)}\n`;
      if (description) message += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
    } else if (type === "event") {
      message = `🗓️ <b>New Event Added</b>\n\n`;
      message += `<b>${escapeHtml(name)}</b>\n`;
      if (startTime) {
        const date = new Date(startTime);
        message += `📅 ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}\n`;
        message += `🕐 ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\n`;
      }
      if (location) message += `📌 ${escapeHtml(location)}\n`;
      if (description) message += `\n${escapeHtml(description.slice(0, 200))}${description.length > 200 ? "..." : ""}`;
    } else if (type === "donation") {
      message = `💰 <b>Treasury Donation Received</b>\n\n`;
      
      // Show donor name/address
      const donor = fromName || (from ? `${from.slice(0, 6)}...${from.slice(-4)}` : "Anonymous");
      message += `From: <b>${escapeHtml(donor)}</b>\n`;
      
      // Show amount
      if (amount && symbol) {
        message += `Amount: <b>${amount.toFixed(6)} ${escapeHtml(symbol)}</b>\n`;
      }
      if (amountUsd && amountUsd > 0) {
        message += `Value: <b>$${amountUsd.toFixed(2)} USD</b>\n`;
      }
      
      // Show chain
      if (chain) {
        message += `Chain: ${escapeHtml(chain)}\n`;
      }
      
      // Add transaction link
      if (txHash && chain) {
        const explorerUrl = getExplorerUrl(chain, txHash);
        if (explorerUrl) {
          message += `\n🔗 <a href="${explorerUrl}">View Transaction</a>`;
        }
      }
      
      message += `\n\n🙏 Thank you for supporting the village!`;
    }

    if (type !== "donation") {
      message += `\n\n🔗 <a href="https://map.proofofretreat.me">View on map</a>`;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log(`Sending Telegram message to chat: ${chatId}`);
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
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

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

async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function getBotTokenForStay(supabase: any, stayId: string): Promise<string | null> {
  // Get the village_id for this stay
  const { data: stay, error: stayError } = await supabase
    .from("stays")
    .select("village_id")
    .eq("id", stayId)
    .maybeSingle();

  if (stayError || !stay) {
    console.log("Could not find stay:", stayId);
    return null;
  }

  // Get the bot token secret name for this village
  const { data: village, error: villageError } = await supabase
    .from("villages")
    .select("bot_token_secret_name, name")
    .eq("id", stay.village_id)
    .maybeSingle();

  if (villageError || !village?.bot_token_secret_name) {
    console.log("Village has no bot configured:", stay.village_id);
    return null;
  }

  // Get the actual token from environment
  const token = Deno.env.get(village.bot_token_secret_name);
  if (!token) {
    console.log("Bot token secret not found:", village.bot_token_secret_name);
    return null;
  }

  return token;
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

    // Handle /start command with stay payload
    // Format: /start stay_<uuid>
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      
      if (parts.length === 1) {
        // Just /start without payload - show welcome message
        const defaultToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (defaultToken) {
          await sendTelegramMessage(
            defaultToken,
            chatId,
            "👋 <b>Welcome to Villedge!</b>\n\n" +
            "I'll notify you about your application status updates.\n\n" +
            "To subscribe to notifications for your application, use the link provided after submitting your application."
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const payload = parts[1];
      
      // Check if it's a stay subscription
      if (payload.startsWith("stay_")) {
        const stayId = payload.replace("stay_", "");
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(stayId)) {
          console.log("Invalid stay ID format:", stayId);
          return new Response(JSON.stringify({ ok: true, error: "Invalid stay ID" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Get the bot token for this stay's village
        const botToken = await getBotTokenForStay(supabase, stayId);
        if (!botToken) {
          console.log("No bot token found for stay:", stayId);
          return new Response(JSON.stringify({ ok: true, error: "No bot configured" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Check if stay exists and get details
        const { data: stay, error: stayError } = await supabase
          .from("stays")
          .select("id, nickname, village_id, status")
          .eq("id", stayId)
          .maybeSingle();

        if (stayError || !stay) {
          console.log("Stay not found:", stayId);
          await sendTelegramMessage(
            botToken,
            chatId,
            "❌ Application not found. Please check your link and try again."
          );
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Get village name
        const { data: village } = await supabase
          .from("villages")
          .select("name")
          .eq("id", stay.village_id)
          .maybeSingle();

        // Upsert the notification subscription
        const { error: upsertError } = await supabase
          .from("stay_notifications")
          .upsert(
            {
              stay_id: stayId,
              telegram_chat_id: String(chatId),
              telegram_username: username || null,
            },
            { onConflict: "stay_id" }
          );

        if (upsertError) {
          console.error("Error upserting notification subscription:", upsertError);
          await sendTelegramMessage(
            botToken,
            chatId,
            "❌ Failed to subscribe to notifications. Please try again."
          );
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Send confirmation message
        const villageName = village?.name || "the village";
        const statusEmoji = stay.status === "confirmed" ? "✅" : stay.status === "rejected" ? "❌" : "⏳";
        const statusText = stay.status === "confirmed" ? "Confirmed" : stay.status === "rejected" ? "Rejected" : "Pending";

        await sendTelegramMessage(
          botToken,
          chatId,
          `🔔 <b>Notifications Enabled!</b>\n\n` +
          `You'll receive updates about your application to <b>${villageName}</b>.\n\n` +
          `📋 <b>Current Status:</b> ${statusEmoji} ${statusText}\n\n` +
          `You'll be notified when your application status changes.`
        );

        console.log(`Subscription created: stay=${stayId}, chat=${chatId}`);
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

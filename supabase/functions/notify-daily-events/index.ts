import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  // Format in Vietnam timezone (UTC+7)
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!telegramBotToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date range in Vietnam timezone
    const now = new Date();
    const vietnamOffset = 7 * 60 * 60 * 1000; // UTC+7
    const vietnamNow = new Date(now.getTime() + vietnamOffset);
    
    // Start of today in Vietnam
    const todayStart = new Date(vietnamNow);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = new Date(todayStart.getTime() - vietnamOffset);
    
    // End of today in Vietnam
    const todayEnd = new Date(vietnamNow);
    todayEnd.setUTCHours(23, 59, 59, 999);
    const todayEndUtc = new Date(todayEnd.getTime() - vietnamOffset);

    console.log(`Fetching events for today (Vietnam time): ${todayStart.toISOString().split('T')[0]}`);

    // Fetch today's events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .gte("start_time", todayStartUtc.toISOString())
      .lte("start_time", todayEndUtc.toISOString())
      .order("start_time", { ascending: true });

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    console.log(`Found ${events?.length || 0} events for today`);

    // Check for notification route
    const { data: route } = await supabase
      .from("notification_routes")
      .select("*")
      .eq("notification_type", "daily_events")
      .eq("is_enabled", true)
      .single();

    // Default to the provided chat/thread if no route configured
    const chatId = route?.chat_id || "-1003580489932";
    const threadId = route?.thread_id || 71;

    if (!events || events.length === 0) {
      // Send "no events" message
      const noEventsMessage = `📅 <b>Today's Events</b>\n\n<i>No events scheduled for today.</i>\n\nHave a great day! ☀️`;
      
      await sendTelegramMessage(telegramBotToken, chatId, threadId, noEventsMessage);
      
      return new Response(
        JSON.stringify({ success: true, message: "No events today notification sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the events message
    const dateStr = vietnamNow.toLocaleDateString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    let message = `📅 <b>Today's Events - ${escapeHtml(dateStr)}</b>\n\n`;

    events.forEach((event, index) => {
      const startTime = formatTime(event.start_time);
      const endTime = event.end_time ? ` - ${formatTime(event.end_time)}` : "";
      const location = event.location ? `📍 ${escapeHtml(event.location)}` : "";
      
      message += `<b>${index + 1}. ${escapeHtml(event.title)}</b>\n`;
      message += `🕐 ${startTime}${endTime}\n`;
      if (location) message += `${location}\n`;
      if (event.luma_url) message += `<a href="${event.luma_url}">View on Luma →</a>\n`;
      message += "\n";
    });

    message += `\n<i>${events.length} event${events.length > 1 ? "s" : ""} scheduled for today</i>`;

    await sendTelegramMessage(telegramBotToken, chatId, threadId, message);

    console.log(`Daily events notification sent: ${events.length} events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsCount: events.length,
        chatId,
        threadId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending daily events notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  threadId: number | null,
  message: string
): Promise<void> {
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (threadId) {
    body.message_thread_id = threadId;
  }

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }

  await response.text();
}

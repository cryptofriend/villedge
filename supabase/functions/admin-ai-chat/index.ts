import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a helpful AI assistant for the Villedge Telegram Bot Admin panel. Your role is to help the admin configure and troubleshoot the Telegram notification bot.

Key information you know:
1. **Getting a Telegram Chat ID:**
   - Create a group or channel in Telegram
   - Add the @RawDataBot to the group temporarily
   - The bot will post the chat ID (it starts with -100 for groups/channels)
   - Remove the RawDataBot after getting the ID
   - Alternatively, use @getidsbot or @userinfobot

2. **Setting up the Villedge Bot:**
   - The bot token is already configured in environment secrets (TELEGRAM_BOT_TOKEN)
   - Admin needs to enter the Chat ID where notifications should be sent
   - The Chat ID is saved in the database settings table

3. **What the bot does:**
   - Monitors village treasury wallets for incoming donations
   - Sends formatted notifications to the configured Telegram chat
   - Runs on a 5-minute cron schedule via check-donations function
   - Supports both Ethereum and Solana wallets

4. **Troubleshooting:**
   - If test message doesn't arrive, verify the Chat ID is correct
   - Make sure the bot is added to the target group/channel as an admin
   - The bot needs "Post Messages" permission for channels
   - Check that TELEGRAM_BOT_TOKEN is set in secrets

5. **Notification types:**
   - Donation alerts with amount, donor (ENS/basename if available), and transaction link
   - Test messages for verifying setup

Be concise, friendly, and helpful. If asked about topics unrelated to the Telegram bot configuration, politely redirect to bot-related topics.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat request with", messages?.length || 0, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Admin AI chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

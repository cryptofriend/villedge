const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PublicConfigResponse = {
  privyAppId: string | null;
  magicPublishableKey: string | null;
  telegramBotId: string | null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privyAppId = Deno.env.get("VITE_PRIVY_APP_ID") ?? null;
    const magicPublishableKey = Deno.env.get("VITE_MAGIC_PUBLISHABLE_KEY") ?? null;
    
    // Extract bot ID from the token (format: BOT_ID:SECRET_HASH)
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? null;
    const telegramBotId = telegramBotToken ? telegramBotToken.split(':')[0] : null;

    const body: PublicConfigResponse = {
      privyAppId,
      magicPublishableKey,
      telegramBotId,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

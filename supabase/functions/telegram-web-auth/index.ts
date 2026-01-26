import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate DiceBear avatar URL
const AVATAR_STYLES = [
  "adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile",
  "bottts", "croodles", "fun-emoji", "lorelei", "micah", "miniavs",
  "notionists", "open-peeps", "personas", "pixel-art", "thumbs",
];

const getStyleForSeed = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
};

const getAvatarUrl = (seed: string, size: number = 128): string => {
  const style = getStyleForSeed(seed);
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodedSeed}&size=${size}`;
};

// Verify Telegram Login Widget data
async function verifyTelegramAuth(authData: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...data } = authData;
  
  if (!hash) {
    console.log("telegram-web-auth: No hash provided");
    return false;
  }

  // Check auth_date is not too old (24 hours)
  const authDate = parseInt(data.auth_date || "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    console.log("telegram-web-auth: Auth data expired");
    return false;
  }

  // Create data-check-string by sorting keys and joining
  const checkString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join("\n");

  // Create secret key: SHA256(bot_token)
  const encoder = new TextEncoder();
  const botTokenData = encoder.encode(botToken);
  const secretKey = await crypto.subtle.digest("SHA-256", botTokenData);

  // Calculate HMAC-SHA256 of the data-check-string
  const key = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(checkString));
  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const isValid = calculatedHash === hash;
  console.log("telegram-web-auth: Hash verification:", isValid ? "valid" : "invalid");
  
  return isValid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { telegramAuthData } = body;

    if (!telegramAuthData || typeof telegramAuthData !== "object") {
      console.error("telegram-web-auth: Missing or invalid telegramAuthData");
      return new Response(
        JSON.stringify({ error: "Telegram auth data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("telegram-web-auth: TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Telegram bot not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the auth data
    const isValid = await verifyTelegramAuth(telegramAuthData, botToken);
    if (!isValid) {
      console.error("telegram-web-auth: Invalid auth data");
      return new Response(
        JSON.stringify({ error: "Invalid Telegram authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telegramId = telegramAuthData.id;
    const firstName = telegramAuthData.first_name || "User";
    const lastName = telegramAuthData.last_name || "";
    const username = telegramAuthData.username;
    const photoUrl = telegramAuthData.photo_url;

    const displayName = firstName + (lastName ? ` ${lastName}` : "");
    const avatarUrl = photoUrl || getAvatarUrl(`telegram_${telegramId}`);
    const walletEmail = `telegram_${telegramId}@telegram.user`;

    console.log("telegram-web-auth: Verified user:", telegramId, displayName);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("telegram-web-auth: Error listing users:", listError);
      throw listError;
    }

    let userId: string;
    const existingUser = existingUsers.users.find(u => u.email === walletEmail);

    if (existingUser) {
      userId = existingUser.id;
      console.log("telegram-web-auth: Found existing user:", userId);
      
      // Update profile if needed
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("avatar_url, display_name, telegram_id")
        .eq("user_id", userId)
        .single();
      
      if (!existingProfile) {
        await supabase.from("profiles").insert({
          user_id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          telegram_id: String(telegramId),
          username: username || null,
        });
        console.log("telegram-web-auth: Created missing profile");
      } else {
        const updates: Record<string, unknown> = {};
        if (photoUrl && existingProfile.avatar_url !== photoUrl) {
          updates.avatar_url = photoUrl;
        }
        if (!existingProfile.telegram_id) {
          updates.telegram_id = String(telegramId);
        }
        updates.display_name = displayName;
        
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("user_id", userId);
          console.log("telegram-web-auth: Updated profile:", updates);
        }
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          telegram_id: telegramId,
          telegram_username: username,
        },
      });

      if (createError) {
        console.error("telegram-web-auth: Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log("telegram-web-auth: Created new user:", userId);

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        telegram_id: String(telegramId),
        username: username || null,
      });
      
      if (profileError) {
        console.error("telegram-web-auth: Error creating profile:", profileError);
      }
    }

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: walletEmail,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://villedge.lovable.app"}/`,
      },
    });

    if (linkError) {
      console.error("telegram-web-auth: Error generating magic link:", linkError);
      throw linkError;
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new Error("Failed to generate authentication link");
    }

    console.log("telegram-web-auth: Success for user:", userId);

    return new Response(
      JSON.stringify({
        verified: true,
        actionLink,
        userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("telegram-web-auth: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

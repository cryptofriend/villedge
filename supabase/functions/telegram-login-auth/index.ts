import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to create HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

// Verify Telegram Login Widget data
// https://core.telegram.org/widgets/login#checking-authorization
async function verifyTelegramAuth(authData: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...dataToCheck } = authData;
  
  if (!hash) {
    console.error("telegram-login-auth: Missing hash in auth data");
    return false;
  }

  // Check auth_date is not too old (allow 1 day)
  const authDate = parseInt(dataToCheck.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    console.error("telegram-login-auth: Auth data is too old");
    return false;
  }

  // Create data-check-string
  const dataCheckString = Object.keys(dataToCheck)
    .sort()
    .map(key => `${key}=${dataToCheck[key]}`)
    .join('\n');

  // Create secret key: SHA256 of bot token
  const encoder = new TextEncoder();
  const tokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));

  // Calculate HMAC-SHA256 of data-check-string
  const calculatedHashBuffer = await hmacSha256(tokenHash, dataCheckString);
  const calculatedHash = bufferToHex(calculatedHashBuffer);

  const isValid = calculatedHash === hash;
  if (!isValid) {
    console.error("telegram-login-auth: Hash verification failed");
  }
  
  return isValid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authData = await req.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = authData;

    if (!id || !hash || !auth_date) {
      console.error("telegram-login-auth: Missing required fields");
      return new Response(
        JSON.stringify({ error: "Invalid Telegram auth data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("telegram-login-auth: TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Telegram login not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the auth data
    const isValid = verifyTelegramAuth(authData, botToken);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("telegram-login-auth: Verified Telegram user:", id, username || first_name);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate deterministic email from Telegram user ID
    const telegramEmail = `${id}@telegram.user`;
    
    // Use Telegram photo or generate DiceBear avatar
    const avatarUrl = photo_url || getAvatarUrl(`telegram-${id}`);

    // Build display name from Telegram data
    const displayName = [first_name, last_name].filter(Boolean).join(' ') || `User ${id}`;

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("telegram-login-auth: Error listing users:", listError);
      throw listError;
    }

    let userId: string;
    let isNewUser = false;
    const existingUser = existingUsers.users.find(u => u.email === telegramEmail);

    if (existingUser) {
      userId = existingUser.id;
      console.log("telegram-login-auth: Found existing user:", userId);
      
      // Update profile with latest Telegram data
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url, telegram_id')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        // Create missing profile
        const baseUsername = username || `tg-${id}`;
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: baseUsername.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            avatar_url: avatarUrl,
            telegram_id: String(id),
          });
        console.log("telegram-login-auth: Created missing profile");
      } else {
        // Update telegram_id if not set, and photo if using Telegram's
        const updates: Record<string, string> = {};
        if (!existingProfile.telegram_id) {
          updates.telegram_id = String(id);
        }
        if (photo_url && !existingProfile.avatar_url?.includes('dicebear')) {
          updates.avatar_url = photo_url;
        }
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', userId);
        }
      }
    } else {
      isNewUser = true;
      
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: telegramEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: String(id),
          username: username || `tg-${id}`,
        },
      });

      if (createError) {
        console.error("telegram-login-auth: Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log("telegram-login-auth: Created new user:", userId);

      // Generate unique username
      const baseUsername = username || `tg-${id}`;
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', baseUsername.toLowerCase())
        .maybeSingle();
      
      const finalUsername = existingUsername 
        ? `${baseUsername.toLowerCase()}-${Date.now().toString(36).slice(-4)}`
        : baseUsername.toLowerCase();

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          avatar_url: avatarUrl,
          username: finalUsername.replace(/[^a-z0-9-]/g, '-'),
          telegram_id: String(id),
        });
      
      if (profileError) {
        console.error("telegram-login-auth: Error creating profile:", profileError);
      } else {
        console.log("telegram-login-auth: Created profile with username:", finalUsername);
      }
    }

    // Generate magic link for authentication
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: telegramEmail,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://villedge.lovable.app"}/`,
      },
    });

    if (linkError) {
      console.error("telegram-login-auth: Error generating magic link:", linkError);
      throw linkError;
    }

    console.log("telegram-login-auth: Generated magic link for user:", userId);

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new Error("Failed to generate authentication link");
    }

    return new Response(
      JSON.stringify({
        verified: true,
        actionLink,
        userId,
        isNewUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("telegram-login-auth: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

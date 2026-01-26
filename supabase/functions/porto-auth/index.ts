import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate DiceBear avatar URL (same logic as frontend)
const AVATAR_STYLES = [
  "adventurer",
  "adventurer-neutral",
  "avataaars",
  "big-ears",
  "big-smile",
  "bottts",
  "croodles",
  "fun-emoji",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "thumbs",
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { address, telegramUser } = body;

    if (!address || typeof address !== "string") {
      console.error("porto-auth: Missing or invalid address");
      return new Response(
        JSON.stringify({ error: "Wallet address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const isTelegramAuth = normalizedAddress.startsWith('telegram_');
    
    let displayName: string;
    let avatarUrl: string;
    let walletEmail: string;

    if (isTelegramAuth && telegramUser) {
      // Telegram authentication
      const telegramId = telegramUser.id;
      displayName = telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : '');
      avatarUrl = telegramUser.photo_url || getAvatarUrl(`telegram_${telegramId}`);
      walletEmail = `telegram_${telegramId}@telegram.user`;
      console.log("porto-auth: Telegram auth for user:", telegramId, displayName);
    } else {
      // Wallet authentication (Porto, Ethereum, Solana)
      const truncatedAddress = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
      displayName = truncatedAddress;
      avatarUrl = getAvatarUrl(normalizedAddress);
      walletEmail = `${normalizedAddress}@porto.wallet`;
      console.log("porto-auth: Wallet auth for address:", truncatedAddress);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("porto-auth: Error listing users:", listError);
      throw listError;
    }

    let userId: string;
    const existingUser = existingUsers.users.find(u => u.email === walletEmail);

    if (existingUser) {
      userId = existingUser.id;
      console.log("porto-auth: Found existing user:", userId);
      
      // Ensure profile exists and update if needed
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, telegram_id, wallet_address')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        // Profile doesn't exist, create it
        const profileData: Record<string, unknown> = {
          user_id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
        };
        
        if (isTelegramAuth && telegramUser) {
          profileData.telegram_id = String(telegramUser.id);
        } else {
          profileData.wallet_address = normalizedAddress;
        }
        
        await supabase.from('profiles').insert(profileData);
        console.log("porto-auth: Created missing profile for existing user");
      } else {
        // Update profile with new data
        const updates: Record<string, unknown> = {};
        
        if (isTelegramAuth && telegramUser) {
          if (telegramUser.photo_url && existingProfile.avatar_url !== telegramUser.photo_url) {
            updates.avatar_url = telegramUser.photo_url;
          }
          if (!existingProfile.telegram_id) {
            updates.telegram_id = String(telegramUser.id);
          }
          updates.display_name = displayName;
        } else if (!existingProfile.wallet_address) {
          updates.wallet_address = normalizedAddress;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', userId);
          console.log("porto-auth: Updated profile:", updates);
        }
      }
    } else {
      // Create new user
      const userMetadata: Record<string, unknown> = {
        display_name: displayName,
      };

      if (isTelegramAuth && telegramUser) {
        userMetadata.telegram_id = telegramUser.id;
        userMetadata.telegram_username = telegramUser.username;
      } else {
        userMetadata.wallet_address = normalizedAddress;
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError) {
        console.error("porto-auth: Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log("porto-auth: Created new user:", userId);

      // Create profile for new user with linking fields
      const profileData: Record<string, unknown> = {
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        username: telegramUser?.username || null,
      };
      
      if (isTelegramAuth && telegramUser) {
        profileData.telegram_id = String(telegramUser.id);
      } else {
        profileData.wallet_address = normalizedAddress;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);
      
      if (profileError) {
        console.error("porto-auth: Error creating profile:", profileError);
      } else {
        console.log("porto-auth: Created profile for new user");
      }
    }

    // Generate magic link for authentication
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: walletEmail,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://villedge.lovable.app"}/`,
      },
    });

    if (linkError) {
      console.error("porto-auth: Error generating magic link:", linkError);
      throw linkError;
    }

    console.log("porto-auth: Generated magic link for user:", userId);

    // Extract token from the action link
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new Error("Failed to generate authentication link");
    }

    return new Response(
      JSON.stringify({
        verified: true,
        actionLink,
        userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("porto-auth: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

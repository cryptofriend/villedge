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
    const { address, walletType } = await req.json();

    if (!address || typeof address !== "string") {
      console.error("porto-auth: Missing or invalid address");
      return new Response(
        JSON.stringify({ error: "Wallet address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TON addresses are case-sensitive, others should be lowercased
    const isTon = walletType === 'ton';
    const normalizedAddress = isTon ? address : address.toLowerCase();
    const truncatedAddress = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
    console.log("porto-auth: Authenticating address:", truncatedAddress, "type:", walletType || 'porto');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a deterministic email from the wallet address
    // Use wallet type in domain for clarity (all go through same auth flow)
    // For TON addresses, we need to make them email-safe by replacing invalid chars
    const emailDomain = walletType === 'ton' ? 'ton.wallet' : 
                        walletType === 'solana' ? 'solana.wallet' : 
                        walletType === 'ethereum' ? 'eth.wallet' : 'porto.wallet';
    
    // Make the address email-safe: replace special chars with underscores
    // Email local part allows: letters, digits, dots, hyphens, underscores
    const emailSafeAddress = normalizedAddress
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .slice(0, 64); // Email local part max 64 chars
    
    const walletEmail = `${emailSafeAddress}@${emailDomain}`;
    console.log("porto-auth: Generated email:", walletEmail);
    
    // Generate avatar based on wallet address
    const avatarUrl = getAvatarUrl(normalizedAddress);

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
      
      // Ensure profile exists and update avatar if not set
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        // Profile doesn't exist, create it
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: truncatedAddress,
            avatar_url: avatarUrl,
          });
        console.log("porto-auth: Created missing profile for existing user");
      } else if (!existingProfile.avatar_url) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('user_id', userId);
        console.log("porto-auth: Updated profile avatar for existing user");
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: {
          wallet_address: normalizedAddress,
          display_name: truncatedAddress,
        },
      });

      if (createError) {
        console.error("porto-auth: Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log("porto-auth: Created new user:", userId);

      // Determine wallet type enum value
      const walletTypeEnum = walletType === 'ton' ? 'ton' : 
                             walletType === 'solana' ? 'solana' : 
                             walletType === 'ethereum' ? 'ethereum' : 'porto';

      // Generate a unique username from the wallet address
      const baseUsername = `${walletTypeEnum}-${normalizedAddress.slice(-8).toLowerCase()}`;
      
      // Check if username exists and make unique if needed
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', baseUsername)
        .maybeSingle();
      
      const finalUsername = existingUsername 
        ? `${baseUsername}-${Date.now().toString(36).slice(-4)}`
        : baseUsername;

      // Create profile for new user with username
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          display_name: truncatedAddress,
          avatar_url: avatarUrl,
          username: finalUsername,
        });
      
      if (profileError) {
        console.error("porto-auth: Error creating profile:", profileError);
        // Don't throw - user was created, profile creation failure is not critical
      } else {
        console.log("porto-auth: Created profile for new user with username:", finalUsername);
      }

      // Auto-link the wallet to user_wallets table
      const { error: walletError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          wallet_address: normalizedAddress,
          wallet_type: walletTypeEnum,
          is_primary: true, // First wallet is primary
        });
      
      if (walletError) {
        console.error("porto-auth: Error linking wallet:", walletError);
      } else {
        console.log("porto-auth: Linked wallet for new user:", walletTypeEnum);
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

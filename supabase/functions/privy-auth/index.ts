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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { privyUserId, email, walletAddress, invitationCode } = await req.json();

    if (!privyUserId || typeof privyUserId !== "string") {
      console.error("privy-auth: Missing or invalid privyUserId");
      return new Response(
        JSON.stringify({ error: "Privy user ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("privy-auth: Authenticating Privy user:", privyUserId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate deterministic email from Privy user ID
    const userEmail = email || `${privyUserId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64)}@privy.wallet`;
    console.log("privy-auth: Using email:", userEmail);

    // Generate avatar
    const avatarSeed = walletAddress || privyUserId;
    const avatarUrl = getAvatarUrl(avatarSeed);

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("privy-auth: Error listing users:", listError);
      throw listError;
    }

    let userId: string;
    let isNewUser = false;
    const existingUser = existingUsers.users.find(u => u.email === userEmail);

    if (existingUser) {
      userId = existingUser.id;
      console.log("privy-auth: Found existing user:", userId);
      
      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        const displayName = email?.split('@')[0] || `privy-${privyUserId.slice(-8)}`;
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: displayName,
            avatar_url: avatarUrl,
            username: displayName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
          });
        console.log("privy-auth: Created missing profile for existing user");
      }
    } else {
      // Create new user
      const displayName = email?.split('@')[0] || `privy-${privyUserId.slice(-8)}`;
      
      // Validate invitation code if provided
      let codeValidation = null;
      let isVerified = false;
      
      if (invitationCode && invitationCode.trim()) {
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_invitation_code', { _code: invitationCode.trim().toUpperCase() });
        
        if (validationError) {
          console.error("privy-auth: Error validating invitation code:", validationError);
        } else {
          codeValidation = validationResult;
          isVerified = codeValidation?.valid === true;
          console.log("privy-auth: Invitation code validation:", codeValidation);
        }
      }
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          avatar_url: avatarUrl,
          privy_user_id: privyUserId,
          wallet_address: walletAddress,
        }
      });

      if (createError || !newUser.user) {
        console.error("privy-auth: Error creating user:", createError);
        throw createError || new Error("Failed to create user");
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("privy-auth: Created new user:", userId);

      // Create profile with verification status
      const username = displayName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30) || `privy-${Date.now().toString(36)}`;
      
      await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          username: username,
          wallet_address: walletAddress,
          is_verified: isVerified,
        });

      // If wallet address provided, add to user_wallets
      if (walletAddress) {
        await supabase
          .from('user_wallets')
          .insert({
            user_id: userId,
            wallet_address: walletAddress.toLowerCase(),
            wallet_type: 'ethereum',
            is_primary: true,
          });
      }
      
      // If invitation code was valid, use it to create referral
      if (codeValidation?.valid && codeValidation?.code_id && codeValidation?.owner_id) {
        await supabase.rpc('use_invitation_code', {
          _code_id: codeValidation.code_id,
          _referrer_id: codeValidation.owner_id,
          _referred_id: userId,
        });
        console.log("privy-auth: Used invitation code, created referral");
      }
    }

    // Generate magic link for session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo: '/' }
    });

    if (linkError || !linkData) {
      console.error("privy-auth: Error generating magic link:", linkError);
      throw linkError || new Error("Failed to generate session");
    }

    console.log("privy-auth: Successfully authenticated user:", userId);

    return new Response(
      JSON.stringify({
        verified: true,
        actionLink: linkData.properties?.action_link,
        userId: userId,
        isNewUser: isNewUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("privy-auth: Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

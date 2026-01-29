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

// Verify Magic DID token
async function verifyMagicToken(didToken: string): Promise<{ issuer: string; email: string; publicAddress: string } | null> {
  try {
    const magicSecretKey = Deno.env.get("MAGIC_SECRET_KEY");
    
    if (!magicSecretKey) {
      console.error("magic-auth: MAGIC_SECRET_KEY not configured");
      return null;
    }

    // Verify the DID token with Magic's API
    const response = await fetch("https://api.magic.link/v1/admin/auth/user/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Magic-Secret-Key": magicSecretKey,
      },
      body: JSON.stringify({ did_token: didToken }),
    });

    if (!response.ok) {
      console.error("magic-auth: Magic API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== "ok" || !data.data) {
      console.error("magic-auth: Invalid Magic response:", data);
      return null;
    }

    return {
      issuer: data.data.issuer,
      email: data.data.email,
      publicAddress: data.data.public_address,
    };
  } catch (error) {
    console.error("magic-auth: Error verifying token:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { didToken, email, publicAddress, invitationCode } = await req.json();

    if (!didToken || typeof didToken !== "string") {
      console.error("magic-auth: Missing or invalid didToken");
      return new Response(
        JSON.stringify({ error: "DID token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("magic-auth: Authenticating Magic user:", email);

    // Verify the DID token with Magic
    const verifiedUser = await verifyMagicToken(didToken);
    
    if (!verifiedUser) {
      console.error("magic-auth: Failed to verify DID token");
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use verified email from Magic
    const userEmail = verifiedUser.email || email;
    const walletAddress = verifiedUser.publicAddress || publicAddress;
    
    console.log("magic-auth: Using email:", userEmail);

    // Generate avatar
    const avatarSeed = walletAddress || verifiedUser.issuer;
    const avatarUrl = getAvatarUrl(avatarSeed);

    // Check if user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("magic-auth: Error listing users:", listError);
      throw listError;
    }

    let userId: string;
    let isNewUser = false;
    const existingUser = existingUsers.users.find(u => u.email === userEmail);

    if (existingUser) {
      userId = existingUser.id;
      console.log("magic-auth: Found existing user:", userId);
      
      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url, username, wallet_address')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        const username = userEmail.split('@')[0] || `magic-${Date.now().toString(36)}`;
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            avatar_url: avatarUrl,
            username: username.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
            wallet_address: walletAddress,
          });
        console.log("magic-auth: Created missing profile for existing user");
      } else if (walletAddress && !existingProfile.wallet_address) {
        // Update wallet address if not set
        await supabase
          .from('profiles')
          .update({ wallet_address: walletAddress })
          .eq('user_id', userId);
      }
      
      // Ensure wallet is linked
      if (walletAddress) {
        const { data: existingWallet } = await supabase
          .from('user_wallets')
          .select('id')
          .eq('user_id', userId)
          .eq('wallet_address', walletAddress.toLowerCase())
          .single();
          
        if (!existingWallet) {
          await supabase
            .from('user_wallets')
            .insert({
              user_id: userId,
              wallet_address: walletAddress.toLowerCase(),
              wallet_type: 'ethereum',
              is_primary: true,
              display_name: 'Magic Wallet',
            });
        }
      }
    } else {
      // Create new user
      const username = userEmail.split('@')[0] || `magic-${Date.now().toString(36)}`;
      
      // Validate invitation code if provided
      let codeValidation = null;
      let isVerified = false;
      
      if (invitationCode && invitationCode.trim()) {
        const { data: validationResult, error: validationError } = await supabase
          .rpc('validate_invitation_code', { _code: invitationCode.trim().toUpperCase() });
        
        if (validationError) {
          console.error("magic-auth: Error validating invitation code:", validationError);
        } else {
          codeValidation = validationResult;
          isVerified = codeValidation?.valid === true;
          console.log("magic-auth: Invitation code validation:", codeValidation);
        }
      }
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          username: username,
          avatar_url: avatarUrl,
          magic_issuer: verifiedUser.issuer,
          wallet_address: walletAddress,
        }
      });

      if (createError || !newUser.user) {
        console.error("magic-auth: Error creating user:", createError);
        throw createError || new Error("Failed to create user");
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("magic-auth: Created new user:", userId);

      // Create profile with verification status
      const finalUsername = username.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30) || `magic-${Date.now().toString(36)}`;
      
      await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          avatar_url: avatarUrl,
          username: finalUsername,
          wallet_address: walletAddress,
          is_verified: isVerified,
        });

      // Add wallet to user_wallets
      if (walletAddress) {
        await supabase
          .from('user_wallets')
          .insert({
            user_id: userId,
            wallet_address: walletAddress.toLowerCase(),
            wallet_type: 'ethereum',
            is_primary: true,
            display_name: 'Magic Wallet',
          });
      }
      
      // If invitation code was valid, use it to create referral
      if (codeValidation?.valid && codeValidation?.code_id && codeValidation?.owner_id) {
        await supabase.rpc('use_invitation_code', {
          _code_id: codeValidation.code_id,
          _referrer_id: codeValidation.owner_id,
          _referred_id: userId,
        });
        console.log("magic-auth: Used invitation code, created referral");
      }
    }

    // Generate magic link for session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo: '/' }
    });

    if (linkError || !linkData) {
      console.error("magic-auth: Error generating magic link:", linkError);
      throw linkError || new Error("Failed to generate session");
    }

    console.log("magic-auth: Successfully authenticated user:", userId);

    return new Response(
      JSON.stringify({
        verified: true,
        actionLink: linkData.properties?.action_link,
        userId: userId,
        isNewUser: isNewUser,
        walletAddress: walletAddress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("magic-auth: Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
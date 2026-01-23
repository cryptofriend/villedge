import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address || typeof address !== "string") {
      console.error("porto-auth: Missing or invalid address");
      return new Response(
        JSON.stringify({ error: "Wallet address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase();
    console.log("porto-auth: Authenticating address:", normalizedAddress);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a deterministic email from the wallet address
    const walletEmail = `${normalizedAddress}@porto.wallet`;

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
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: walletEmail,
        email_confirm: true,
        user_metadata: {
          wallet_address: normalizedAddress,
          display_name: `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
        },
      });

      if (createError) {
        console.error("porto-auth: Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log("porto-auth: Created new user:", userId);
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

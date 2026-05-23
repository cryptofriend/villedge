import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVATAR_STYLES = [
  "adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile",
  "bottts", "croodles", "fun-emoji", "lorelei", "micah", "miniavs",
  "notionists", "open-peeps", "personas", "pixel-art", "thumbs",
];

const getStyleForSeed = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
};

const getAvatarUrl = (seed: string, size = 128): string =>
  `https://api.dicebear.com/9.x/${getStyleForSeed(seed)}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("WORLD_ID_APP_ID")!;
    const clientSecret = Deno.env.get("WORLD_ID_CLIENT_SECRET")!;

    // Exchange code for token (HTTP Basic auth per OIDC spec)
    const basic = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch("https://id.worldcoin.org/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basic}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("world-id-auth: token exchange failed", tokenJson);
      return new Response(JSON.stringify({ error: tokenJson.error_description || "Token exchange failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idToken: string = tokenJson.id_token;
    if (!idToken) throw new Error("No id_token in response");

    // Decode JWT payload (we trust the secured HTTPS exchange we just did)
    const payloadB64 = idToken.split(".")[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    const worldSub: string = payload.sub;
    if (!worldSub) throw new Error("No sub in id_token");

    console.log("world-id-auth: authenticated world sub:", worldSub);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const worldEmail = `${worldSub.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64)}@worldid.user`;
    const avatarUrl = getAvatarUrl(worldSub);

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let userId: string;
    const existingUser = existingUsers.users.find((u) => u.email === worldEmail);

    if (existingUser) {
      userId = existingUser.id;
      const { data: existingProfile } = await supabase
        .from("profiles").select("avatar_url").eq("user_id", userId).single();
      if (!existingProfile) {
        await supabase.from("profiles").insert({
          user_id: userId,
          username: `world-${worldSub.slice(-8).toLowerCase()}`,
          avatar_url: avatarUrl,
        });
      }
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: worldEmail,
        email_confirm: true,
        user_metadata: { world_id_sub: worldSub },
      });
      if (createError) throw createError;
      userId = newUser.user.id;

      const baseUsername = `world-${worldSub.slice(-8).toLowerCase()}`;
      const { data: existingUsername } = await supabase
        .from("profiles").select("username").eq("username", baseUsername).maybeSingle();
      const finalUsername = existingUsername
        ? `${baseUsername}-${Date.now().toString(36).slice(-4)}`
        : baseUsername;

      await supabase.from("profiles").insert({
        user_id: userId,
        avatar_url: avatarUrl,
        username: finalUsername,
      });
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: worldEmail,
      options: { redirectTo: `${req.headers.get("origin") || "https://villedge.lovable.app"}/` },
    });
    if (linkError) throw linkError;

    return new Response(JSON.stringify({
      verified: true,
      actionLink: linkData.properties?.action_link,
      userId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("world-id-auth: error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Auth failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

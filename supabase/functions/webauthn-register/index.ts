import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "https://esm.sh/@simplewebauthn/server@10.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RP_NAME = "OurMap";
const RP_ID = "ourmap.lovable.app";
const ORIGIN = `https://${RP_ID}`;

// Generate a hidden email from username
function generateHiddenEmail(username: string): string {
  const uniqueId = crypto.randomUUID().split('-')[0];
  return `${username.toLowerCase()}-${uniqueId}@passkey.ourmap.local`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { step, username, credential } = await req.json();
    
    console.log(`WebAuthn Register - Step: ${step}, Username: ${username}`);

    if (step === "options") {
      if (!username) {
        return new Response(
          JSON.stringify({ error: "Username is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if username already exists in credentials
      const { data: existingCredential } = await supabase
        .from("webauthn_credentials")
        .select("id")
        .eq("username", username.toLowerCase())
        .single();
      
      if (existingCredential) {
        return new Response(
          JSON.stringify({ error: "This username is already taken. Please choose another or sign in." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = crypto.randomUUID();

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new TextEncoder().encode(userId),
        userName: username,
        userDisplayName: username,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform",
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      // Store challenge with username
      const { error: challengeError } = await supabase
        .from("webauthn_challenges")
        .insert({
          challenge: options.challenge,
          email: username.toLowerCase(), // Reuse email field for username lookup
          type: "registration",
        });

      if (challengeError) {
        console.error("Error storing challenge:", challengeError);
        return new Response(
          JSON.stringify({ error: "Failed to store challenge" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Registration options generated for:", username);

      return new Response(
        JSON.stringify({ options, userId, username }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (step === "verify") {
      if (!credential || !username) {
        return new Response(
          JSON.stringify({ error: "Credential and username are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the stored challenge (using email field for username)
      const { data: challengeData, error: challengeError } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("email", username.toLowerCase())
        .eq("type", "registration")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (challengeError || !challengeData) {
        console.error("Challenge not found:", challengeError);
        return new Response(
          JSON.stringify({ error: "Challenge not found or expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Verifying registration for:", username);

      // Verify the registration response
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        console.error("Verification failed");
        return new Response(
          JSON.stringify({ error: "Verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a hidden email for Supabase Auth
      const hiddenEmail = generateHiddenEmail(username);

      // Create the user in Supabase Auth with hidden email
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: hiddenEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          display_name: username,
          username: username.toLowerCase(),
          auth_method: "passkey",
        },
      });

      if (authError || !authData.user) {
        console.error("Failed to create user:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // In SimpleWebAuthn v10+, these are already base64url strings
      const credentialIdB64 = credentialID as string;
      const publicKeyB64 = typeof credentialPublicKey === 'string' 
        ? credentialPublicKey 
        : (() => {
            let binary = '';
            const arr = credentialPublicKey as Uint8Array;
            for (let i = 0; i < arr.length; i++) {
              binary += String.fromCharCode(arr[i]);
            }
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          })();

      // Store the credential with username
      const { error: credentialError } = await supabase
        .from("webauthn_credentials")
        .insert({
          user_id: authData.user.id,
          credential_id: credentialIdB64,
          public_key: publicKeyB64,
          sign_count: counter,
          device_type: credentialDeviceType === "multiDevice" ? "multi_device" : "single_device",
          backup_state: credentialBackedUp ? "backed_up" : "not_backed_up",
          user_verification_status: "verified",
          transports: credential.response?.transports || [],
          friendly_name: "Passkey",
          username: username.toLowerCase(),
        });

      if (credentialError) {
        console.error("Failed to store credential:", credentialError);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: "Failed to store credential" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete the used challenge
      await supabase
        .from("webauthn_challenges")
        .delete()
        .eq("id", challengeData.id);

      // Generate a magic link for the user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: hiddenEmail,
      });

      if (sessionError) {
        console.error("Failed to generate session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Registration successful for:", username);

      return new Response(
        JSON.stringify({
          verified: true,
          user: authData.user,
          actionLink: sessionData.properties?.action_link,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid step" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("WebAuthn register error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

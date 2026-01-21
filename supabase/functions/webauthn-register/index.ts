import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "https://esm.sh/@simplewebauthn/server@10.0.0";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RP_NAME = "OurMap";
const RP_ID = "ourmap.lovable.app";
const ORIGIN = `https://${RP_ID}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { step, email, displayName, credential } = await req.json();
    
    console.log(`WebAuthn Register - Step: ${step}, Email: ${email}`);

    if (step === "options") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.find((u: { email?: string }) => u.email === email);
      
      if (userExists) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = crypto.randomUUID();

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new TextEncoder().encode(userId),
        userName: email,
        userDisplayName: displayName || email,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform",
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      // Store challenge
      const { error: challengeError } = await supabase
        .from("webauthn_challenges")
        .insert({
          challenge: options.challenge,
          email: email,
          type: "registration",
        });

      if (challengeError) {
        console.error("Error storing challenge:", challengeError);
        return new Response(
          JSON.stringify({ error: "Failed to store challenge" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Registration options generated for:", email);

      return new Response(
        JSON.stringify({ options, userId, email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (step === "verify") {
      if (!credential || !email) {
        return new Response(
          JSON.stringify({ error: "Credential and email are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the stored challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("email", email)
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

      console.log("Verifying registration for:", email);

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

      // Create the user in Supabase Auth
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName || email,
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

      // Store the credential
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
        email: email,
      });

      if (sessionError) {
        console.error("Failed to generate session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Registration successful for:", email);

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

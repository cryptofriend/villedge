import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@10.0.0";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RP_ID = "ourmap.lovable.app";
const ORIGIN = `https://${RP_ID}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { step, email, credential } = await req.json();

    console.log(`WebAuthn Authenticate - Step: ${step}, Email: ${email || "discoverable"}`);

    if (step === "options") {
      // deno-lint-ignore no-explicit-any
      let allowCredentials: any[] = [];

      // If email is provided, get user's credentials
      if (email) {
        const { data: users } = await supabase.auth.admin.listUsers();
        // deno-lint-ignore no-explicit-any
        const user = users?.users?.find((u: any) => u.email === email);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "No account found with this email" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: credentials } = await supabase
          .from("webauthn_credentials")
          .select("credential_id, transports")
          .eq("user_id", user.id);

        if (!credentials || credentials.length === 0) {
          return new Response(
            JSON.stringify({ error: "No passkey found for this account. Please sign up first." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // deno-lint-ignore no-explicit-any
        allowCredentials = credentials.map((c: any) => ({
          id: c.credential_id,
          transports: c.transports,
        }));
      }

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "preferred",
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      });

      // Store challenge
      const { error: challengeError } = await supabase
        .from("webauthn_challenges")
        .insert({
          challenge: options.challenge,
          email: email || null,
          type: "authentication",
        });

      if (challengeError) {
        console.error("Error storing challenge:", challengeError);
        return new Response(
          JSON.stringify({ error: "Failed to store challenge" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Authentication options generated");

      return new Response(
        JSON.stringify({ options }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (step === "verify") {
      if (!credential) {
        return new Response(
          JSON.stringify({ error: "Credential is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the credential in our database
      const credentialId = credential.id;
      const { data: storedCredential, error: credError } = await supabase
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credentialId)
        .single();

      if (credError || !storedCredential) {
        console.error("Credential not found:", credError);
        return new Response(
          JSON.stringify({ error: "Passkey not recognized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the challenge
      const { data: challengeData } = await supabase
        .from("webauthn_challenges")
        .select("*")
        .eq("type", "authentication")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!challengeData) {
        return new Response(
          JSON.stringify({ error: "Challenge not found or expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Verifying authentication for credential:", credentialId);

      // Convert stored base64url strings back to Uint8Array
      const storedCredentialId = storedCredential.credential_id;
      const storedPublicKey = base64Decode(storedCredential.public_key);

      // Verify the authentication response
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: storedCredentialId,
          credentialPublicKey: storedPublicKey,
          counter: storedCredential.sign_count,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        console.error("Verification failed");
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the sign count
      await supabase
        .from("webauthn_credentials")
        .update({
          sign_count: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", storedCredential.id);

      // Delete the used challenge
      await supabase
        .from("webauthn_challenges")
        .delete()
        .eq("id", challengeData.id);

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(storedCredential.user_id);
      
      if (!userData.user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a magic link
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email!,
      });

      if (sessionError) {
        console.error("Failed to generate session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Authentication successful for:", userData.user.email);

      return new Response(
        JSON.stringify({
          verified: true,
          user: userData.user,
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
    console.error("WebAuthn authenticate error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

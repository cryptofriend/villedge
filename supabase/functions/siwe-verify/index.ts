import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashMessage, recoverAddress } from "https://esm.sh/viem@2.44.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SIWEPayload {
  status: 'success' | 'error';
  message: string;
  signature: string;
  address: string;
}

function generateHiddenEmail(address: string): string {
  return `wallet_${address.slice(2, 14).toLowerCase()}@hidden.villedge.local`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload, nonce } = await req.json() as { payload: SIWEPayload; nonce: string };

    if (payload.status === 'error') {
      return new Response(
        JSON.stringify({ error: 'User cancelled wallet auth', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying SIWE for address:', payload.address);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify nonce exists and is valid
    const { data: nonceData, error: nonceError } = await supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('challenge', nonce)
      .eq('type', 'siwe')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (nonceError || !nonceData) {
      console.error('Invalid or expired nonce');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired nonce', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete used nonce
    await supabase
      .from('webauthn_challenges')
      .delete()
      .eq('id', nonceData.id);

    // Verify the nonce is in the signed message
    if (!payload.message.includes(nonce)) {
      console.error('Nonce mismatch in signed message');
      return new Response(
        JSON.stringify({ error: 'Nonce mismatch', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature using viem
    const messageHash = hashMessage(payload.message);
    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature: payload.signature as `0x${string}`,
    });

    if (recoveredAddress.toLowerCase() !== payload.address.toLowerCase()) {
      console.error('Signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid signature', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified for address:', payload.address);

    // Create or find user
    const email = generateHiddenEmail(payload.address);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let user = existingUsers?.users.find(u => u.email === email);

    if (!user) {
      console.log('Creating new user for wallet:', payload.address);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: `${payload.address.slice(0, 6)}...${payload.address.slice(-4)}`,
          wallet_address: payload.address,
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error('Failed to create user');
      }
      user = newUser.user;
    }

    // Generate magic link for session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      throw new Error('Failed to generate session');
    }

    return new Response(
      JSON.stringify({
        verified: true,
        user,
        actionLink: linkData.properties.action_link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SIWE verification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

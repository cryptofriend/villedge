import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store nonce in webauthn_challenges table (reusing for SIWE)
    const { error: insertError } = await supabase
      .from('webauthn_challenges')
      .insert({
        challenge: nonce,
        type: 'siwe',
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing nonce:', insertError);
      throw new Error('Failed to generate nonce');
    }

    console.log('Generated SIWE nonce:', nonce);

    return new Response(
      JSON.stringify({ nonce }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Nonce generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

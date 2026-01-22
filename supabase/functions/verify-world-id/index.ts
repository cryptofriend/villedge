import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
  action: string;
  signal?: string;
}

function generateHiddenEmail(nullifierHash: string): string {
  // Create a unique email based on the nullifier hash
  return `worldid_${nullifierHash.slice(2, 18)}@hidden.villedge.local`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proof, nullifier_hash, merkle_root, verification_level, action, signal } = await req.json() as WorldIDProof;

    const appId = Deno.env.get('WORLD_ID_APP_ID');
    if (!appId) {
      throw new Error('WORLD_ID_APP_ID not configured');
    }

    console.log('Verifying World ID proof for action:', action);
    console.log('Nullifier hash:', nullifier_hash);

    // Verify the proof with World ID API
    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof,
          verification_level,
          action,
          signal: signal || '',
        }),
      }
    );

    const verifyData = await verifyRes.json();
    console.log('World ID verification response:', verifyData);

    if (!verifyRes.ok) {
      console.error('World ID verification failed:', verifyData);
      return new Response(
        JSON.stringify({ error: verifyData.detail || 'Verification failed', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a unique email for this World ID user
    const email = generateHiddenEmail(nullifier_hash);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error('Failed to check existing users');
    }

    let user = existingUsers.users.find(u => u.email === email);

    if (!user) {
      // Create new user for this World ID
      console.log('Creating new user for World ID:', email);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: `World ID User`,
          world_id_nullifier: nullifier_hash,
          world_id_verification_level: verification_level,
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error('Failed to create user');
      }

      user = newUser.user;
      console.log('Created new user:', user.id);
    } else {
      console.log('Found existing user:', user.id);
    }

    // Generate a magic link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      throw new Error('Failed to generate session link');
    }

    console.log('Generated magic link for user:', user.id);

    return new Response(
      JSON.stringify({
        verified: true,
        user,
        actionLink: linkData.properties.action_link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('World ID verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResolvedName {
  address: string;
  name: string | null;
  avatar: string | null;
}

// Resolve ENS name using ensdata.net
async function resolveEnsName(address: string): Promise<{ name: string | null; avatar: string | null }> {
  try {
    // Try to get ENS reverse record
    const response = await fetch(`https://ensdata.net/${address}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.ens) {
        return { 
          name: data.ens, 
          avatar: data.avatar_url || null 
        };
      }
    }
  } catch (error) {
    console.log(`ENS lookup failed for ${address}:`, error);
  }
  
  return { name: null, avatar: null };
}

// Resolve Basename using Base's API
async function resolveBasename(address: string): Promise<{ name: string | null; avatar: string | null }> {
  try {
    // Base names are on the Base chain, try the Basenames API
    const response = await fetch(`https://api.web3.bio/profile/${address}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const profiles = await response.json();
      // Look for Basenames (.base.eth) or other identities
      if (Array.isArray(profiles)) {
        // Prefer Basenames first
        const basename = profiles.find(p => p.platform === 'basenames' || p.identity?.endsWith('.base.eth'));
        if (basename) {
          return { 
            name: basename.displayName || basename.identity, 
            avatar: basename.avatar || null 
          };
        }
        // Fall back to ENS if no Basename
        const ens = profiles.find(p => p.platform === 'ens');
        if (ens) {
          return {
            name: ens.displayName || ens.identity,
            avatar: ens.avatar || null
          };
        }
      }
    }
  } catch (error) {
    console.log(`Basename lookup failed for ${address}:`, error);
  }
  
  return { name: null, avatar: null };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { addresses } = await req.json();
    
    if (!addresses || !Array.isArray(addresses)) {
      return new Response(
        JSON.stringify({ error: 'addresses array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving names for ${addresses.length} addresses`);

    // Resolve all addresses in parallel (but limit to avoid rate limiting)
    const batchSize = 5;
    const results: ResolvedName[] = [];

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (address: string) => {
          // Try web3.bio first (has both ENS and Basenames)
          const web3bio = await resolveBasename(address);
          if (web3bio.name) {
            console.log(`Resolved ${address} to ${web3bio.name} via web3.bio`);
            return { address, name: web3bio.name, avatar: web3bio.avatar };
          }
          
          // Fall back to ENS directly
          const ens = await resolveEnsName(address);
          if (ens.name) {
            console.log(`Resolved ${address} to ${ens.name} via ENS`);
            return { address, name: ens.name, avatar: ens.avatar };
          }
          
          console.log(`No name found for ${address}`);
          return { address, name: null, avatar: null };
        })
      );
      results.push(...batchResults);
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resolving names:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

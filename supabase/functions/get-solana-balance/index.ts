import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Solana mainnet RPC endpoint
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

// Fetch SOL balance using JSON-RPC
async function getSolBalance(walletAddress: string): Promise<number> {
  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [walletAddress],
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Solana RPC error: ${data.error.message}`);
  }

  // Balance is in lamports (1 SOL = 1e9 lamports)
  const lamports = data.result?.value || 0;
  return lamports / 1e9;
}

// Fetch SOL price in USD from CoinGecko
async function getSolPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('CoinGecko price fetch failed, using fallback');
      return 150; // Fallback price
    }

    const data = await response.json();
    return data.solana?.usd || 150;
  } catch (error) {
    console.warn('Error fetching SOL price:', error);
    return 150; // Fallback price
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching Solana balance for: ${walletAddress}`);

    // Fetch balance and price in parallel
    const [solBalance, solPrice] = await Promise.all([
      getSolBalance(walletAddress),
      getSolPrice(),
    ]);

    const usdBalance = solBalance * solPrice;

    console.log(`SOL balance: ${solBalance}, Price: $${solPrice}, USD value: $${usdBalance}`);

    return new Response(
      JSON.stringify({
        balance: usdBalance,
        solBalance,
        solPrice,
        walletAddress,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching Solana balance:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

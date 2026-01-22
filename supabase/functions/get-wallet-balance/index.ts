import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const apiKey = Deno.env.get('ZERION_API_KEY');
    if (!apiKey) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching wallet balance for: ${walletAddress}`);

    // Zerion uses Basic Auth with API key as username
    const authHeader = 'Basic ' + btoa(apiKey + ':');

    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${encodeURIComponent(walletAddress)}/portfolio?currency=usd`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Zerion API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch wallet balance: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Zerion response:', JSON.stringify(data, null, 2));

    // Extract total portfolio value
    const totalValue = data?.data?.attributes?.total?.positions || 0;
    
    return new Response(
      JSON.stringify({ 
        balance: totalValue,
        walletAddress,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching wallet balance:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

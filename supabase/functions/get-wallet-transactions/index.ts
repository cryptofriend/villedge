import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resolve ENS name to Ethereum address
async function resolveEns(ensName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.ensdata.net/${ensName}`);
    
    if (!response.ok) {
      console.log(`ENS resolution via ensdata failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data.address) {
      return data.address;
    }
    
    return null;
  } catch (error) {
    console.error('ENS resolution failed:', error);
    return null;
  }
}

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  value: number;      // Native token amount (e.g., ETH)
  valueUsd: number;   // USD value
  symbol: string;
  chain: string;
  status: string;
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

    const apiKey = Deno.env.get('ZERION_API_KEY');
    if (!apiKey) {
      console.error('ZERION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve ENS name if needed
    let resolvedAddress = walletAddress;
    if (walletAddress.endsWith('.eth')) {
      console.log(`Resolving ENS name: ${walletAddress}`);
      const address = await resolveEns(walletAddress);
      if (!address) {
        return new Response(
          JSON.stringify({ error: 'Could not resolve ENS name' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resolvedAddress = address;
      console.log(`Resolved to: ${resolvedAddress}`);
    }

    console.log(`Fetching transactions for: ${resolvedAddress}`);

    // Zerion uses Basic Auth with API key as username
    const authHeader = 'Basic ' + btoa(apiKey + ':');

    // Fetch transactions from Zerion
    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${resolvedAddress}/transactions/?currency=usd&page[size]=50`,
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
        JSON.stringify({ error: `Failed to fetch transactions: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Fetched ${data?.data?.length || 0} transactions`);

    const normalizedAddress = resolvedAddress.toLowerCase();
    
    // Parse transactions
    const transactions: Transaction[] = (data?.data || []).map((tx: any) => {
      const attrs = tx.attributes;
      const transfers = attrs.transfers || [];
      
      // Determine if incoming or outgoing based on transfers
      let type: 'incoming' | 'outgoing' = 'outgoing';
      let value = 0;      // Native token amount
      let valueUsd = 0;   // USD value
      let symbol = 'ETH';
      let from = attrs.sent_from || '';
      let to = attrs.sent_to || '';
      
      // Check transfers for direction
      for (const transfer of transfers) {
        if (transfer.direction === 'in') {
          type = 'incoming';
          // Get native token quantity (not USD value)
          value = transfer.quantity?.float || transfer.quantity?.numeric || 0;
          valueUsd = transfer.value || 0;
          symbol = transfer.fungible_info?.symbol || 'ETH';
          from = transfer.sender || from;
          to = transfer.recipient || to;
          break;
        } else if (transfer.direction === 'out') {
          type = 'outgoing';
          // Get native token quantity (not USD value)
          value = transfer.quantity?.float || transfer.quantity?.numeric || 0;
          valueUsd = transfer.value || 0;
          symbol = transfer.fungible_info?.symbol || 'ETH';
          from = transfer.sender || from;
          to = transfer.recipient || to;
          break;
        }
      }
      
      // Fallback: check sent_from/sent_to
      if (transfers.length === 0) {
        if (attrs.sent_to?.toLowerCase() === normalizedAddress) {
          type = 'incoming';
        } else if (attrs.sent_from?.toLowerCase() === normalizedAddress) {
          type = 'outgoing';
        }
      }

      return {
        id: tx.id,
        type,
        hash: attrs.hash || '',
        timestamp: attrs.mined_at || attrs.created_at || new Date().toISOString(),
        from,
        to,
        value,
        valueUsd,
        symbol,
        chain: attrs.chain || 'ethereum',
        status: attrs.status || 'confirmed',
      };
    });

    // Separate incoming and outgoing
    const incoming = transactions.filter(tx => tx.type === 'incoming');
    const outgoing = transactions.filter(tx => tx.type === 'outgoing');
    
    return new Response(
      JSON.stringify({ 
        incoming,
        outgoing,
        walletAddress: resolvedAddress,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching transactions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

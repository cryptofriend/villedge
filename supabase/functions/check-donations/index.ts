import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  value: number;
  valueUsd: number;
  symbol: string;
  chain: string;
  status: string;
}

interface ResolvedName {
  address: string;
  name: string | null;
  avatar: string | null;
}

// Resolve ENS name to address
async function resolveEns(ensName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.ensdata.net/${ensName}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.address || null;
  } catch {
    return null;
  }
}

// Fetch incoming transactions from Zerion
async function fetchIncomingTransactions(walletAddress: string, apiKey: string): Promise<Transaction[]> {
  let resolvedAddress = walletAddress;
  
  if (walletAddress.endsWith('.eth')) {
    const address = await resolveEns(walletAddress);
    if (!address) {
      console.log(`Could not resolve ENS: ${walletAddress}`);
      return [];
    }
    resolvedAddress = address;
  }

  console.log(`Fetching transactions for: ${resolvedAddress}`);

  const authHeader = 'Basic ' + btoa(apiKey + ':');
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
    console.error(`Zerion API error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const normalizedAddress = resolvedAddress.toLowerCase();
  
  const transactions: Transaction[] = (data?.data || []).map((tx: any) => {
    const attrs = tx.attributes;
    const transfers = attrs.transfers || [];
    
    let type: 'incoming' | 'outgoing' = 'outgoing';
    let value = 0;
    let valueUsd = 0;
    let symbol = 'ETH';
    let from = attrs.sent_from || '';
    let to = attrs.sent_to || '';
    
    for (const transfer of transfers) {
      if (transfer.direction === 'in') {
        type = 'incoming';
        value = transfer.quantity?.float || transfer.quantity?.numeric || 0;
        valueUsd = transfer.value || 0;
        symbol = transfer.fungible_info?.symbol || 'ETH';
        from = transfer.sender || from;
        to = transfer.recipient || to;
        break;
      } else if (transfer.direction === 'out') {
        type = 'outgoing';
        value = transfer.quantity?.float || transfer.quantity?.numeric || 0;
        valueUsd = transfer.value || 0;
        symbol = transfer.fungible_info?.symbol || 'ETH';
        from = transfer.sender || from;
        to = transfer.recipient || to;
        break;
      }
    }
    
    if (transfers.length === 0) {
      if (attrs.sent_to?.toLowerCase() === normalizedAddress) {
        type = 'incoming';
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

  return transactions.filter(tx => tx.type === 'incoming');
}

// Fetch wallet balance from Zerion
async function fetchWalletBalance(walletAddress: string, apiKey: string): Promise<number | null> {
  try {
    let resolvedAddress = walletAddress;
    
    if (walletAddress.endsWith('.eth')) {
      const address = await resolveEns(walletAddress);
      if (!address) return null;
      resolvedAddress = address;
    }

    const authHeader = 'Basic ' + btoa(apiKey + ':');
    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${resolvedAddress}/portfolio/?currency=usd&filter[positions]=only_simple`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Zerion balance API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.data?.attributes?.total?.positions || null;
  } catch (error) {
    console.error("Failed to fetch wallet balance:", error);
    return null;
  }
}

// Resolve ENS/Basename for a donor address
async function resolveDonorName(address: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/resolve-ens-names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ addresses: [address] }),
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data?.results?.[0]?.name || null;
  } catch {
    return null;
  }
}

// Send Telegram notification
async function sendTelegramNotification(tx: Transaction, fromName?: string | null, treasuryBalance?: number | null, villageId?: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        type: "donation",
        name: "Treasury Donation",
        amount: tx.value,
        amountUsd: tx.valueUsd,
        symbol: tx.symbol,
        from: tx.from,
        fromName: fromName || undefined,
        txHash: tx.hash,
        chain: tx.chain,
        treasuryBalance: treasuryBalance,
        villageId: villageId,
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to send notification: ${text}`);
    } else {
      await response.text();
      console.log(`Telegram notification sent for tx: ${tx.hash}`);
    }
  } catch (error) {
    console.error("Failed to send donation notification:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting donation check...");
    
    const zerionKey = Deno.env.get('ZERION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!zerionKey) {
      throw new Error("ZERION_API_KEY not configured");
    }

    // Create Supabase client with service role for DB access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all villages with treasury wallet addresses
    // For now, we'll use the hardcoded wallet from the PoR village
    const walletAddress = "proofofretreat.eth";
    
    console.log(`Checking donations for wallet: ${walletAddress}`);

    // Fetch incoming transactions
    const incomingTxs = await fetchIncomingTransactions(walletAddress, zerionKey);
    console.log(`Found ${incomingTxs.length} incoming transactions`);

    if (incomingTxs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No incoming transactions found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get already notified tx hashes from database
    const { data: notifiedRows } = await supabase
      .from('notified_donations')
      .select('tx_hash')
      .eq('wallet_address', walletAddress);
    
    const notifiedHashes = new Set((notifiedRows || []).map(r => r.tx_hash));
    console.log(`Already notified: ${notifiedHashes.size} transactions`);

    // Filter to only new transactions (not already notified)
    const newTxs = incomingTxs.filter(tx => !notifiedHashes.has(tx.hash));
    console.log(`New transactions to notify: ${newTxs.length}`);

    // Only notify for recent transactions (within last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNewTxs = newTxs.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime > oneDayAgo;
    });
    console.log(`Recent new transactions (last 24h): ${recentNewTxs.length}`);

    // Fetch current treasury balance once (for all notifications)
    let treasuryBalance: number | null = null;
    if (recentNewTxs.length > 0) {
      treasuryBalance = await fetchWalletBalance(walletAddress, zerionKey);
      console.log(`Current treasury balance: $${treasuryBalance?.toFixed(2) || 'unknown'}`);
    }

    let notifiedCount = 0;
    const villageId = "por"; // Hardcoded for now, can be made dynamic

    // Process each new transaction
    for (const tx of recentNewTxs) {
      // Mark as notified in DB first (to prevent duplicates)
      const { error: insertError } = await supabase
        .from('notified_donations')
        .insert({ tx_hash: tx.hash, wallet_address: walletAddress });
      
      if (insertError) {
        // Already notified (race condition), skip
        console.log(`Skipping tx ${tx.hash} - already in DB`);
        continue;
      }

      // Resolve donor name
      const fromName = await resolveDonorName(tx.from);
      
      // Send notification with treasury balance
      await sendTelegramNotification(tx, fromName, treasuryBalance, villageId);
      notifiedCount++;
    }

    // Also mark older transactions as seen (without notifying)
    const olderTxs = newTxs.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime <= oneDayAgo;
    });
    
    if (olderTxs.length > 0) {
      const olderInserts = olderTxs.map(tx => ({
        tx_hash: tx.hash,
        wallet_address: walletAddress,
      }));
      
      await supabase
        .from('notified_donations')
        .upsert(olderInserts, { onConflict: 'tx_hash', ignoreDuplicates: true });
      
      console.log(`Marked ${olderTxs.length} older transactions as seen`);
    }

    console.log(`Donation check complete. Notified: ${notifiedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked ${incomingTxs.length} transactions, notified ${notifiedCount} new donations`,
        notified: notifiedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-donations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

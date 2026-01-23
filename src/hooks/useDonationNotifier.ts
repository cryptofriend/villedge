import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "./useWalletTransactions";

const NOTIFIED_TXS_KEY = "notified_donation_txs";

// Get already-notified transaction hashes from localStorage
function getNotifiedTxs(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIFIED_TXS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save notified transaction hashes to localStorage
function saveNotifiedTxs(txs: Set<string>) {
  try {
    // Keep only last 100 to prevent unbounded growth
    const arr = Array.from(txs).slice(-100);
    localStorage.setItem(NOTIFIED_TXS_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

interface ResolvedName {
  address: string;
  name: string | null;
  avatar: string | null;
}

// Resolve ENS/Basename for a donor address
async function resolveDonorName(address: string): Promise<string | null> {
  try {
    const { data } = await supabase.functions.invoke<{ results: ResolvedName[] }>("resolve-ens-names", {
      body: { addresses: [address] },
    });
    
    if (data?.results?.[0]?.name) {
      return data.results[0].name;
    }
    return null;
  } catch {
    return null;
  }
}

// Send donation notification to Telegram
async function sendDonationNotification(tx: Transaction, fromName?: string | null) {
  try {
    await supabase.functions.invoke("notify-telegram", {
      body: {
        type: "donation",
        name: "Treasury Donation",
        amount: tx.value,
        amountUsd: tx.valueUsd,
        symbol: tx.symbol,
        from: tx.from,
        fromName: fromName || undefined,
        txHash: tx.hash,
        chain: tx.chain,
      },
    });
    console.log(`Donation notification sent for tx: ${tx.hash}`);
  } catch (error) {
    console.error("Failed to send donation notification:", error);
  }
}

export function useDonationNotifier(incomingTransactions: Transaction[]) {
  const initializedRef = useRef(false);
  const notifiedTxsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Initialize from localStorage on first mount
    if (!initializedRef.current) {
      notifiedTxsRef.current = getNotifiedTxs();
      initializedRef.current = true;
    }

    if (incomingTransactions.length === 0) return;

    // Find new transactions we haven't notified about yet
    const newTxs = incomingTransactions.filter(
      (tx) => !notifiedTxsRef.current.has(tx.hash)
    );

    if (newTxs.length === 0) return;

    // Only notify for recent transactions (within last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNewTxs = newTxs.filter((tx) => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime > oneDayAgo;
    });

    // Process new transactions
    recentNewTxs.forEach(async (tx) => {
      // Mark as notified immediately to prevent duplicates
      notifiedTxsRef.current.add(tx.hash);
      saveNotifiedTxs(notifiedTxsRef.current);

      // Resolve donor name and send notification
      const fromName = await resolveDonorName(tx.from);
      await sendDonationNotification(tx, fromName);
    });

    // Also mark older transactions as "seen" without notifying
    newTxs.forEach((tx) => {
      notifiedTxsRef.current.add(tx.hash);
    });
    saveNotifiedTxs(notifiedTxsRef.current);
  }, [incomingTransactions]);
}

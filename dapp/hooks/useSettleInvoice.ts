"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface SettleInvoiceParams {
  invoiceId: string;
  amount: number; // in SUI
}

export function useSettleInvoice() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
  const platformId = process.env.NEXT_PUBLIC_PLATFORM_ID;

  const settleInvoice = async ({ invoiceId, amount }: SettleInvoiceParams) => {
    if (!currentAccount) {
      const errorMsg = "Please connect your wallet first";
      setError(errorMsg);
      toast({
        title: "Wallet not connected",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg };
    }

    if (!packageId || !platformId) {
      const errorMsg = "Environment not configured properly";
      setError(errorMsg);
      toast({
        title: "Configuration error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg };
    }

    setIsSettling(true);
    setError(null);

    try {
      console.log("🔄 Settling invoice:", invoiceId);
      console.log("Amount:", amount, "SUI");

      // Convert SUI to MIST
      const amountInMist = Math.floor(amount * 1_000_000_000);

      const tx = new TransactionBlock();

      // Split coins for payment
      const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure(amountInMist, "u64")]);

      // Call repay_invoice
      tx.moveCall({
        target: `${packageId}::invoice_financing::repay_invoice`,
        arguments: [
          tx.object(platformId), // platform
          tx.object(invoiceId),  // invoice
          paymentCoin,           // payment
        ],
      });

      console.log("📤 Submitting settlement transaction...");

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx as any, // Type workaround for version mismatch
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log("✅ Settlement successful:", result);

      toast({
        title: "Invoice settled",
        description: `Successfully settled invoice for ${amount.toFixed(2)} SUI`,
      });

      setIsSettling(false);
      return { 
        success: true, 
        digest: result.digest,
        effects: result.effects 
      };

    } catch (err: any) {
      console.error("❌ Settlement error:", err);
      const errorMsg = err.message || "Failed to settle invoice";
      setError(errorMsg);
      
      toast({
        title: "Settlement failed",
        description: errorMsg,
        variant: "destructive",
      });

      setIsSettling(false);
      return { success: false, error: errorMsg };
    }
  };

  return {
    settleInvoice,
    isSettling,
    error,
  };
}

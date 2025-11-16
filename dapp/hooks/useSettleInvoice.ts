"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface SettleInvoiceParams {
  invoiceId: string;
  escrowId: string;
  fundingId: string;
  totalPayment: number; // in SUI (includes invoice amount + discount)
}

export function useSettleInvoice() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const treasuryId = process.env.NEXT_PUBLIC_TREASURY_ID;

  const settleInvoice = async ({ 
    invoiceId, 
    escrowId, 
    fundingId, 
    totalPayment 
  }: SettleInvoiceParams) => {
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

    if (!packageId || !treasuryId) {
      const errorMsg = "Environment not configured properly. Missing Contract ID or Treasury ID.";
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
      console.log("Total payment:", totalPayment, "SUI");

      // Convert SUI to MIST
      const totalPaymentInMist = Math.floor(totalPayment * 1_000_000_000);

      const tx = new TransactionBlock();

      // Split coins for payment
      const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure(totalPaymentInMist, "u64")]);

      // Call pay_invoice (pay_invoice module)
      // entry fun pay_invoice(
      //     invoice: &mut Invoice,
      //     buyer_escrow: &mut BuyerEscrow,
      //     funding: &Funding,
      //     treasury: &mut Treasury,
      //     mut payment: Coin<SUI>,
      //     ctx: &mut TxContext
      // )
      tx.moveCall({
        target: `${packageId}::pay_invoice::pay_invoice`,
        arguments: [
          tx.object(invoiceId),    // invoice: &mut Invoice
          tx.object(escrowId),     // buyer_escrow: &mut BuyerEscrow
          tx.object(fundingId),    // funding: &Funding
          tx.object(treasuryId),   // treasury: &mut Treasury
          paymentCoin,             // payment: Coin<SUI>
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
        description: `Successfully settled invoice for ${totalPayment.toFixed(2)} SUI`,
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

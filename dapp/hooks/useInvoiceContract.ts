"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface CreateInvoiceParams {
  invoiceNumber: string;
  buyer: string;
  amount: number; // in SUI
  dueDate: Date;
  description: string;
}

export function useInvoiceContract() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isLoading, setIsLoading] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
  const clockObjectId = "0x6"; // Sui Clock object

  const createInvoice = async (params: CreateInvoiceParams) => {
    console.group("🔷 Invoice Creation Process Started");
    console.log("📋 Input Parameters:", params);
    
    if (!currentAccount) {
      console.error("❌ Wallet not connected");
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      console.groupEnd();
      return null;
    }

    console.log("✅ Wallet connected:", currentAccount.address);

    if (!packageId) {
      console.error("❌ Package ID not configured");
      console.log("Current NEXT_PUBLIC_PACKAGE_ID:", process.env.NEXT_PUBLIC_PACKAGE_ID);
      toast({
        title: "Configuration Error",
        description: "Package ID not configured. Please deploy the contract first.",
        variant: "destructive",
      });
      console.groupEnd();
      return null;
    }

    console.log("✅ Package ID:", packageId);
    setIsLoading(true);

    try {
      console.log("🔄 Building transaction block...");
      const txb = new TransactionBlock();

      // Convert amount from SUI to MIST (1 SUI = 1,000,000,000 MIST)
      const amountInMist = Math.floor(params.amount * 1_000_000_000);
      console.log(`💰 Amount conversion: ${params.amount} SUI → ${amountInMist} MIST`);

      // Convert due date to timestamp in milliseconds
      const dueDateTimestamp = params.dueDate.getTime();
      console.log(`📅 Due date: ${params.dueDate.toISOString()} → ${dueDateTimestamp}ms`);

      // Convert strings to vector<u8> format
      const invoiceNumberBytes = Array.from(
        new TextEncoder().encode(params.invoiceNumber)
      );
      const buyerBytes = Array.from(
        new TextEncoder().encode(params.buyer)
      );
      const descriptionBytes = Array.from(
        new TextEncoder().encode(params.description)
      );

      console.log("📝 Encoded data:");
      console.log("  - Invoice Number:", params.invoiceNumber, "→", invoiceNumberBytes);
      console.log("  - Buyer:", params.buyer, "→", buyerBytes);
      console.log("  - Description:", params.description, "→", descriptionBytes);

      const moveCallTarget = `${packageId}::invoice_financing::create_invoice`;
      console.log("🎯 Move Call Target:", moveCallTarget);
      console.log("🕐 Clock Object ID:", clockObjectId);

      // Call create_invoice function
      txb.moveCall({
        target: moveCallTarget,
        arguments: [
          txb.pure(invoiceNumberBytes),
          txb.pure(buyerBytes),
          txb.pure(amountInMist),
          txb.pure(dueDateTimestamp),
          txb.pure(descriptionBytes),
          txb.object(clockObjectId),
        ],
      });

      console.log("✅ Transaction block built successfully");
      console.log("📤 Sending transaction to blockchain...");

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      });

      console.log("✅ Transaction executed successfully!");
      console.log("📊 Full Transaction Result:", result);
      console.log("🔗 Transaction Digest:", result.digest);

      // Extract created invoice object ID
      const createdInvoice = result.effects?.created?.[0];
      const invoiceId = createdInvoice?.reference?.objectId;

      console.log("📦 Created Objects:", result.effects?.created);
      console.log("🆔 Invoice Object ID:", invoiceId);

      if (result.effects?.status?.status !== "success") {
        console.error("⚠️ Transaction status not successful:", result.effects?.status);
      }

      if (result.events) {
        console.log("🎉 Events emitted:", result.events);
      }

      toast({
        title: "Invoice Created Successfully!",
        description: `Invoice ${params.invoiceNumber} has been tokenized on-chain.`,
      });

      console.log("✅ Invoice creation completed successfully");
      console.groupEnd();

      setIsLoading(false);
      return {
        success: true,
        digest: result.digest,
        invoiceId,
        result,
      };
    } catch (error: any) {
      console.group("❌ Transaction Error");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }

      console.groupEnd();
      
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to create invoice. Please try again.",
        variant: "destructive",
      });

      setIsLoading(false);
      return null;
    }
  };

  return {
    createInvoice,
    isLoading,
    isConnected: !!currentAccount,
    address: currentAccount?.address,
  };
}


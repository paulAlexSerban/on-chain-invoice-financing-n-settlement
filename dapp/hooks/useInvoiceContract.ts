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

export interface FinanceInvoiceParams {
  invoiceId: string;
  invoiceAmount: number; // in SUI (face value)
  discountRate: number; // percentage (e.g., 2 for 2%)
}

export interface FinanceCalculation {
  invoiceAmount: number; // SUI
  discountRate: number; // percentage
  discountAmount: number; // SUI
  originationFeeRate: number; // percentage (from platform)
  originationFee: number; // SUI
  supplierReceives: number; // SUI
  investorPays: number; // SUI (= invoice amount)

  // At settlement (expected)
  takeRatePercent: number; // percentage (from platform)
  settlementFee: number; // SUI (from platform)
  expectedTakeRateFee: number; // SUI
  expectedInvestorReceives: number; // SUI
  expectedNetProfit: number; // SUI
  expectedAPY: number; // percentage
}

export function useInvoiceContract() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isLoading, setIsLoading] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
  const platformObjectId = process.env.NEXT_PUBLIC_PLATFORM_ID || "";
  const clockObjectId = "0x6"; // Sui Clock object

  // Platform fee defaults (should match smart contract defaults)
  const DEFAULT_ORIGINATION_FEE_BPS = 100; // 1%
  const DEFAULT_TAKE_RATE_BPS = 1000; // 10%
  const DEFAULT_SETTLEMENT_FEE_SUI = 0.01; // 0.01 SUI

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

  const calculateFinancing = (
    invoiceAmount: number,
    discountRate: number,
    daysUntilDue: number = 60
  ): FinanceCalculation => {
    // Calculate discount amount
    const discountAmount = invoiceAmount * (discountRate / 100);

    // Investor pays: invoice amount - discount (they get discount upfront)
    const investorPays = invoiceAmount - discountAmount;

    // Calculate origination fee on what investor pays
    const originationFeeRate = DEFAULT_ORIGINATION_FEE_BPS / 100; // 1%
    const originationFee = investorPays * (originationFeeRate / 100);

    // Supplier receives: what investor paid - origination fee
    const supplierReceives = investorPays - originationFee;

    // At settlement
    const takeRatePercent = DEFAULT_TAKE_RATE_BPS / 100; // 10%
    const expectedTakeRateFee = discountAmount * (takeRatePercent / 100);
    const settlementFee = DEFAULT_SETTLEMENT_FEE_SUI;

    // Investor receives at settlement: full invoice amount - take rate fee - settlement fee
    const expectedInvestorReceives = invoiceAmount - expectedTakeRateFee - settlementFee;

    // Net profit: what investor receives - what investor paid
    const expectedNetProfit = expectedInvestorReceives - investorPays;

    // APY calculation: (profit / investment) * (365 / days) * 100
    const expectedAPY = (expectedNetProfit / investorPays) * (365 / daysUntilDue) * 100;

    return {
      invoiceAmount,
      discountRate,
      discountAmount,
      originationFeeRate,
      originationFee,
      supplierReceives,
      investorPays,
      takeRatePercent,
      settlementFee,
      expectedTakeRateFee,
      expectedInvestorReceives,
      expectedNetProfit,
      expectedAPY,
    };
  };

  const financeInvoice = async (params: FinanceInvoiceParams) => {
    console.group("💰 Invoice Financing Process Started");
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

    if (!packageId || !platformObjectId) {
      console.error("❌ Configuration missing");
      console.log("Package ID:", packageId);
      console.log("Platform ID:", platformObjectId);
      toast({
        title: "Configuration Error",
        description: "Missing package ID or platform ID. Please check environment variables.",
        variant: "destructive",
      });
      console.groupEnd();
      return null;
    }

    console.log("✅ Package ID:", packageId);
    console.log("✅ Platform ID:", platformObjectId);
    setIsLoading(true);

    try {
      console.log("🔄 Building transaction block...");
      const txb = new TransactionBlock();

      // Convert amount from SUI to MIST
      const amountInMist = Math.floor(params.invoiceAmount * 1_000_000_000);
      console.log(`💰 Invoice Amount: ${params.invoiceAmount} SUI → ${amountInMist} MIST`);

      // Convert discount rate to basis points (2% = 200 bps)
      const discountRateBps = Math.floor(params.discountRate * 100);
      console.log(`📊 Discount Rate: ${params.discountRate}% → ${discountRateBps} bps`);

      // Calculate what investor needs to pay (invoice - discount)
      const calculation = calculateFinancing(params.invoiceAmount, params.discountRate);
      console.log("🧮 Financing Calculation:", calculation);

      // Investor pays the discounted amount (invoice - discount)
      const investorPaysInMist = Math.floor(calculation.investorPays * 1_000_000_000);
      console.log(`💵 Investor Pays: ${calculation.investorPays} SUI → ${investorPaysInMist} MIST`);

      // Split coins to create payment
      const [paymentCoin] = txb.splitCoins(txb.gas, [txb.pure(investorPaysInMist)]);

      const moveCallTarget = `${packageId}::invoice_financing::finance_invoice`;
      console.log("🎯 Move Call Target:", moveCallTarget);

      // Call finance_invoice function
      txb.moveCall({
        target: moveCallTarget,
        arguments: [
          txb.object(platformObjectId), // platform: &Platform
          txb.object(params.invoiceId),  // invoice: &mut Invoice
          paymentCoin,                   // payment: Coin<SUI>
          txb.pure(discountRateBps),     // discount_rate_bps: u64
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

      if (result.effects?.status?.status !== "success") {
        console.error("⚠️ Transaction status not successful:", result.effects?.status);
      }

      if (result.events) {
        console.log("🎉 Events emitted:", result.events);

        // Find InvoiceFunded event
        const fundedEvent = result.events.find((e: any) =>
          e.type.includes("InvoiceFunded")
        );

        if (fundedEvent) {
          console.log("💵 Invoice Funded Event Data:", fundedEvent.parsedJson);
        }
      }

      toast({
        title: "Invoice Financed Successfully!",
        description: `You've financed the invoice. Supplier receives ${calculation.supplierReceives.toFixed(2)} SUI.`,
      });

      console.log("✅ Invoice financing completed successfully");
      console.groupEnd();

      setIsLoading(false);
      return {
        success: true,
        digest: result.digest,
        calculation,
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
        description: error.message || "Failed to finance invoice. Please try again.",
        variant: "destructive",
      });

      setIsLoading(false);
      return null;
    }
  };

  return {
    createInvoice,
    financeInvoice,
    calculateFinancing,
    isLoading,
    isConnected: !!currentAccount,
    address: currentAccount?.address,
  };
}


"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface CreateInvoiceParams {
  invoiceNumber: string;
  buyerAddress: string; // Buyer's Sui address (0x...)
  amount: number; // in SUI
  dueDate: Date;
  companiesInfo: string; // JSON metadata
  discountBps?: number; // Discount in basis points (default 500 = 5%)
  feeBps?: number; // Fee in basis points (default 100 = 1%)
  escrowBps?: number; // Escrow in basis points (default 1000 = 10%)
}

export function useInvoiceContract() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isLoading, setIsLoading] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
  const factoryObjectId = process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID || "";
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url: network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443"
  });

  // Debug: Log environment variables on hook initialization
  if (typeof window !== 'undefined') {
    console.log("🔧 useInvoiceContract Environment Variables:");
    console.log("  - NEXT_PUBLIC_PACKAGE_ID:", process.env.NEXT_PUBLIC_PACKAGE_ID || "NOT SET");
    console.log("  - NEXT_PUBLIC_FACTORY_OBJECT_ID:", process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID || "NOT SET");
    console.log("  - Resolved packageId:", packageId || "EMPTY");
    console.log("  - Resolved factoryObjectId:", factoryObjectId || "EMPTY");
  }

  // Helper function to fetch SupplierCap from user's owned objects
  const fetchSupplierCap = async (ownerAddress: string): Promise<string | null> => {
    if (!packageId) return null;

    try {
      console.log("🔍 Fetching SupplierCap for address:", ownerAddress);

      const supplierCapType = `${packageId}::registry::SupplierCap`;
      console.log("Looking for type:", supplierCapType);

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: ownerAddress,
        filter: {
          StructType: supplierCapType,
        },
        options: {
          showType: true,
          showContent: true,
        },
      });

      console.log("Found SupplierCap objects:", ownedObjects.data.length);

      if (ownedObjects.data.length > 0) {
        const capId = ownedObjects.data[0].data?.objectId;
        console.log("✅ SupplierCap found:", capId);

        // Cache it for faster access
        if (capId) {
          localStorage.setItem('supplier_cap_id', capId);
        }

        return capId || null;
      }

      console.log("❌ No SupplierCap found for this address");
      return null;
    } catch (error) {
      console.error("Error fetching SupplierCap:", error);
      return null;
    }
  };

  // Convert string to address (Sui address format)
  const parseAddress = (addr: string | null | undefined): string => {
    // Validate address is not null/undefined
    if (!addr || typeof addr !== 'string') {
      throw new Error("Buyer address is required and must be a valid Sui address");
    }
    
    // Trim whitespace
    const trimmedAddr = addr.trim();
    
    // If already in address format (starts with 0x), return as-is
    if (trimmedAddr.startsWith("0x") && trimmedAddr.length === 66) {
      return trimmedAddr;
    }
    
    // Otherwise, this should be an address string - user needs to provide valid address
    // For now, return as-is and let blockchain validation catch errors
    // But at least validate it's not empty
    if (trimmedAddr.length === 0) {
      throw new Error("Buyer address cannot be empty");
    }
    
    return trimmedAddr;
  };

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

    if (!factoryObjectId) {
      console.error("❌ Factory Object ID not configured");
      console.error("  - process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID:", process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID);
      console.error("  - factoryObjectId variable:", factoryObjectId);
      console.error("  - Please check dapp/.env.local file and ensure NEXT_PUBLIC_FACTORY_OBJECT_ID is set");
      console.error("  - Restart the Next.js dev server after updating .env.local");
      toast({
        title: "Configuration Error",
        description: `Factory Object ID not configured. Please set NEXT_PUBLIC_FACTORY_OBJECT_ID in dapp/.env.local and restart the dev server. Current value: ${process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID || "undefined"}`,
        variant: "destructive",
      });
      console.groupEnd();
      return null;
    }

    console.log("✅ Package ID:", packageId);
    console.log("✅ Factory Object ID:", factoryObjectId);
    setIsLoading(true);

    try {
      console.log("🔄 Building transaction block...");
      const txb = new TransactionBlock();

      // Convert amount from SUI to MIST (1 SUI = 1,000,000,000 MIST)
      const amountInMist = Math.floor(params.amount * 1_000_000_000);
      console.log(`💰 Amount conversion: ${params.amount} SUI → ${amountInMist} MIST`);

      // Convert due date to timestamp in seconds (not milliseconds for Sui)
      const dueDateTimestamp = Math.floor(params.dueDate.getTime() / 1000);
      console.log(`📅 Due date: ${params.dueDate.toISOString()} → ${dueDateTimestamp}s`);

      // Validate and parse buyer address
      if (!params.buyerAddress || !params.buyerAddress.trim()) {
        console.error("❌ Buyer address is required");
        toast({
          title: "Validation Error",
          description: "Buyer address is required. Please enter a valid Sui address (0x...).",
          variant: "destructive",
        });
        console.groupEnd();
        setIsLoading(false);
        throw new Error("Buyer address is required");
      }
      
      const buyerAddress = parseAddress(params.buyerAddress);
      console.log("👤 Buyer address:", buyerAddress);
      console.log("👤 Buyer address length:", buyerAddress.length);
      console.log("👤 Buyer address format:", buyerAddress.startsWith("0x") ? "Valid (0x...)" : "Invalid format");

      // Companies info is already a JSON string
      const companiesInfoBytes = Array.from(
        new TextEncoder().encode(params.companiesInfo)
      );
      console.log("📝 Companies info:", params.companiesInfo);
      console.log("📝 Companies info bytes:", companiesInfoBytes);

      // Set defaults for BPS (basis points: 10000 = 100%)
      // discount_bps: 500 = 5% discount
      // fee_bps: 100 = 1% fee  
      // escrow_bps: 1000 = 10% escrow
      const discountBps = params.discountBps || 500; // 5% default
      const feeBps = params.feeBps || 100; // 1% default
      const escrowBps = params.escrowBps || 1000; // 10% default

      console.log("💰 Financial params:");
      console.log(`  - Discount: ${discountBps} BPS (${(discountBps / 100).toFixed(2)}%)`);
      console.log(`  - Fee: ${feeBps} BPS (${(feeBps / 100).toFixed(2)}%)`);
      console.log(`  - Escrow: ${escrowBps} BPS (${(escrowBps / 100).toFixed(2)}%)`);

      // Use invoice_factory::issue_invoice
      // Need SupplierCap - check if user needs to register first
      // SupplierCap is transferred to user, so we need it from their owned objects
      // For now, we'll assume user has registered before (or handle registration separately)
      
      console.log("🏭 Using invoice_factory::issue_invoice...");
      console.log("🔍 Fetching SupplierCap from blockchain...");

      // Fetch SupplierCap from user's owned objects
      const supplierCapId = await fetchSupplierCap(currentAccount.address);

      if (!supplierCapId) {
        console.error("❌ SupplierCap not found");
        toast({
          title: "Supplier Registration Required",
          description: "Please register as a supplier first. Use the 'Register as Supplier' button.",
          variant: "destructive",
        });
        console.groupEnd();
        setIsLoading(false);
        return null;
      }

      console.log("✅ SupplierCap ID:", supplierCapId);

      const moveCallTarget = `${packageId}::invoice_factory::issue_invoice` as `${string}::${string}::${string}`;
      console.log("🎯 Move Call Target:", moveCallTarget);
      console.log("📦 Factory Object ID:", factoryObjectId);
      console.log("🔑 SupplierCap ID:", supplierCapId);
      // Validate all arguments are defined
      if (!buyerAddress || amountInMist === undefined || dueDateTimestamp === undefined || 
          !companiesInfoBytes || escrowBps === undefined || discountBps === undefined || 
          feeBps === undefined || !supplierCapId) {
        console.error("❌ Missing required arguments");
        console.error("  - buyerAddress:", buyerAddress);
        console.error("  - amountInMist:", amountInMist);
        console.error("  - dueDateTimestamp:", dueDateTimestamp);
        console.error("  - companiesInfoBytes:", companiesInfoBytes);
        console.error("  - escrowBps:", escrowBps);
        console.error("  - discountBps:", discountBps);
        console.error("  - feeBps:", feeBps);
        console.error("  - supplierCapId:", supplierCapId);
        throw new Error("Missing required arguments for issue_invoice");
      }
      
      console.log("📊 Arguments validation passed:");
      console.log("  - buyerAddress:", buyerAddress, "(length:", buyerAddress.length, ")");
      console.log("  - amountInMist:", amountInMist);
      console.log("  - dueDateTimestamp:", dueDateTimestamp);
      console.log("  - companiesInfoBytes length:", companiesInfoBytes.length);
      console.log("  - escrowBps:", escrowBps);
      console.log("  - discountBps:", discountBps);
      console.log("  - feeBps:", feeBps);
      console.log("  - supplierCapId:", supplierCapId, "(length:", supplierCapId.length, ")");
      console.log("  - Total arguments: 8");

      // Call issue_invoice function with SupplierCap
      // The function signature is: issue_invoice(buyer: address, amount: u64, due_date: u64, companies_info: vector<u8>, escrow_bps: u64, discount_bps: u64, fee_bps: u64, _cap: &SupplierCap, ctx: &mut TxContext)
      // Note: This is a module-level entry function, not a method on InvoiceFactory, so we don't pass the factory object
      // The function expects 8 parameters (ctx is implicit in SDK)
      
      // Build arguments array with explicit typing for debugging
      const moveCallArgs = [
        txb.pure(buyerAddress), // 1. buyer: address  
        txb.pure(amountInMist), // 2. amount: u64
        txb.pure(dueDateTimestamp), // 3. due_date: u64 (seconds, not ms)
        txb.pure(companiesInfoBytes), // 4. companies_info: vector<u8>
        txb.pure(escrowBps), // 5. escrow_bps: u64
        txb.pure(discountBps), // 6. discount_bps: u64
        txb.pure(feeBps), // 7. fee_bps: u64
        txb.object(supplierCapId), // 8. _cap: &SupplierCap (immutable reference)
      ];
      
      console.log("🔧 Building moveCall:");
      console.log("  - Target:", moveCallTarget);
      console.log("  - Number of arguments:", moveCallArgs.length);
      console.log("  - Expected: 8");
      
      txb.moveCall({
        target: moveCallTarget,
        arguments: moveCallArgs,
      });
      
      console.log("✅ Transaction block built with", moveCallArgs.length, "arguments");

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

      // Extract created invoice object ID from shared objects
      const createdObjects = result.effects?.created || [];
      const invoiceObject = createdObjects.find(
        (obj: any) => obj.owner === 'Shared' || obj.owner?.Shared
      );
      const invoiceId = invoiceObject?.reference?.objectId || 
                       result.objectChanges?.find(
                         (change: any) => change.type === 'created' && change.objectType?.includes('Invoice')
                       )?.objectId;

      console.log("📦 Created Objects:", createdObjects);
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

      // Track invoice ID for later querying
      if (invoiceId) {
        // Store invoice ID for querying later
        const stored = localStorage.getItem('invoice_ids') 
          ? JSON.parse(localStorage.getItem('invoice_ids') || '[]')
          : [];
        if (!stored.includes(invoiceId)) {
          stored.push(invoiceId);
          localStorage.setItem('invoice_ids', JSON.stringify(stored));
          console.log("✅ Invoice ID tracked in localStorage:", invoiceId);
        }
      }

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

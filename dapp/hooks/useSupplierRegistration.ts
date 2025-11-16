"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient } from "@mysten/sui.js/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export function useSupplierRegistration() {
  const { 
    currentAccount, 
    signAndExecuteTransactionBlock 
  } = useWalletKit();
  
  const [isLoading, setIsLoading] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url: network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443"
  });

  const registerSupplier = async () => {
    console.group("🏭 Supplier Registration");
    console.log("Registering supplier to get SupplierCap...");
    
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

    if (!packageId) {
      console.error("❌ Package ID not configured");
      toast({
        title: "Configuration Error",
        description: "Package ID not configured.",
        variant: "destructive",
      });
      console.groupEnd();
      return null;
    }

    setIsLoading(true);

    try {
      console.log("🔄 Building transaction block...");
      console.log("📦 Package ID:", packageId);
      
      const txb = new TransactionBlock();

      // Register supplier - this creates and transfers SupplierCap
      const moveCallTarget = `${packageId}::registry::register_supplier` as `${string}::${string}::${string}`;
      console.log("🎯 Move Call Target:", moveCallTarget);
      
      txb.moveCall({
        target: moveCallTarget,
        arguments: [], // register_supplier takes no arguments
      });

      console.log("✅ Transaction block built successfully");
      console.log("📤 Sending registration transaction...");

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("✅ Supplier registered successfully!");
      console.log("📊 Full Result:", result);
      console.log("📦 Effects:", result.effects);
      console.log("📦 Object Changes:", result.objectChanges);

      // Extract SupplierCap object ID from created objects or object changes
      let supplierCapId: string | undefined;
      
      // Try objectChanges first (more reliable)
      if (result.objectChanges) {
        const supplierCapChange = result.objectChanges.find(
          (change: any) => 
            change.type === 'created' && 
            (change.objectType?.includes('SupplierCap') || change.objectType?.includes('registry::SupplierCap'))
        );
        if (supplierCapChange && 'objectId' in supplierCapChange) {
          supplierCapId = (supplierCapChange as any).objectId;
        }
        console.log("🔑 SupplierCap from objectChanges:", supplierCapId);
      }
      
      // Fallback to effects.created
      if (!supplierCapId && result.effects?.created) {
        const createdObjects = result.effects.created;
        const supplierCap = createdObjects.find(
          (obj: any) => 
            obj.reference?.objectType?.includes('SupplierCap') ||
            obj.reference?.objectType?.includes('registry::SupplierCap')
        );
        supplierCapId = supplierCap?.reference?.objectId;
        console.log("🔑 SupplierCap from effects:", supplierCapId);
      }
      
      // Also check mutated/transferred objects (since it's transferred to sender)
      if (!supplierCapId && result.objectChanges) {
        const transferred = result.objectChanges.find(
          (change: any) =>
            change.type === 'created' &&
            change.owner?.AddressOwner === currentAccount.address
        );
        if (transferred && 'objectId' in transferred) {
          supplierCapId = (transferred as any).objectId;
        }
        console.log("🔑 SupplierCap from transferred:", supplierCapId);
      }

      console.log("🔑 Final SupplierCap ID:", supplierCapId);

      if (supplierCapId) {
        // Store SupplierCap ID for later use
        localStorage.setItem('supplier_cap_id', supplierCapId);
        console.log("✅ SupplierCap ID stored in localStorage:", supplierCapId);
        
        toast({
          title: "Supplier Registered Successfully! 🎉",
          description: `SupplierCap ID: ${supplierCapId.slice(0, 10)}...${supplierCapId.slice(-8)}`,
        });
      } else {
        console.warn("⚠️ SupplierCap ID not found in transaction result");
        console.warn("Result objectChanges:", result.objectChanges);
        console.warn("Result effects:", result.effects);
        
        // Still show success but with warning
        toast({
          title: "Supplier Registered",
          description: "Registration successful, but SupplierCap ID not found. Check console for details.",
          variant: "default",
        });
      }

      console.groupEnd();
      setIsLoading(false);

      return {
        success: true,
        supplierCapId,
        digest: result.digest,
      };
    } catch (error: any) {
      console.group("❌ Registration Error");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }
      
      // Check for specific error types
      if (error.message?.includes('No module found')) {
        console.error("❌ Module not found - check Package ID");
        toast({
          title: "Module Not Found",
          description: `Module ${packageId}::registry::register_supplier not found. Check Package ID.`,
          variant: "destructive",
        });
      } else if (error.message?.includes('Invalid')) {
        console.error("❌ Invalid transaction - check function signature");
        toast({
          title: "Invalid Transaction",
          description: error.message || "Transaction is invalid. Check console for details.",
          variant: "destructive",
        });
      } else {
        console.error("❌ Unknown error");
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to register supplier. Check console for details.",
          variant: "destructive",
        });
      }
      
      console.groupEnd();

      setIsLoading(false);
      return null;
    }
  };

  const getSupplierCapId = async (): Promise<string | null> => {
    if (!currentAccount || !packageId) return null;

    try {
      // Query blockchain for SupplierCap
      const supplierCapType = `${packageId}::registry::SupplierCap`;

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        filter: {
          StructType: supplierCapType,
        },
        options: {
          showType: true,
          showContent: true,
        },
      });

      if (ownedObjects.data.length > 0) {
        const capId = ownedObjects.data[0].data?.objectId;

        // Cache it
        if (capId) {
          localStorage.setItem('supplier_cap_id', capId);
        }

        return capId || null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching SupplierCap:", error);

      // Fallback to localStorage
      const stored = localStorage.getItem('supplier_cap_id');
      return stored || null;
    }
  };

  return {
    registerSupplier,
    getSupplierCapId,
    isLoading,
    isConnected: !!currentAccount,
  };
}


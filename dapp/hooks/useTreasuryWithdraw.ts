import { useState } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { CONTRACT_ADDRESSES, MODULES, FUNCTIONS, CONVERSION } from "@/lib/contract/constants";

interface WithdrawResult {
  success: boolean;
  digest?: string;
  error?: string;
}

export function useTreasuryWithdraw() {
  const { currentAccount, signAndExecuteTransactionBlock } = useWalletKit();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withdrawFromTreasury = async (amountInSui: number): Promise<WithdrawResult> => {
    if (!currentAccount?.address) {
      const error = "Wallet not connected";
      setError(new Error(error));
      return { success: false, error };
    }

    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS;
    if (currentAccount.address.toLowerCase() !== ownerAddress?.toLowerCase()) {
      const error = "Only treasury owner can withdraw";
      setError(new Error(error));
      return { success: false, error };
    }

    if (!CONTRACT_ADDRESSES.TREASURY_ID) {
      const error = "Treasury ID not configured";
      setError(new Error(error));
      return { success: false, error };
    }

    setIsWithdrawing(true);
    setError(null);

    try {
      // Convert SUI to MIST
      const amountInMist = Math.floor(amountInSui * CONVERSION.MIST_PER_SUI);

      console.log("Withdrawing from treasury:", {
        treasuryId: CONTRACT_ADDRESSES.TREASURY_ID,
        amountInSui,
        amountInMist,
        owner: currentAccount.address,
      });

      const txb = new TransactionBlock();

      // Call treasury::withdraw function
      txb.moveCall({
        target: `${CONTRACT_ADDRESSES.PACKAGE_ID}::${MODULES.TREASURY}::${FUNCTIONS.WITHDRAW}`,
        arguments: [
          txb.object(CONTRACT_ADDRESSES.TREASURY_ID), // treasury: &mut Treasury
          txb.pure(amountInMist), // amount: u64
        ],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("Withdrawal transaction result:", result);

      if (result.effects?.status?.status === "success") {
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const errorMsg = result.effects?.status?.error || "Transaction failed";
        setError(new Error(errorMsg));
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (err) {
      console.error("Error withdrawing from treasury:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(err instanceof Error ? err : new Error(errorMessage));
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsWithdrawing(false);
    }
  };

  return {
    withdrawFromTreasury,
    isWithdrawing,
    error,
  };
}

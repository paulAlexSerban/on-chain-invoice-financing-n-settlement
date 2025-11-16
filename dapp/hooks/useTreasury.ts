import { useState, useEffect } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { SuiObjectData } from "@mysten/sui/client";
import { CONTRACT_ADDRESSES, CONVERSION } from "@/lib/contract/constants";

interface TreasuryData {
  id: string;
  owner: string;
  fee_bps: number;
  balance: bigint;
}

interface UseTreasuryReturn {
  treasuryData: TreasuryData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isOwner: boolean;
  balanceInSui: number;
}

export function useTreasury(): UseTreasuryReturn {
  const { currentAccount } = useWalletKit();
  const [treasuryData, setTreasuryData] = useState<TreasuryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
  const treasuryId = CONTRACT_ADDRESSES.TREASURY_ID;
  const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS;

  const suiClient = new SuiClient({
    url: network === "mainnet" 
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443"
  });

  const fetchTreasuryData = async () => {
    if (!treasuryId) {
      setError(new Error("Treasury ID not configured"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching treasury object:", treasuryId);

      const response = await suiClient.getObject({
        id: treasuryId,
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        },
      });

      console.log("Treasury response:", response);

      if (response.data) {
        const objectData = response.data as SuiObjectData;
        
        if (objectData.content && "fields" in objectData.content) {
          const fields = objectData.content.fields as any;
          
          // Parse treasury fields from the smart contract
          const treasury: TreasuryData = {
            id: fields.id?.id || treasuryId,
            owner: fields.owner || "",
            fee_bps: parseInt(fields.fee_bps || "0"),
            balance: BigInt(fields.balance || "0"),
          };

          console.log("Parsed treasury data:", treasury);
          setTreasuryData(treasury);
        } else {
          throw new Error("Treasury object has invalid content structure");
        }
      } else {
        throw new Error("Treasury object not found");
      }
    } catch (err) {
      console.error("Error fetching treasury:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, [treasuryId]);

  // Check if current user is the owner
  const isOwner =
    !!currentAccount?.address &&
    !!ownerAddress &&
    currentAccount.address.toLowerCase() === ownerAddress.toLowerCase();

  // Convert balance from MIST to SUI
  const balanceInSui = treasuryData
    ? Number(treasuryData.balance) / CONVERSION.MIST_PER_SUI
    : 0;

  return {
    treasuryData,
    isLoading,
    error,
    refetch: fetchTreasuryData,
    isOwner,
    balanceInSui,
  };
}

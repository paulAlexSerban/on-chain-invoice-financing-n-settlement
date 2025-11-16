"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { useQuery } from "@tanstack/react-query";
import { OnChainInvoice, formatSuiAmount, InvoiceFilters, InvoiceStatus } from "@/types/invoice";

/**
 * Hook to query shared Invoice objects
 * Since invoices are shared objects (public_share_object), we need a different approach
 * This requires either:
 * 1. An indexer to track invoice IDs
 * 2. Querying from factory object if it stores references
 * 3. Tracking invoice IDs when they're created
 */
export function useSharedInvoices(filters?: InvoiceFilters) {
  const { currentAccount } = useWalletKit();
  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const factoryObjectId = process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url: network === "mainnet" 
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443"
  });

  const fetchInvoices = async (): Promise<OnChainInvoice[]> => {
    if (!packageId) {
      console.warn("Package ID not configured");
      return [];
    }

    console.group("🔍 Fetching Shared Invoices from Blockchain");
    console.log("Package ID:", packageId);
    console.log("Factory Object ID:", factoryObjectId);
    console.log("Network:", network);

    try {
      // Since invoices are shared objects, we need to query them differently
      // Option 1: Query factory object if it has a list of invoices
      // Option 2: Use an indexer/backend
      // Option 3: Track invoice IDs when created (store in localStorage/DB)
      
      // For now, try to get invoices from known sources
      // This is a simplified approach - in production, use an indexer
      
      // Try to query factory object to see if it has invoice references
      // If factory doesn't store invoice IDs, we need another method
      
      const invoiceType = `${packageId}::invoice::Invoice`;
      console.log("Invoice Type:", invoiceType);
      
      // Query all shared Invoice objects by type
      console.log("📡 Querying all Invoice objects by type...");

      let invoiceObjects: any[] = [];

      try {
        // Skip event queries - smart contract doesn't emit events
        // Go directly to localStorage tracking
        console.log("📦 Loading invoice IDs from localStorage...");
        
        let storedInvoiceIds: string[] = [];
        try {
          const stored = localStorage.getItem('invoice_ids');
          if (stored) {
            const parsed = JSON.parse(stored);
            // Ensure it's an array and filter out invalid entries
            storedInvoiceIds = Array.isArray(parsed) 
              ? parsed.filter((id: any) => typeof id === 'string' && id.length > 20)
              : [];
          }
        } catch (parseError) {
          console.error("Error parsing invoice_ids from localStorage:", parseError);
          // Clear invalid data
          localStorage.removeItem('invoice_ids');
          storedInvoiceIds = [];
        }

        console.log("📦 Valid invoice IDs from localStorage:", storedInvoiceIds);

        if (storedInvoiceIds.length === 0) {
          console.warn("⚠️ No invoice IDs tracked in localStorage.");
          console.warn("💡 Create an invoice first to see it in the marketplace.");
          console.groupEnd();
          return [];
        }

        // Fetch each invoice object with better error handling
        const fetchResults = await Promise.allSettled(
          storedInvoiceIds.map(async (id: string) => {
            console.log(`Fetching invoice ${id}...`);
            
            // Validate invoice ID format
            if (!id || typeof id !== 'string' || id.length < 20) {
              console.warn(`Invalid invoice ID format: ${id}`);
              return null;
            }
            
            try {
              const obj = await suiClient.getObject({
                id: id,
                options: {
                  showContent: true,
                  showOwner: true,
                  showType: true,
                },
              });
              
              if (!obj.data) {
                console.warn(`No data for invoice ${id}`);
                return null;
              }

              console.log(`✅ Fetched invoice ${id}:`, obj.data);
              return obj;
            } catch (error) {
              console.error(`❌ Error fetching invoice ${id}:`, error);
              return null;
            }
          })
        );

        // Extract successful results and filter out nulls
        invoiceObjects = fetchResults
          .filter((result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

      } catch (queryError) {
        console.error("❌ Error querying invoices:", queryError);
        
        // Try fallback to localStorage
        let storedInvoiceIds: string[] = [];
        try {
          const stored = localStorage.getItem('invoice_ids');
          if (stored) {
            const parsed = JSON.parse(stored);
            storedInvoiceIds = Array.isArray(parsed) 
              ? parsed.filter((id: any) => typeof id === 'string' && id.length > 20)
              : [];
          }
        } catch (parseError) {
          console.error("Error parsing invoice_ids:", parseError);
          storedInvoiceIds = [];
        }

        console.log("Fallback to stored invoice IDs:", storedInvoiceIds);

        if (storedInvoiceIds.length === 0) {
          console.warn("⚠️ No invoice IDs tracked.");
          console.groupEnd();
          return [];
        }

        const fallbackResults = await Promise.allSettled(
          storedInvoiceIds.map(async (id: string) => {
            // Validate invoice ID format
            if (!id || typeof id !== 'string' || id.length < 20) {
              console.warn(`Invalid invoice ID format: ${id}`);
              return null;
            }
            
            try {
              const obj = await suiClient.getObject({
                id: id,
                options: {
                  showContent: true,
                  showOwner: true,
                  showType: true,
                },
              });
              
              if (!obj.data) {
                console.warn(`No data for invoice ${id}`);
                return null;
              }
              
              return obj;
            } catch (error) {
              console.error(`Error fetching invoice ${id}:`, error);
              return null;
            }
          })
        );

        invoiceObjects = fallbackResults
          .filter((result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);
      }

      console.log("Fetched objects:", invoiceObjects.length);

      // For financed invoices, fetch the Funding objects to get investor address
      console.log("🔍 Fetching Funding objects for financed invoices...");
      const fundingType = `${packageId}::invoice_financing::Funding`;
      
      // Map of invoice ID -> funder address
      const fundingMap: Record<string, string> = {};
      
      // Query all Funding objects (they are shared objects)
      // We need to track Funding IDs similar to how we track invoice IDs
      try {
        // Try to get funding IDs from localStorage first
        let storedFundingIds: string[] = [];
        try {
          const stored = localStorage.getItem('funding_ids');
          if (stored) {
            const parsed = JSON.parse(stored);
            storedFundingIds = Array.isArray(parsed) 
              ? parsed.filter((id: any) => typeof id === 'string' && id.length > 20)
              : [];
          }
        } catch (parseError) {
          console.error("Error parsing funding_ids from localStorage:", parseError);
          storedFundingIds = [];
        }

        console.log(`📦 Found ${storedFundingIds.length} Funding IDs in localStorage`);

        // Fetch each Funding object
        const fundingResults = await Promise.allSettled(
          storedFundingIds.map(async (id: string) => {
            try {
              const obj = await suiClient.getObject({
                id: id,
                options: {
                  showContent: true,
                  showType: true,
                },
              });
              
              if (!obj.data) return null;
              return obj;
            } catch (error) {
              console.error(`Error fetching Funding ${id}:`, error);
              return null;
            }
          })
        );

        const fundingObjects = fundingResults
          .filter((result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        console.log(`✅ Fetched ${fundingObjects.length} Funding objects`);
        
        // Build map of invoice_id -> funder
        for (const fundingObj of fundingObjects) {
          const fundingContent = fundingObj.data?.content as any;
          if (fundingContent?.fields) {
            const invoiceId = fundingContent.fields.invoice_id;
            const funder = fundingContent.fields.funder;
            if (invoiceId && funder) {
              fundingMap[invoiceId] = funder;
              console.log(`💰 Funding: Invoice ${invoiceId.slice(0, 8)}... funded by ${funder.slice(0, 8)}...`);
            }
          }
        }
      } catch (fundingError) {
        console.warn("Could not query Funding objects:", fundingError);
      }

      // Parse invoice data from actual Invoice struct
      const invoices: OnChainInvoice[] = invoiceObjects
        .filter(
          (obj): obj is NonNullable<typeof obj> =>
            obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

          // Helper to extract Option<T> values from Move
          // Move Option is represented as {vec: [value]} or {vec: []}
          const extractOption = (optionField: any) => {
            if (!optionField || !optionField.vec) return undefined;
            return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
          };

          // Get investor from Funding object (not from Invoice struct)
          const invoiceId = obj.data!.objectId;
          const investor = fundingMap[invoiceId]; // Get from Funding map
          
          // These fields don't exist in current Invoice struct
          // Keeping the code in case they're added later
          const investorPaid = extractOption(fields.investor_paid);
          const supplierReceived = extractOption(fields.supplier_received);
          const originationFee = extractOption(fields.origination_fee);

          // Parse companies_info (JSON string)
          let companiesInfoStr = "";
          let companiesInfo: any = {};

          if (fields.companies_info) {
            try {
              companiesInfoStr = Buffer.from(fields.companies_info).toString("utf-8");
              companiesInfo = JSON.parse(companiesInfoStr);
            } catch (e) {
              console.warn("Failed to parse companies_info:", e);
              companiesInfoStr = "";
            }
          }

          // Safely parse numeric fields with defaults
          const invoice: OnChainInvoice = {
            id: obj.data!.objectId,
            buyer: fields.buyer || "", // address (not bytes!)
            supplier: fields.supplier || "", // address (issuer)
            amount: fields.amount?.toString() || "0",
            amountInSui: fields.amount ? formatSuiAmount(fields.amount) : 0,
            dueDate: fields.due_date ? parseInt(fields.due_date) * 1000 : Date.now(), // Convert seconds to ms
            companiesInfo: companiesInfoStr,
            status: fields.status !== undefined ? parseInt(fields.status) : 0, // 0=Created, 1=Ready, 2=Financed, 3=Paid
            escrowBps: fields.escrow_bps !== undefined ? parseInt(fields.escrow_bps) : 0,
            discountBps: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            feeBps: fields.fee_bps !== undefined ? parseInt(fields.fee_bps) : 0,
            createdAt: Date.now(), // TODO: Add created_at field to Invoice struct
            // Parse from companies_info
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            description: companiesInfo.description || "",
            issuer: fields.supplier || "", // supplier is the issuer
            // Extract Option fields for financing info
            financedBy: investor,
            investorPaid: investorPaid,
            investorPaidInSui: investorPaid ? formatSuiAmount(investorPaid) : undefined,
            supplierReceived: supplierReceived,
            supplierReceivedInSui: supplierReceived ? formatSuiAmount(supplierReceived) : undefined,
            originationFeeCollected: originationFee,
            originationFeeCollectedInSui: originationFee ? formatSuiAmount(originationFee) : undefined,
            discountRateBps: fields.discount_bps?.toString() || "0",
          };

          return invoice;
        });

      console.log("Parsed invoices:", invoices.length);
      if (invoices.length > 0) {
        console.log("Sample invoice:", invoices[0]);
      }

      // Apply filters
      let filteredInvoices = invoices;

      if (filters?.status && filters.status !== "all") {
        const statusMap: Record<string, number> = {
          created: InvoiceStatus.CREATED,
          ready: InvoiceStatus.READY,
          funded: InvoiceStatus.FINANCED,
          paid: InvoiceStatus.PAID,
        };
        filteredInvoices = filteredInvoices.filter(
          (inv) =>
            inv.status === statusMap[filters.status as string]
        );
      }

      if (filters?.minAmount) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.amountInSui >= filters.minAmount!
        );
      }

      if (filters?.maxAmount) {
        filteredInvoices = filteredInvoices.filter(
          (inv) => inv.amountInSui <= filters.maxAmount!
        );
      }

      // Apply sorting
      if (filters?.sortBy) {
        filteredInvoices.sort((a, b) => {
          let aVal: number, bVal: number;

          switch (filters.sortBy) {
            case 'amount':
              aVal = a.amountInSui;
              bVal = b.amountInSui;
              break;
            case 'dueDate':
              aVal = a.dueDate;
              bVal = b.dueDate;
              break;
            case 'createdAt':
              aVal = a.createdAt || 0;
              bVal = b.createdAt || 0;
              break;
            default:
              return 0;
          }

          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return (aVal - bVal) * order;
        });
      }

      console.log("Filtered invoices:", filteredInvoices.length);
      console.groupEnd();

      return filteredInvoices;
    } catch (error) {
      console.error("Error fetching invoices:", error);
      console.groupEnd();
      throw error;
    }
  };

  return useQuery({
    queryKey: ['shared-invoices', packageId, filters],
    queryFn: fetchInvoices,
    enabled: !!packageId,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

/**
 * Helper function to add invoice ID to tracking
 * Call this after creating an invoice
 */
export function trackInvoiceId(invoiceId: string) {
  const stored = localStorage.getItem('invoice_ids') 
    ? JSON.parse(localStorage.getItem('invoice_ids') || '[]')
    : [];
  
  if (!stored.includes(invoiceId)) {
    stored.push(invoiceId);
    localStorage.setItem('invoice_ids', JSON.stringify(stored));
    console.log("✅ Invoice ID tracked:", invoiceId);
  }
}

/**
 * Helper function to add funding ID to tracking
 * Call this after financing an invoice
 */
export function trackFundingId(fundingId: string) {
  const stored = localStorage.getItem('funding_ids') 
    ? JSON.parse(localStorage.getItem('funding_ids') || '[]')
    : [];
  
  if (!stored.includes(fundingId)) {
    stored.push(fundingId);
    localStorage.setItem('funding_ids', JSON.stringify(stored));
    console.log("✅ Funding ID tracked:", fundingId);
  }
}


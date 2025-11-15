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
      
      // Query for InvoiceCreated events to discover invoices
      console.log("📡 Querying InvoiceCreated events...");

      let storedInvoiceIds: string[] = [];

      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::invoice_factory::InvoiceCreated`,
          },
          limit: 100,
          order: "descending",
        });

        console.log("Found InvoiceCreated events:", events.data.length);

        // Extract invoice IDs from events
        storedInvoiceIds = events.data
          .map((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.invoice_id;
          })
          .filter(Boolean);

        console.log("Invoice IDs from events:", storedInvoiceIds);

        if (storedInvoiceIds.length === 0) {
          console.warn("⚠️ No invoices found on blockchain yet.");
          console.warn("⚠️ Create an invoice first to see it in the marketplace.");
          console.groupEnd();
          return [];
        }
      } catch (eventError) {
        console.error("Error querying events, falling back to localStorage:", eventError);

        // Fallback to localStorage
        storedInvoiceIds = localStorage.getItem('invoice_ids')
          ? JSON.parse(localStorage.getItem('invoice_ids') || '[]')
          : [];

        console.log("Stored invoice IDs:", storedInvoiceIds);

        if (storedInvoiceIds.length === 0) {
          console.warn("⚠️ No invoice IDs tracked.");
          console.groupEnd();
          return [];
        }
      }

      // Fetch each invoice object
      const invoiceObjects = await Promise.all(
        storedInvoiceIds.map(async (id: string) => {
          try {
            const obj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showOwner: true,
                showType: true,
              },
            });
            return obj;
          } catch (error) {
            console.error(`Error fetching invoice ${id}:`, error);
            return null;
          }
        })
      );

      console.log("Fetched objects:", invoiceObjects.length);

      // Parse invoice data from actual Invoice struct
      const invoices: OnChainInvoice[] = invoiceObjects
        .filter(
          (obj): obj is NonNullable<typeof obj> =>
            obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

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
            // Parse from companies_info
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            description: companiesInfo.description || "",
            issuer: fields.supplier || "", // supplier is the issuer
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


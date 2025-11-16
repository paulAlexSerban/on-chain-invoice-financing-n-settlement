"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient } from "@mysten/sui.js/client";
import { useQuery } from "@tanstack/react-query";
import {
  OnChainInvoice,
  formatSuiAmount,
  InvoiceFilters,
  InvoiceStatus,
} from "@/types/invoice";

export function useInvoices(filters?: InvoiceFilters) {
  const { currentAccount } = useWalletKit();
  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url:
      network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443",
  });

  const fetchInvoices = async (): Promise<OnChainInvoice[]> => {
    if (!packageId) {
      console.warn("Package ID not configured");
      return [];
    }

    console.group("🔍 Fetching Invoices from Blockchain");
    console.log("Package ID:", packageId);
    console.log("Network:", network);

    try {
      // Get all Invoice objects owned by anyone
      // We need to query by object type
      const invoiceType = `${packageId}::invoice_financing::Invoice`;
      console.log("Querying for type:", invoiceType);

      // Query for all objects of type Invoice
      // Note: This is a simplified approach. In production, you'd want to:
      // 1. Use events to build an index
      // 2. Use a backend indexer
      // 3. Or query owned objects + shared objects

      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::invoice_factory::InvoiceCreated`,
        },
        limit: 50, // Adjust as needed
        order: "descending",
      });

      console.log("Events found:", events.data.length);

      // Extract invoice IDs from events
      const invoiceIds = events.data
        .map((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.invoice_id;
        })
        .filter(Boolean);

      console.log("Invoice IDs:", invoiceIds);

      // Fetch each invoice object
      const invoiceObjects = await Promise.all(
        invoiceIds.map(async (id) => {
          try {
            const obj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showOwner: true,
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

      // Parse invoice data
      const invoices: OnChainInvoice[] = invoiceObjects
        .filter(
          (obj): obj is NonNullable<typeof obj> =>
            obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

          // Helper to extract Option<T> values (Move Option is represented as {vec: [value]} or {vec: []})
          const extractOption = (optionField: any) => {
            if (!optionField || !optionField.vec) return undefined;
            return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
          };

          const investor = extractOption(fields.investor);
          const investorPaid = extractOption(fields.investor_paid);
          const supplierReceived = extractOption(fields.supplier_received);
          const originationFee = extractOption(fields.origination_fee);

          // Parse companies_info (JSON string containing invoice number and description)
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

          const invoice: OnChainInvoice = {
            id: obj.data!.objectId,
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            issuer: fields.supplier || "",
            buyer: fields.buyer || "", // buyer is an address, not bytes
            amount: fields.amount?.toString() || "0",
            amountInSui: fields.amount ? formatSuiAmount(fields.amount) : 0,
            dueDate: fields.due_date ? parseInt(fields.due_date) * 1000 : Date.now(), // Convert seconds to ms
            description: companiesInfo.description || companiesInfoStr,
            createdAt: Date.now(), // TODO: Add created_at to Invoice struct
            status: fields.status !== undefined ? parseInt(fields.status) : 0,
            financedBy: investor,
            investorPaid: investorPaid,
            investorPaidInSui: investorPaid ? formatSuiAmount(investorPaid) : undefined,
            supplierReceived: supplierReceived,
            supplierReceivedInSui: supplierReceived ? formatSuiAmount(supplierReceived) : undefined,
            originationFeeCollected: originationFee,
            originationFeeCollectedInSui: originationFee ? formatSuiAmount(originationFee) : undefined,
            discountRateBps: fields.discount_bps?.toString() || "0",
            escrowBps: fields.escrow_bps !== undefined ? parseInt(fields.escrow_bps) : 0,
            discountBps: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            feeBps: fields.fee_bps !== undefined ? parseInt(fields.fee_bps) : 0,
            companiesInfo: companiesInfoStr,
            supplier: fields.supplier || "",
          };

          return invoice;
        });

      console.log("Parsed invoices:", invoices.length);
      console.log("Sample invoice:", invoices[0]);

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
            case "amount":
              aVal = a.amountInSui;
              bVal = b.amountInSui;
              break;
            case "dueDate":
              aVal = a.dueDate;
              bVal = b.dueDate;
              break;
            case "createdAt":
              aVal = a.createdAt;
              bVal = b.createdAt;
              break;
            default:
              return 0;
          }

          const order = filters.sortOrder === "desc" ? -1 : 1;
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
    queryKey: ["invoices", packageId, filters],
    queryFn: fetchInvoices,
    enabled: !!packageId,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

// Hook to fetch a single invoice
export function useInvoice(invoiceId: string) {
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url:
      network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443",
  });

  const fetchInvoice = async (): Promise<OnChainInvoice | null> => {
    if (!invoiceId) return null;

    try {
      const obj = await suiClient.getObject({
        id: invoiceId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });

      if (!obj.data?.content) return null;

      const content = obj.data.content as any;
      const fields = content.fields;

      return {
        id: obj.data.objectId,
        invoiceNumber: Buffer.from(fields.invoice_number).toString("utf-8"),
        issuer: fields.issuer,
        buyer: Buffer.from(fields.buyer).toString("utf-8"),
        amount: fields.amount,
        amountInSui: formatSuiAmount(fields.amount),
        dueDate: parseInt(fields.due_date),
        description: Buffer.from(fields.description).toString("utf-8"),
        createdAt: parseInt(fields.created_at),
        status: parseInt(fields.status),
        financedBy: fields.financed_by,
        financedAmount: fields.financed_amount || "0",
        financedAmountInSui: formatSuiAmount(fields.financed_amount || "0"),
      };
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return null;
    }
  };

  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: fetchInvoice,
    enabled: !!invoiceId,
  });
}

// Hook to fetch user's invoices (created by them)
// Uses event-based query to find all invoices where issuer = current user
// This works even after invoices are financed and ownership transfers
export function useMyInvoices() {
  const { currentAccount } = useWalletKit();
  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url:
      network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443",
  });

  const fetchMyInvoices = async (): Promise<OnChainInvoice[]> => {
    if (!currentAccount || !packageId) return [];

    console.group("📋 Fetching My Invoices (Business Dashboard)");
    console.log("Issuer Address:", currentAccount.address);
    console.log("Package ID:", packageId);

    try {
      // Query InvoiceCreated events to find all invoices created by this user
      // This is the correct approach per the documentation - event-based indexing
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::invoice_factory::InvoiceCreated`,
        },
        limit: 100, // Adjust as needed
        order: "descending",
      });

      console.log("Total InvoiceCreated events found:", events.data.length);

      // Filter events where supplier (issuer) matches current user
      const myInvoiceEvents = events.data.filter((event) => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.supplier === currentAccount.address;
      });

      console.log("Events for this issuer:", myInvoiceEvents.length);

      // Extract invoice IDs from events
      const invoiceIds = myInvoiceEvents
        .map((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.invoice_id;
        })
        .filter(Boolean);

      console.log("Invoice IDs:", invoiceIds);

      // Fetch each invoice object by ID
      const invoiceObjects = await Promise.all(
        invoiceIds.map(async (id) => {
          try {
            const obj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showOwner: true,
              },
            });
            return obj;
          } catch (error) {
            console.error(`Error fetching invoice ${id}:`, error);
            return null;
          }
        })
      );

      console.log("Successfully fetched objects:", invoiceObjects.filter(o => o !== null).length);

      // Parse invoice data
      const invoices = invoiceObjects
        .filter((obj) => obj !== null && obj.data?.content)
        .map((obj) => {
          const content = obj!.data!.content as any;
          const fields = content.fields;

          // Helper to extract Option<T> values
          const extractOption = (optionField: any) => {
            if (!optionField || !optionField.vec) return undefined;
            return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
          };

          const investor = extractOption(fields.investor);
          const investorPaid = extractOption(fields.investor_paid);
          const supplierReceived = extractOption(fields.supplier_received);
          const originationFee = extractOption(fields.origination_fee);

          // Parse companies_info
          let companiesInfoStr = "";
          let companiesInfo: any = {};

          if (fields.companies_info) {
            try {
              companiesInfoStr = Buffer.from(fields.companies_info).toString("utf-8");
              companiesInfo = JSON.parse(companiesInfoStr);
            } catch (e) {
              console.warn("Failed to parse companies_info:", e);
            }
          }

          return {
            id: obj!.data!.objectId,
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            issuer: fields.supplier || "",
            buyer: fields.buyer || "",
            amount: fields.amount?.toString() || "0",
            amountInSui: fields.amount ? formatSuiAmount(fields.amount) : 0,
            dueDate: fields.due_date ? parseInt(fields.due_date) * 1000 : Date.now(),
            description: companiesInfo.description || companiesInfoStr,
            createdAt: Date.now(), // TODO: Add created_at field to Invoice struct
            status: fields.status !== undefined ? parseInt(fields.status) : 0,
            financedBy: investor,
            investorPaid: investorPaid,
            investorPaidInSui: investorPaid ? formatSuiAmount(investorPaid) : undefined,
            supplierReceived: supplierReceived,
            supplierReceivedInSui: supplierReceived ? formatSuiAmount(supplierReceived) : undefined,
            originationFeeCollected: originationFee,
            originationFeeCollectedInSui: originationFee ? formatSuiAmount(originationFee) : undefined,
            discountRateBps: fields.discount_bps?.toString() || "0",
            escrowBps: fields.escrow_bps !== undefined ? parseInt(fields.escrow_bps) : 0,
            discountBps: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            feeBps: fields.fee_bps !== undefined ? parseInt(fields.fee_bps) : 0,
            companiesInfo: companiesInfoStr,
            supplier: fields.supplier || "",
          };
        });

      console.log("Parsed invoices:", invoices.length);
      console.log("Status breakdown:", {
        created: invoices.filter(i => i.status === InvoiceStatus.CREATED).length,
        ready: invoices.filter(i => i.status === InvoiceStatus.READY).length,
        financed: invoices.filter(i => i.status === InvoiceStatus.FINANCED).length,
        paid: invoices.filter(i => i.status === InvoiceStatus.PAID).length,
        defaulted: invoices.filter(i => i.status === InvoiceStatus.DEFAULTED).length,
      });
      console.groupEnd();

      return invoices;
    } catch (error) {
      console.error("Error fetching my invoices:", error);
      console.groupEnd();
      return [];
    }
  };

  return useQuery({
    queryKey: ["my-invoices", currentAccount?.address, packageId],
    queryFn: fetchMyInvoices,
    enabled: !!currentAccount && !!packageId,
    refetchInterval: 10000,
  });
}

// Hook to fetch invoices financed by the current user
export function useMyInvestments() {
  const { currentAccount } = useWalletKit();
  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url:
      network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443",
  });

  const fetchMyInvestments = async (): Promise<OnChainInvoice[]> => {
    if (!currentAccount || !packageId) return [];

    console.group("💼 Fetching My Investments");
    console.log("Investor Address:", currentAccount.address);
    console.log("Package ID:", packageId);

    try {
      // Query for InvoiceFunded events where the investor is the current user
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::invoice_financing::InvoiceFunded`,
        },
        limit: 100,
        order: "descending",
      });

      console.log("Total InvoiceFunded events:", events.data.length);

      // Filter events where investor matches current user
      const myInvestmentEvents = events.data.filter((event) => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.investor === currentAccount.address;
      });

      console.log("My investment events:", myInvestmentEvents.length);

      // Extract invoice IDs
      const invoiceIds = myInvestmentEvents
        .map((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.invoice_id;
        })
        .filter(Boolean);

      console.log("Invoice IDs:", invoiceIds);

      // Fetch each invoice object
      const invoiceObjects = await Promise.all(
        invoiceIds.map(async (id) => {
          try {
            const obj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showOwner: true,
              },
            });
            return obj;
          } catch (error) {
            console.error(`Error fetching invoice ${id}:`, error);
            return null;
          }
        })
      );

      // Parse invoice data
      const invoices: OnChainInvoice[] = invoiceObjects
        .filter(
          (obj): obj is NonNullable<typeof obj> =>
            obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

          // Helper to extract Option<T> values
          const extractOption = (optionField: any) => {
            if (!optionField || !optionField.vec) return undefined;
            return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
          };

          const investor = extractOption(fields.investor);
          const investorPaid = extractOption(fields.investor_paid);
          const supplierReceived = extractOption(fields.supplier_received);
          const originationFee = extractOption(fields.origination_fee);

          // Parse companies_info
          let companiesInfoStr = "";
          let companiesInfo: any = {};

          if (fields.companies_info) {
            try {
              companiesInfoStr = Buffer.from(fields.companies_info).toString("utf-8");
              companiesInfo = JSON.parse(companiesInfoStr);
            } catch (e) {
              console.warn("Failed to parse companies_info:", e);
            }
          }

          const invoice: OnChainInvoice = {
            id: obj.data!.objectId,
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            issuer: fields.supplier || "",
            buyer: fields.buyer || "",
            amount: fields.amount?.toString() || "0",
            amountInSui: fields.amount ? formatSuiAmount(fields.amount) : 0,
            dueDate: fields.due_date ? parseInt(fields.due_date) * 1000 : Date.now(),
            description: companiesInfo.description || companiesInfoStr,
            createdAt: Date.now(), // TODO: Add created_at field
            status: fields.status !== undefined ? parseInt(fields.status) : 0,
            financedBy: investor,
            investorPaid: investorPaid,
            investorPaidInSui: investorPaid ? formatSuiAmount(investorPaid) : undefined,
            supplierReceived: supplierReceived,
            supplierReceivedInSui: supplierReceived ? formatSuiAmount(supplierReceived) : undefined,
            originationFeeCollected: originationFee,
            originationFeeCollectedInSui: originationFee ? formatSuiAmount(originationFee) : undefined,
            discountRateBps: fields.discount_bps?.toString() || "0",
            escrowBps: fields.escrow_bps !== undefined ? parseInt(fields.escrow_bps) : 0,
            discountBps: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            feeBps: fields.fee_bps !== undefined ? parseInt(fields.fee_bps) : 0,
            companiesInfo: companiesInfoStr,
            supplier: fields.supplier || "",
          };

          return invoice;
        });

      console.log("My investments:", invoices.length);
      console.groupEnd();

      return invoices;
    } catch (error) {
      console.error("Error fetching my investments:", error);
      console.groupEnd();
      return [];
    }
  };

  return useQuery({
    queryKey: ["my-investments", currentAccount?.address, packageId],
    queryFn: fetchMyInvestments,
    enabled: !!currentAccount && !!packageId,
    refetchInterval: 10000,
  });
}

// Hook to fetch invoices where the current user is the buyer (debtor)
// These are invoices the user needs to settle/pay
export function useMyPayableInvoices() {
  const { currentAccount } = useWalletKit();
  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const suiClient = new SuiClient({
    url:
      network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443",
  });

  const fetchMyPayableInvoices = async (): Promise<OnChainInvoice[]> => {
    if (!currentAccount || !packageId) return [];

    console.group("💳 Fetching My Payable Invoices (as Buyer/Debtor)");
    console.log("Buyer Address:", currentAccount.address);
    console.log("Package ID:", packageId);

    try {
      // Since contract doesn't emit events, use localStorage tracking
      // Get all tracked invoice IDs
      let invoiceIds: string[] = [];
      
      try {
        const storedInvoiceIds = localStorage.getItem('invoice_ids')
          ? JSON.parse(localStorage.getItem('invoice_ids') || '[]')
          : [];

        console.log("📦 Stored invoice IDs from localStorage:", storedInvoiceIds);
        invoiceIds = storedInvoiceIds;

        if (invoiceIds.length === 0) {
          console.warn("⚠️ No invoice IDs tracked in localStorage.");
          console.warn("💡 Create an invoice first to see it here.");
          console.groupEnd();
          return [];
        }
      } catch (storageError) {
        console.error("Error reading from localStorage:", storageError);
        console.groupEnd();
        return [];
      }

      console.log("Found invoice IDs:", invoiceIds.length);

      // Fetch each invoice object
      const invoiceObjects = await Promise.all(
        invoiceIds.map(async (id) => {
          try {
            const obj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showOwner: true,
              },
            });
            return obj;
          } catch (error) {
            console.error(`Error fetching invoice ${id}:`, error);
            return null;
          }
        })
      );

      console.log("Successfully fetched objects:", invoiceObjects.filter(o => o !== null).length);

      // Parse invoice data
      const allInvoices = invoiceObjects
        .filter(
          (obj): obj is NonNullable<typeof obj> =>
            obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

          // Helper to extract Option<T> values
          const extractOption = (optionField: any) => {
            if (!optionField || !optionField.vec) return undefined;
            return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
          };

          const investor = extractOption(fields.investor);
          const investorPaid = extractOption(fields.investor_paid);
          const supplierReceived = extractOption(fields.supplier_received);
          const originationFee = extractOption(fields.origination_fee);

          // Parse companies_info
          let companiesInfoStr = "";
          let companiesInfo: any = {};

          if (fields.companies_info) {
            try {
              companiesInfoStr = Buffer.from(fields.companies_info).toString("utf-8");
              companiesInfo = JSON.parse(companiesInfoStr);
            } catch (e) {
              console.warn("Failed to parse companies_info:", e);
            }
          }

          const escrowBpsRaw = fields.escrow_bps;
          const escrowBpsParsed = escrowBpsRaw !== undefined ? parseInt(escrowBpsRaw) : 0;
          
          console.log(`📊 Invoice ${companiesInfo.invoiceNumber || obj.data!.objectId.slice(0, 8)} BPS values:`, {
            escrow_bps_raw: escrowBpsRaw,
            escrow_bps_parsed: escrowBpsParsed,
            discount_bps_raw: fields.discount_bps,
            discount_bps_parsed: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            fee_bps_raw: fields.fee_bps,
          });
          
          const invoice: OnChainInvoice = {
            id: obj.data!.objectId,
            invoiceNumber: companiesInfo.invoiceNumber || "N/A",
            issuer: fields.supplier || "",
            buyer: fields.buyer || "", // buyer is address, not bytes
            supplier: fields.supplier || "",
            amount: fields.amount?.toString() || "0",
            amountInSui: fields.amount ? formatSuiAmount(fields.amount) : 0,
            dueDate: fields.due_date ? parseInt(fields.due_date) * 1000 : Date.now(), // Convert seconds to ms
            description: companiesInfo.description || companiesInfoStr,
            createdAt: Date.now(), // TODO: Add created_at field
            status: fields.status !== undefined ? parseInt(fields.status) : 0,
            financedBy: investor,
            investorPaid: investorPaid,
            investorPaidInSui: investorPaid ? formatSuiAmount(investorPaid) : undefined,
            supplierReceived: supplierReceived,
            supplierReceivedInSui: supplierReceived ? formatSuiAmount(supplierReceived) : undefined,
            originationFeeCollected: originationFee,
            originationFeeCollectedInSui: originationFee ? formatSuiAmount(originationFee) : undefined,
            discountRateBps: fields.discount_bps?.toString() || "0",
            escrowBps: escrowBpsParsed,
            discountBps: fields.discount_bps !== undefined ? parseInt(fields.discount_bps) : 0,
            feeBps: fields.fee_bps !== undefined ? parseInt(fields.fee_bps) : 0,
            companiesInfo: companiesInfoStr,
          };

          return invoice;
        });

      // Filter to only invoices where current user is the buyer
      const invoices = allInvoices.filter(invoice => {
        const isBuyer = invoice.buyer.toLowerCase() === currentAccount.address.toLowerCase();
        if (isBuyer) {
          console.log(`✅ Invoice ${invoice.invoiceNumber} - I am the buyer`);
        }
        return isBuyer;
      });

      console.log("Total fetched invoices:", allInvoices.length);
      console.log("My payable invoices (where I'm buyer):", invoices.length);
      console.log("Status breakdown:", {
        created: invoices.filter(i => i.status === InvoiceStatus.CREATED).length,
        ready: invoices.filter(i => i.status === InvoiceStatus.READY).length,
        financed: invoices.filter(i => i.status === InvoiceStatus.FINANCED).length,
        paid: invoices.filter(i => i.status === InvoiceStatus.PAID).length,
      });
      console.groupEnd();

      return invoices;
    } catch (error) {
      console.error("Error fetching payable invoices:", error);
      console.groupEnd();
      return [];
    }
  };

  return useQuery({
    queryKey: ["my-payable-invoices", currentAccount?.address, packageId],
    queryFn: fetchMyPayableInvoices,
    enabled: !!currentAccount && !!packageId,
    refetchInterval: 10000,
  });
}

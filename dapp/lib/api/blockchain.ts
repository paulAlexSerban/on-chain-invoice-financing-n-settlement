/**
 * Blockchain Query Utilities
 * Helper functions for fetching invoice data from Sui blockchain
 */

import { SuiClient } from '@mysten/sui.js/client';
import type { Invoice, InvoiceStatus } from './types';
import { timestampToISO } from './utils';

/**
 * Get Sui client instance
 */
export function getSuiClient(): SuiClient {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  
  return new SuiClient({
    url: network === 'mainnet'
      ? 'https://fullnode.mainnet.sui.io:443'
      : 'https://fullnode.testnet.sui.io:443',
  });
}

/**
 * Get package ID from environment
 */
export function getPackageId(): string | null {
  return process.env.NEXT_PUBLIC_CONTRACT_ID || null;
}

/**
 * Map blockchain status to API status
 */
export function mapBlockchainStatus(status: number): InvoiceStatus {
  const statusMap: Record<number, InvoiceStatus> = {
    0: 'ISSUED',
    1: 'FINANCED',
    2: 'PAID',
    3: 'DISPUTED',
  };
  return statusMap[status] || 'ISSUED';
}

/**
 * Parse invoice object from blockchain
 */
export function parseInvoiceObject(obj: any): Invoice {
  const content = obj.data?.content as any;
  const fields = content?.fields;

  if (!fields) {
    throw new Error('Invalid invoice object');
  }

  return {
    invoice_id: obj.data.objectId,
    issuer: fields.issuer,
    buyer_hash: Buffer.from(fields.buyer_hash || fields.buyer).toString('hex'),
    face_value: fields.amount || fields.face_value,
    due_date: timestampToISO(parseInt(fields.due_date)),
    status: mapBlockchainStatus(parseInt(fields.status)),
    financier: fields.financed_by || fields.financier,
    discount_bps: parseInt(fields.discount_bps) || 0,
    doc_hash: fields.doc_hash || 'QmUnknown',
    issued_at: timestampToISO(parseInt(fields.created_at || fields.issued_at)),
    financed_at: fields.financed_at ? timestampToISO(parseInt(fields.financed_at)) : undefined,
    paid_at: fields.paid_at ? timestampToISO(parseInt(fields.paid_at)) : undefined,
  };
}

/**
 * Fetch all invoice IDs from events
 */
export async function fetchInvoiceIds(
  suiClient: SuiClient,
  packageId: string,
  limit: number = 100
): Promise<string[]> {
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${packageId}::invoice_financing::InvoiceCreated`,
    },
    limit,
    order: 'descending',
  });

  return events.data
    .map((event) => (event.parsedJson as any)?.invoice_id)
    .filter(Boolean);
}

/**
 * Fetch invoice objects by IDs
 */
export async function fetchInvoiceObjects(
  suiClient: SuiClient,
  invoiceIds: string[]
): Promise<any[]> {
  const results = await Promise.all(
    invoiceIds.map(async (id) => {
      try {
        const obj = await suiClient.getObject({
          id: id,
          options: { showContent: true },
        });
        return obj;
      } catch (error) {
        console.error(`Error fetching invoice ${id}:`, error);
        return null;
      }
    })
  );

  return results.filter((obj): obj is NonNullable<typeof obj> => 
    obj !== null && obj.data?.content !== undefined
  );
}

/**
 * Fetch all invoices from blockchain
 */
export async function fetchAllInvoices(): Promise<Invoice[]> {
  const packageId = getPackageId();
  if (!packageId) {
    throw new Error('Package ID not configured');
  }

  const suiClient = getSuiClient();
  const invoiceIds = await fetchInvoiceIds(suiClient, packageId);
  const invoiceObjects = await fetchInvoiceObjects(suiClient, invoiceIds);

  return invoiceObjects.map(parseInvoiceObject);
}

/**
 * Fetch invoices for a specific user (issuer)
 */
export async function fetchUserInvoices(userAddress: string): Promise<Invoice[]> {
  const allInvoices = await fetchAllInvoices();
  return allInvoices.filter(
    (inv) => inv.issuer.toLowerCase() === userAddress.toLowerCase()
  );
}

/**
 * Fetch invoices financed by a specific address
 */
export async function fetchFinancierInvoices(financierAddress: string): Promise<Invoice[]> {
  const allInvoices = await fetchAllInvoices();
  return allInvoices.filter(
    (inv) => inv.financier?.toLowerCase() === financierAddress.toLowerCase()
  );
}

/**
 * Fetch available invoices (ISSUED status only)
 */
export async function fetchAvailableInvoices(): Promise<Invoice[]> {
  const allInvoices = await fetchAllInvoices();
  return allInvoices.filter((inv) => inv.status === 'ISSUED');
}

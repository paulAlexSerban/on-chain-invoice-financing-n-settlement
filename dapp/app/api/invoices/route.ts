/**
 * Invoice API: List Invoices
 * GET /api/invoices
 * 
 * List invoices with filtering and pagination.
 * Query invoices for marketplace display or user dashboards.
 * Fetches real data from Sui blockchain.
 */

import { NextRequest } from 'next/server';
import { SuiClient } from '@mysten/sui.js/client';
import {
  successResponse,
  errorResponse,
  isValidSuiAddress,
  timestampToISO,
} from '@/lib/api/utils';
import type { InvoiceFilters, InvoiceStatus, InvoiceListResponse, Invoice } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get('status') as InvoiceStatus | null;
    const issuer = searchParams.get('issuer');
    const financier = searchParams.get('financier');
    const minAmount = searchParams.get('min_amount');
    const maxAmount = searchParams.get('max_amount');
    const sort = searchParams.get('sort') as 'due_date' | 'created_at' | 'face_value' | null;
    const order = searchParams.get('order') as 'asc' | 'desc' | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Validation
    const errors: Record<string, string> = {};

    if (issuer && !isValidSuiAddress(issuer)) {
      errors.issuer = 'Invalid Sui address format';
    }

    if (financier && !isValidSuiAddress(financier)) {
      errors.financier = 'Invalid Sui address format';
    }

    if (status && !['ISSUED', 'FINANCED', 'PAID', 'DISPUTED', 'CANCELED'].includes(status)) {
      errors.status = 'Invalid status value';
    }

    if (minAmount && (isNaN(Number(minAmount)) || Number(minAmount) < 0)) {
      errors.min_amount = 'Must be a non-negative number';
    }

    if (maxAmount && (isNaN(Number(maxAmount)) || Number(maxAmount) < 0)) {
      errors.max_amount = 'Must be a non-negative number';
    }

    if (sort && !['due_date', 'created_at', 'face_value'].includes(sort)) {
      errors.sort = 'Invalid sort field';
    }

    if (order && !['asc', 'desc'].includes(order)) {
      errors.order = 'Invalid order value';
    }

    if (limit && (isNaN(Number(limit)) || Number(limit) < 1)) {
      errors.limit = 'Must be a positive number';
    }

    if (offset && (isNaN(Number(offset)) || Number(offset) < 0)) {
      errors.offset = 'Must be a non-negative number';
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, errors);
    }

    // Build filters
    const filters: InvoiceFilters = {
      ...(status && { status }),
      ...(issuer && { issuer }),
      ...(financier && { financier }),
      ...(minAmount && { min_amount: Number(minAmount) }),
      ...(maxAmount && { max_amount: Number(maxAmount) }),
      sort: sort || 'created_at',
      order: order || 'desc',
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    };

    // Fetch invoices from Sui blockchain
    const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
    const network = process.env.NEXT_PUBLIC_NETWORK || 'testnet';

    if (!packageId) {
      return errorResponse(
        'CONFIG_ERROR',
        'Package ID not configured',
        500
      );
    }

    const suiClient = new SuiClient({
      url: network === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443',
    });

    try {
      // Query InvoiceCreated events to get all invoice IDs
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::invoice_financing::InvoiceCreated`,
        },
        limit: 100,
        order: 'descending',
      });

      // Extract invoice IDs from events
      const invoiceIds = events.data
        .map((event) => (event.parsedJson as any)?.invoice_id)
        .filter(Boolean);

      // Fetch each invoice object
      const invoiceObjects = await Promise.all(
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

      // Parse invoice data and apply filters
      let invoices: Invoice[] = invoiceObjects
        .filter((obj): obj is NonNullable<typeof obj> => 
          obj !== null && obj.data?.content !== undefined
        )
        .map((obj) => {
          const content = obj.data!.content as any;
          const fields = content.fields;

          // Map blockchain status to API status
          const statusMap: Record<number, InvoiceStatus> = {
            0: 'ISSUED',
            1: 'FINANCED',
            2: 'PAID',
            3: 'DISPUTED',
          };

          return {
            invoice_id: obj.data!.objectId,
            issuer: fields.issuer,
            buyer_hash: Buffer.from(fields.buyer_hash || fields.buyer).toString('hex'),
            face_value: fields.amount || fields.face_value,
            due_date: timestampToISO(parseInt(fields.due_date)),
            status: statusMap[parseInt(fields.status)] || 'ISSUED',
            financier: fields.financed_by || fields.financier,
            discount_bps: parseInt(fields.discount_bps) || 0,
            doc_hash: fields.doc_hash || 'QmUnknown',
            issued_at: timestampToISO(parseInt(fields.created_at || fields.issued_at)),
            financed_at: fields.financed_at ? timestampToISO(parseInt(fields.financed_at)) : undefined,
            paid_at: fields.paid_at ? timestampToISO(parseInt(fields.paid_at)) : undefined,
          };
        });

      // Apply filters
      if (status) {
        invoices = invoices.filter((inv) => inv.status === status);
      }
      if (issuer) {
        invoices = invoices.filter((inv) => inv.issuer.toLowerCase() === issuer.toLowerCase());
      }
      if (financier) {
        invoices = invoices.filter((inv) => 
          inv.financier?.toLowerCase() === financier.toLowerCase()
        );
      }
      if (minAmount) {
        invoices = invoices.filter((inv) => BigInt(inv.face_value) >= BigInt(minAmount));
      }
      if (maxAmount) {
        invoices = invoices.filter((inv) => BigInt(inv.face_value) <= BigInt(maxAmount));
      }

      // Sort
      invoices.sort((a, b) => {
        let comparison = 0;
        switch (filters.sort) {
          case 'face_value':
            comparison = Number(BigInt(a.face_value) - BigInt(b.face_value));
            break;
          case 'due_date':
            comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'created_at':
          default:
            comparison = new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime();
            break;
        }
        return filters.order === 'asc' ? comparison : -comparison;
      });

      // Paginate
      const total = invoices.length;
      const paginatedInvoices = invoices.slice(
        filters.offset || 0,
        (filters.offset || 0) + (filters.limit || 50)
      );

      const response: InvoiceListResponse = {
        invoices: paginatedInvoices,
        total,
        page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
        limit: filters.limit || 50,
      };

      console.log('✅ Fetched invoices from blockchain:', {
        count: paginatedInvoices.length,
        total,
        filters: JSON.stringify(filters),
      });

      return successResponse(response, 200);
    } catch (blockchainError) {
      console.error('❌ Blockchain fetch error:', blockchainError);
      return errorResponse(
        'BLOCKCHAIN_ERROR',
        'Failed to fetch invoices from blockchain',
        500
      );
    }
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch invoices',
      500
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

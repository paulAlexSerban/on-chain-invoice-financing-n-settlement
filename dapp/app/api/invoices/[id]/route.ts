/**
 * Invoice API: Get Invoice Details
 * GET /api/invoices/[id]
 * 
 * Get specific invoice details with history.
 * Retrieve full invoice information including event history from blockchain.
 */

import { NextRequest } from 'next/server';
import { SuiClient } from '@mysten/sui.js/client';
import {
  successResponse,
  errorResponse,
  timestampToISO,
} from '@/lib/api/utils';
import type { InvoiceWithHistory, InvoiceStatus, InvoiceEvent } from '@/lib/api/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validation
    if (!id || !id.startsWith('0x')) {
      return errorResponse(
        'INVALID_ID',
        'Invoice ID must start with "0x"',
        400
      );
    }

    // Setup blockchain connection
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
      // Fetch invoice object
      const obj = await suiClient.getObject({
        id: id,
        options: { showContent: true },
      });

      if (!obj.data?.content) {
        return errorResponse(
          'NOT_FOUND',
          `Invoice with ID ${id} not found`,
          404
        );
      }

      const content = obj.data.content as any;
      const fields = content.fields;

      // Map blockchain status to API status
      const statusMap: Record<number, InvoiceStatus> = {
        0: 'ISSUED',
        1: 'FINANCED',
        2: 'PAID',
        3: 'DISPUTED',
      };

      const invoice = {
        invoice_id: obj.data.objectId,
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

      // Fetch related events for history
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'invoice_financing',
          },
        },
        limit: 50,
        order: 'ascending',
      });

      // Filter events related to this invoice
      const history: InvoiceEvent[] = events.data
        .filter((event) => {
          const parsed = event.parsedJson as any;
          return parsed?.invoice_id === id;
        })
        .map((event, index) => ({
          id: index + 1,
          event_type: event.type.split('::').pop() || 'Unknown',
          invoice_id: id,
          transaction_digest: event.id.txDigest,
          sender: event.sender || '0x0',
          data: event.parsedJson as Record<string, any>,
          timestamp: timestampToISO(parseInt(event.timestampMs || '0') / 1000),
          block_height: 0, // Not available in current Sui API
        }));

      // Build transitions from history
      const transitions = [];
      let prevStatus: InvoiceStatus | null = null;
      
      for (const event of history) {
        if (event.event_type.includes('Financed')) {
          transitions.push({
            from: 'ISSUED' as InvoiceStatus,
            to: 'FINANCED' as InvoiceStatus,
            timestamp: event.timestamp,
            transaction_digest: event.transaction_digest,
          });
        } else if (event.event_type.includes('Paid') || event.event_type.includes('Settled')) {
          transitions.push({
            from: 'FINANCED' as InvoiceStatus,
            to: 'PAID' as InvoiceStatus,
            timestamp: event.timestamp,
            transaction_digest: event.transaction_digest,
          });
        } else if (event.event_type.includes('Disputed')) {
          transitions.push({
            from: prevStatus || 'ISSUED' as InvoiceStatus,
            to: 'DISPUTED' as InvoiceStatus,
            timestamp: event.timestamp,
            transaction_digest: event.transaction_digest,
          });
        }
      }

      const response: InvoiceWithHistory = {
        ...invoice,
        history,
        transitions,
      };

      console.log('✅ Fetched invoice details from blockchain:', {
        invoice_id: id.substring(0, 10) + '...',
        status: invoice.status,
        history_events: history.length,
        transitions: transitions.length,
      });

      return successResponse(response, 200);
    } catch (blockchainError) {
      console.error('❌ Blockchain fetch error:', blockchainError);
      return errorResponse(
        'BLOCKCHAIN_ERROR',
        'Failed to fetch invoice from blockchain',
        500
      );
    }
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch invoice',
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

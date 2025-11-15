/**
 * Analytics API: Platform Summary
 * GET /api/analytics/summary
 * 
 * Platform-wide analytics and statistics.
 * Display aggregate platform metrics for dashboard from blockchain data.
 */

import { NextRequest } from 'next/server';
import { SuiClient } from '@mysten/sui.js/client';
import {
  successResponse,
  errorResponse,
} from '@/lib/api/utils';
import type { AnalyticsSummary } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all invoice events
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::invoice_financing::InvoiceCreated`,
      },
      limit: 100,
      order: 'descending',
    });

    const invoiceIds = events.data
      .map((event) => (event.parsedJson as any)?.invoice_id)
      .filter(Boolean);

    // Fetch all invoice objects
    const invoiceObjects = await Promise.all(
      invoiceIds.map(async (id) => {
        try {
          const obj = await suiClient.getObject({
            id: id,
            options: { showContent: true },
          });
          return obj;
        } catch (error) {
          return null;
        }
      })
    );

    const invoices = invoiceObjects
      .filter((obj): obj is NonNullable<typeof obj> => 
        obj !== null && obj.data?.content !== undefined
      )
      .map((obj) => {
        const content = obj.data!.content as any;
        const fields = content.fields;
        return {
          status: parseInt(fields.status),
          face_value: BigInt(fields.amount || fields.face_value || '0'),
          issuer: fields.issuer,
          financier: fields.financed_by || fields.financier,
          created_at: parseInt(fields.created_at || fields.issued_at || '0'),
          financed_at: parseInt(fields.financed_at || '0'),
          paid_at: parseInt(fields.paid_at || '0'),
        };
      });

    const totalInvoices = invoices.length;
    const totalFinanced = invoices.filter(inv => inv.status >= 1).length;
    const totalSettled = invoices.filter(inv => inv.status === 2).length;
    
    const totalVolume = invoices.reduce(
      (sum, inv) => sum + inv.face_value,
      BigInt(0)
    );

    // Calculate average time to finance
    const financedInvoices = invoices.filter(inv => inv.financed_at > 0);
    const avgTimeToFinance = financedInvoices.length > 0
      ? Math.floor(
          financedInvoices.reduce(
            (sum, inv) => sum + (inv.financed_at - inv.created_at),
            0
          ) / financedInvoices.length
        )
      : 0;

    // Calculate average time to settlement
    const settledInvoices = invoices.filter(inv => inv.paid_at > 0);
    const avgTimeToSettlement = settledInvoices.length > 0
      ? Math.floor(
          settledInvoices.reduce(
            (sum, inv) => sum + (inv.paid_at - inv.financed_at),
            0
          ) / settledInvoices.length
        )
      : 0;

    const activeSuppliers = new Set(invoices.map(inv => inv.issuer)).size;
    const activeFinanciers = new Set(
      invoices.filter(inv => inv.financier).map(inv => inv.financier)
    ).size;

    const summary: AnalyticsSummary = {
      total_invoices: totalInvoices,
      total_financed: totalFinanced,
      total_settled: totalSettled,
      total_volume: totalVolume.toString(),
      avg_time_to_finance: avgTimeToFinance,
      avg_time_to_settlement: avgTimeToSettlement,
      active_suppliers: activeSuppliers,
      active_financiers: activeFinanciers,
    };

    console.log('✅ Fetched analytics summary from blockchain:', {
      total_invoices: summary.total_invoices,
      total_volume: summary.total_volume,
      active_suppliers: summary.active_suppliers,
    });

    return successResponse(summary, 200);
  } catch (error) {
    console.error('❌ Error fetching analytics summary:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch analytics',
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

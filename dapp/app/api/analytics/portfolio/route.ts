/**
 * Analytics API: Portfolio Metrics
 * GET /api/analytics/portfolio
 * 
 * Portfolio metrics for a specific financier.
 * Display investment performance for financier dashboard from blockchain data.
 */

import { NextRequest } from 'next/server';
import { SuiClient } from '@mysten/sui.js/client';
import {
  successResponse,
  errorResponse,
  isValidSuiAddress,
  calculatePurchasePrice,
} from '@/lib/api/utils';
import type { PortfolioMetrics } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Validation
    if (!address) {
      return errorResponse(
        'MISSING_PARAMETER',
        'Address parameter is required',
        400
      );
    }

    if (!isValidSuiAddress(address)) {
      return errorResponse(
        'INVALID_ADDRESS',
        'Invalid Sui address format (must be 0x + 64 hex characters)',
        400
      );
    }

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

    // Filter invoices financed by this address
    const financierInvoices = invoiceObjects
      .filter((obj): obj is NonNullable<typeof obj> => 
        obj !== null && obj.data?.content !== undefined
      )
      .map((obj) => {
        const content = obj.data!.content as any;
        const fields = content.fields;
        return {
          status: parseInt(fields.status),
          face_value: BigInt(fields.amount || fields.face_value || '0'),
          discount_bps: parseInt(fields.discount_bps || '0'),
          financier: fields.financed_by || fields.financier,
          financed_at: parseInt(fields.financed_at || '0'),
          paid_at: parseInt(fields.paid_at || '0'),
        };
      })
      .filter(inv => 
        inv.financier && inv.financier.toLowerCase() === address.toLowerCase()
      );

    const activeInvestments = financierInvoices.filter(inv => inv.status === 1).length;
    const completedInvestments = financierInvoices.filter(inv => inv.status === 2).length;

    // Calculate total invested (purchase prices)
    const totalInvested = financierInvoices.reduce((sum, inv) => {
      const purchasePrice = calculatePurchasePrice(inv.face_value, inv.discount_bps);
      return sum + purchasePrice;
    }, BigInt(0));

    // Calculate total returns (face values of settled invoices)
    const totalReturns = financierInvoices
      .filter(inv => inv.status === 2)
      .reduce((sum, inv) => sum + inv.face_value, BigInt(0));

    // Calculate average APY
    const completedWithTiming = financierInvoices.filter(
      inv => inv.status === 2 && inv.financed_at > 0 && inv.paid_at > 0
    );

    let averageAPY = 0;
    if (completedWithTiming.length > 0) {
      const apys = completedWithTiming.map(inv => {
        const purchasePrice = calculatePurchasePrice(inv.face_value, inv.discount_bps);
        const profit = Number(inv.face_value - purchasePrice);
        const investment = Number(purchasePrice);
        
        if (investment === 0) return 0;
        
        const daysHeld = (inv.paid_at - inv.financed_at) / (60 * 60 * 24);
        if (daysHeld <= 0) return 0;
        
        const periodReturn = profit / investment;
        const periodsPerYear = 365 / daysHeld;
        return periodReturn * periodsPerYear * 100;
      });

      averageAPY = apys.reduce((a, b) => a + b, 0) / apys.length;
    }

    // Calculate success rate
    const totalInvestments = financierInvoices.length;
    const successRate = totalInvestments > 0
      ? (completedInvestments / totalInvestments) * 100
      : 0;

    const metrics: PortfolioMetrics = {
      total_invested: totalInvested.toString(),
      total_returns: totalReturns.toString(),
      active_investments: activeInvestments,
      completed_investments: completedInvestments,
      average_apy: parseFloat(averageAPY.toFixed(2)),
      success_rate: parseFloat(successRate.toFixed(2)),
    };

    console.log('✅ Fetched portfolio metrics from blockchain:', {
      address: address.substring(0, 10) + '...',
      active_investments: metrics.active_investments,
      average_apy: metrics.average_apy,
    });

    return successResponse(metrics, 200);
  } catch (error) {
    console.error('❌ Error fetching portfolio metrics:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch portfolio metrics',
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

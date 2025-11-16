/**
 * KYC API: Get KYC Status
 * GET /api/kyc/status/[address]
 * 
 * Get KYC status for a user address.
 * Check if user is verified (mocked for MVP).
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  isValidSuiAddress,
} from '@/lib/api/utils';
import { getKYCStatus } from '@/lib/api/mock-data';
import type { KYCStatus } from '@/lib/api/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    // Validation
    if (!address || !isValidSuiAddress(address)) {
      return errorResponse(
        'INVALID_ADDRESS',
        'Invalid Sui address format (must be 0x + 64 hex characters)',
        400
      );
    }

    // Get KYC status from mock data
    const kycStatus: KYCStatus = getKYCStatus(address);

    console.log('✅ Fetched KYC status:', {
      address: address.substring(0, 10) + '...',
      status: kycStatus.status,
    });

    return successResponse(kycStatus, 200);
  } catch (error) {
    console.error('❌ Error fetching KYC status:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch KYC status',
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

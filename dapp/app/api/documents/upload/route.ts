/**
 * Document API: Upload to IPFS
 * POST /api/documents/upload
 * 
 * Uploads invoice document to IPFS (mocked for MVP).
 * Store invoice PDF or supporting documents in decentralized storage.
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validateFile,
  checkRateLimit,
  getClientIP,
} from '@/lib/api/utils';
import type { DocumentUploadResponse } from '@/lib/api/types';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimitKey = `upload:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 1000);

    if (!rateLimit.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
        429
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse(
        'MISSING_FILE',
        'No file provided in request',
        400
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return errorResponse(
        'INVALID_FILE_TYPE',
        validation.error || 'Invalid file',
        400
      );
    }

    // Mock IPFS upload
    // In production, use Pinata SDK or similar:
    // const upload = await pinata.upload.file(file);
    // const ipfsHash = upload.IpfsHash;
    
    // Generate mock IPFS hash (CIDv0 format)
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let mockHash = 'Qm';
    for (let i = 0; i < 44; i++) {
      mockHash += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    const response: DocumentUploadResponse = {
      ipfs_hash: mockHash,
      url: `https://ipfs.io/ipfs/${mockHash}`,
    };

    // Log for debugging
    console.log('✅ Document uploaded:', {
      filename: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
      ipfs_hash: mockHash,
    });

    return successResponse(response, 200);
  } catch (error) {
    console.error('❌ Error uploading document:', error);
    return errorResponse(
      'UPLOAD_FAILED',
      error instanceof Error ? error.message : 'IPFS upload error',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Note: In App Router, body parsing configuration is not needed
// The route handles FormData directly

# API Documentation

## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Last Updated:** November 14, 2025  
**Base URL:** `https://your-domain.com/api` or `http://localhost:3000/api` (development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Oracle Endpoints](#oracle-endpoints)
6. [Document Endpoints](#document-endpoints)
7. [Invoice Endpoints](#invoice-endpoints)
8. [Analytics Endpoints](#analytics-endpoints)
9. [KYC Endpoints](#kyc-endpoints)
10. [Health Check](#health-check)
11. [TypeScript Types](#typescript-types)
12. [Example Usage](#example-usage)

---

## Overview

This API provides backend services for the On-Chain Invoice Financing platform, including:

- **Oracle Services**: Cryptographic attestation signing for invoice issuance and payment confirmation
- **Document Management**: IPFS upload for invoice documents
- **Invoice Queries**: List, filter, and retrieve invoice details
- **Analytics**: Platform statistics and portfolio metrics
- **KYC Management**: Mocked KYC status for MVP
- **Health Monitoring**: System health checks

### Architecture

- **Framework**: Next.js 14 App Router API Routes
- **Runtime**: Node.js 20 LTS
- **Response Format**: JSON
- **CORS**: Enabled for all origins (restrict in production)

---

## Authentication

**MVP**: No authentication required (public endpoints)

**Production**: Implement one of the following:
- JWT tokens for session management
- Wallet signature verification for web3 authentication
- API keys for server-to-server communication

---

## Rate Limiting

Rate limits are enforced per IP address:

| Endpoint Category | Limit             | Window  |
| ----------------- | ----------------- | ------- |
| Oracle Signatures | 10 requests       | 1 min   |
| Document Uploads  | 5 requests        | 1 min   |
| KYC Submissions   | 5 requests        | 1 min   |
| Query Endpoints   | No limit (MVP)    | -       |

**Rate Limit Response:**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "status": 429
}
```

---

## Error Handling

All errors return a standardized JSON structure:

```typescript
{
  "error": string,        // Error code (e.g., "VALIDATION_ERROR")
  "message": string,      // Human-readable error message
  "status": number,       // HTTP status code
  "details"?: object      // Optional additional error details
}
```

### Common HTTP Status Codes

| Code | Meaning                 | When Used                           |
| ---- | ----------------------- | ----------------------------------- |
| 200  | OK                      | Successful request                  |
| 400  | Bad Request             | Invalid parameters or validation    |
| 404  | Not Found               | Resource not found                  |
| 429  | Too Many Requests       | Rate limit exceeded                 |
| 500  | Internal Server Error   | Unexpected server error             |
| 503  | Service Unavailable     | Service degraded or down            |

---

## Oracle Endpoints

### POST `/api/oracle/sign-issuance`

Signs invoice issuance attestation with oracle private key.

**Purpose**: Generate cryptographic proof for invoice creation on-chain.

**Request Body:**

```json
{
  "issuer": "0x...",           // Supplier Sui address (64 hex chars)
  "buyer_hash": "abc123...",   // 64-char hex hash of buyer identifier
  "amount": 10000,             // Face value in smallest unit (integer)
  "due_date": 1735689600,      // Unix timestamp (future date)
  "doc_hash": "QmXxx...",      // IPFS CID or document hash
  "discount_bps": 320          // Discount rate in basis points (3.2%)
}
```

**Response (200 OK):**

```json
{
  "signature": "0x...",        // 128-char hex Ed25519 signature
  "nonce": "abc123...",        // 64-char unique nonce
  "timestamp": 1700000000,     // Signature creation timestamp
  "oracle_pubkey": "0x..."     // Oracle public key for verification
}
```

**Validation Rules:**

- `issuer`: Valid Sui address (0x + 64 hex chars)
- `buyer_hash`: Exactly 64 hex characters
- `amount`: Positive integer
- `due_date`: Future timestamp within 5 years
- `discount_bps`: Integer between 0 and 10000
- `doc_hash`: Valid IPFS CID or hash (min 10 chars)

**Errors:**

- `400 VALIDATION_ERROR`: Invalid parameters
- `429 RATE_LIMIT_EXCEEDED`: Too many requests
- `500 INTERNAL_ERROR`: Signature generation failed

**Example:**

```bash
curl -X POST https://your-domain.com/api/oracle/sign-issuance \
  -H "Content-Type: application/json" \
  -d '{
    "issuer": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "buyer_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "amount": 10000,
    "due_date": 1735689600,
    "doc_hash": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "discount_bps": 320
  }'
```

---

### POST `/api/oracle/sign-payment`

Signs payment confirmation attestation.

**Purpose**: Generate cryptographic proof that invoice payment was observed off-chain.

**Request Body:**

```json
{
  "invoice_id": "0x...",       // Invoice object ID
  "amount": 10000,             // Payment amount (integer)
  "payment_proof": "ref123"    // Optional external payment reference
}
```

**Response (200 OK):**

```json
{
  "signature": "0x...",        // 128-char hex signature
  "timestamp": 1700000000,     // Signature creation timestamp
  "nonce": "abc123..."         // Unique nonce
}
```

**Validation Rules:**

- `invoice_id`: Must start with "0x"
- `amount`: Positive integer
- `payment_proof`: Optional string

**Example:**

```bash
curl -X POST https://your-domain.com/api/oracle/sign-payment \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "0x1111111111111111111111111111111111111111111111111111111111111111",
    "amount": 10000,
    "payment_proof": "bank_ref_12345"
  }'
```

---

## Document Endpoints

### POST `/api/documents/upload`

Uploads invoice document to IPFS.

**Purpose**: Store invoice PDF or supporting documents in decentralized storage.

**Request:**

- **Content-Type**: `multipart/form-data`
- **Field Name**: `file`
- **Allowed Types**: `application/pdf`, `image/jpeg`, `image/png`
- **Max Size**: 10 MB

**Response (200 OK):**

```json
{
  "ipfs_hash": "QmXxx...",     // IPFS Content Identifier (CID)
  "url": "https://ipfs.io/ipfs/QmXxx..."  // Gateway URL
}
```

**Errors:**

- `400 MISSING_FILE`: No file in request
- `400 FILE_TOO_LARGE`: File exceeds 10MB
- `400 INVALID_FILE_TYPE`: Unsupported file type
- `500 UPLOAD_FAILED`: IPFS upload error

**Example:**

```bash
curl -X POST https://your-domain.com/api/documents/upload \
  -F "file=@invoice.pdf"
```

**JavaScript Example:**

```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});

const { ipfs_hash, url } = await response.json();
```

---

## Invoice Endpoints

### GET `/api/invoices`

List invoices with filtering and pagination.

**Purpose**: Query invoices for marketplace display or user dashboards.

**Query Parameters:**

| Parameter    | Type                        | Description                      | Default      |
| ------------ | --------------------------- | -------------------------------- | ------------ |
| `status`     | InvoiceStatus               | Filter by status                 | (all)        |
| `issuer`     | string                      | Filter by supplier address       | -            |
| `financier`  | string                      | Filter by financier address      | -            |
| `min_amount` | number                      | Minimum face value               | -            |
| `max_amount` | number                      | Maximum face value               | -            |
| `sort`       | `due_date\|created_at\|face_value` | Sort field                | `created_at` |
| `order`      | `asc\|desc`                 | Sort order                       | `desc`       |
| `limit`      | number                      | Results per page                 | 50           |
| `offset`     | number                      | Pagination offset                | 0            |

**Invoice Status Values:**

- `ISSUED`: Available for financing
- `FINANCED`: Purchased by financier
- `PAID`: Settled successfully
- `DISPUTED`: Under dispute
- `CANCELED`: Canceled by issuer

**Response (200 OK):**

```json
{
  "invoices": [
    {
      "invoice_id": "0x...",
      "issuer": "0x...",
      "buyer_hash": "abc...",
      "face_value": "10000",
      "due_date": "2025-12-31T00:00:00.000Z",
      "status": "ISSUED",
      "discount_bps": 320,
      "doc_hash": "QmXxx...",
      "issued_at": "2025-11-01T12:00:00.000Z",
      "financed_at": null,
      "paid_at": null
    }
  ],
  "total": 42,               // Total matching invoices
  "page": 1,                 // Current page number
  "limit": 50                // Results per page
}
```

**Examples:**

```bash
# Get all available invoices
curl "https://your-domain.com/api/invoices?status=ISSUED"

# Get invoices for specific supplier
curl "https://your-domain.com/api/invoices?issuer=0xaaaa...&limit=10"

# Get high-value invoices
curl "https://your-domain.com/api/invoices?min_amount=50000&sort=face_value&order=desc"
```

---

### GET `/api/invoices/[id]`

Get specific invoice details with history.

**Purpose**: Retrieve full invoice information including event history.

**Path Parameter:**

- `id`: Invoice object ID (must start with "0x")

**Response (200 OK):**

```json
{
  "invoice_id": "0x...",
  "issuer": "0x...",
  "buyer_hash": "abc...",
  "face_value": "10000",
  "due_date": "2025-12-31T00:00:00.000Z",
  "status": "FINANCED",
  "financier": "0x...",
  "discount_bps": 320,
  "doc_hash": "QmXxx...",
  "issued_at": "2025-11-01T12:00:00.000Z",
  "financed_at": "2025-11-05T14:30:00.000Z",
  "paid_at": null,
  "history": [
    {
      "id": 1,
      "event_type": "InvoiceIssued",
      "invoice_id": "0x...",
      "transaction_digest": "0x...",
      "sender": "0x...",
      "data": { "face_value": "10000", "discount_bps": 320 },
      "timestamp": "2025-11-01T12:00:00.000Z",
      "block_height": 1000
    },
    {
      "id": 2,
      "event_type": "InvoiceFinanced",
      "invoice_id": "0x...",
      "transaction_digest": "0x...",
      "sender": "0x...",
      "data": { "purchase_price": "9680" },
      "timestamp": "2025-11-05T14:30:00.000Z",
      "block_height": 1050
    }
  ],
  "transitions": [
    {
      "from": "ISSUED",
      "to": "FINANCED",
      "timestamp": "2025-11-05T14:30:00.000Z",
      "transaction_digest": "0x..."
    }
  ]
}
```

**Errors:**

- `400 INVALID_ID`: Invoice ID must start with "0x"
- `404 NOT_FOUND`: Invoice not found

**Example:**

```bash
curl "https://your-domain.com/api/invoices/0x1111111111111111111111111111111111111111111111111111111111111111"
```

---

## Analytics Endpoints

### GET `/api/analytics/summary`

Platform-wide analytics and statistics.

**Purpose**: Display aggregate platform metrics for dashboard.

**Response (200 OK):**

```json
{
  "total_invoices": 42,
  "total_financed": 28,
  "total_settled": 15,
  "total_volume": "1250000",        // BigInt as string
  "avg_time_to_finance": 18000,     // Seconds
  "avg_time_to_settlement": 604800, // Seconds
  "active_suppliers": 12,
  "active_financiers": 8
}
```

**Calculated Metrics:**

- `avg_time_to_finance`: Average time from issuance to financing
- `avg_time_to_settlement`: Average time from financing to settlement
- `active_suppliers`: Unique supplier addresses
- `active_financiers`: Unique financier addresses

**Example:**

```bash
curl "https://your-domain.com/api/analytics/summary"
```

---

### GET `/api/analytics/portfolio`

Portfolio metrics for a specific financier.

**Purpose**: Display investment performance for financier dashboard.

**Query Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `address` | string | Yes      | Financier Sui address  |

**Response (200 OK):**

```json
{
  "total_invested": "500000",       // Sum of purchase prices
  "total_returns": "520000",        // Sum of settled face values
  "active_investments": 5,          // Invoices with status=FINANCED
  "completed_investments": 10,      // Invoices with status=PAID
  "average_apy": 12.45,             // Percentage
  "success_rate": 95.23             // Percentage
}
```

**Calculated Metrics:**

- `average_apy`: Annualized yield based on actual holding periods
- `success_rate`: Percentage of investments that settled successfully

**Example:**

```bash
curl "https://your-domain.com/api/analytics/portfolio?address=0xffff..."
```

---

## KYC Endpoints

### GET `/api/kyc/status/[address]`

Get KYC status for a user address.

**Purpose**: Check if user is verified (mocked for MVP).

**Path Parameter:**

- `address`: Sui address (0x + 64 hex chars)

**Response (200 OK):**

```json
{
  "address": "0x...",
  "status": "approved",          // "approved" | "pending" | "rejected"
  "timestamp": 1700000000,
  "verified_at": 1700000000      // Only present if approved
}
```

**Status Values:**

- `approved`: User is verified and can use platform
- `pending`: KYC submitted, awaiting review
- `rejected`: KYC rejected, user cannot proceed

**Example:**

```bash
curl "https://your-domain.com/api/kyc/status/0xaaaa..."
```

---

### POST `/api/kyc/submit`

Submit KYC information.

**Purpose**: Upload KYC data for verification (mocked for MVP).

**Request Body:**

```json
{
  "address": "0x...",            // Sui address
  "full_name": "John Doe",       // Optional
  "email": "john@example.com",   // Optional
  "documents": ["QmXxx..."]      // Optional IPFS hashes
}
```

**Response (200 OK):**

```json
{
  "address": "0x...",
  "status": "approved",          // Auto-approved for MVP
  "timestamp": 1700000000,
  "verified_at": 1700000000
}
```

**Note**: In production, this should return `status: "pending"` and verify asynchronously.

**Example:**

```bash
curl -X POST https://your-domain.com/api/kyc/submit \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xaaaa...",
    "full_name": "John Doe",
    "email": "john@example.com"
  }'
```

---

## Health Check

### GET `/api/health`

System health status.

**Purpose**: Monitor service availability.

**Response (200 OK):**

```json
{
  "status": "healthy",           // "healthy" | "degraded" | "unhealthy"
  "timestamp": 1700000000,
  "services": {
    "database": "up",            // "up" | "down"
    "blockchain": "up",
    "ipfs": "up"
  }
}
```

**Status Codes:**

- `200 OK`: All services healthy
- `503 Service Unavailable`: One or more services down

**Example:**

```bash
curl "https://your-domain.com/api/health"
```

---

## TypeScript Types

All TypeScript types are available in `/lib/api/types.ts`:

```typescript
// Import types in your code
import {
  Invoice,
  InvoiceStatus,
  SignIssuanceRequest,
  SignIssuanceResponse,
  AnalyticsSummary,
  // ... etc
} from '@/lib/api/types';
```

**Key Types:**

- `Invoice`: Invoice object structure
- `InvoiceStatus`: Status enum
- `InvoiceFilters`: Query filter options
- `SignIssuanceRequest/Response`: Oracle attestation types
- `AnalyticsSummary`: Platform metrics
- `PortfolioMetrics`: Financier portfolio data
- `KYCStatus`: KYC verification status

---

## Example Usage

### Complete Invoice Issuance Flow

```typescript
// 1. Upload document
const formData = new FormData();
formData.append('file', invoicePDF);

const docResponse = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});
const { ipfs_hash } = await docResponse.json();

// 2. Get oracle signature
const signResponse = await fetch('/api/oracle/sign-issuance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    issuer: walletAddress,
    buyer_hash: hashBuyerIdentifier(buyerInfo),
    amount: 10000,
    due_date: Math.floor(dueDate.getTime() / 1000),
    doc_hash: ipfs_hash,
    discount_bps: 320,
  }),
});
const { signature, nonce, timestamp } = await signResponse.json();

// 3. Submit blockchain transaction (using Sui SDK)
const tx = new TransactionBlock();
tx.moveCall({
  target: `${PACKAGE_ID}::invoice_finance::issue_invoice`,
  arguments: [
    tx.object(ORACLE_REGISTRY_ID),
    tx.pure(buyerHash),
    tx.pure(10000),
    tx.pure(dueDateTimestamp),
    tx.pure(320),
    tx.pure(ipfs_hash),
    tx.pure(nonce),
    tx.pure(signature),
  ],
});

const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
```

### Query Marketplace Invoices

```typescript
// Fetch available invoices
const response = await fetch('/api/invoices?status=ISSUED&limit=20&sort=due_date&order=asc');
const { invoices, total } = await response.json();

// Display in UI
invoices.forEach((invoice) => {
  const purchasePrice = calculatePurchasePrice(
    BigInt(invoice.face_value),
    invoice.discount_bps
  );
  const apy = calculateAPY(invoice);
  
  console.log(`Invoice ${invoice.invoice_id}`);
  console.log(`Face Value: ${invoice.face_value}`);
  console.log(`Purchase Price: ${purchasePrice}`);
  console.log(`APY: ${apy}%`);
});
```

### Check Portfolio Metrics

```typescript
const response = await fetch(`/api/analytics/portfolio?address=${walletAddress}`);
const metrics = await response.json();

console.log(`Total Invested: $${metrics.total_invested}`);
console.log(`Average APY: ${metrics.average_apy}%`);
console.log(`Success Rate: ${metrics.success_rate}%`);
```

---

## Production Considerations

### Security Enhancements

1. **Authentication**: Implement JWT or wallet signature verification
2. **Rate Limiting**: Use Redis for distributed rate limiting
3. **CORS**: Restrict to specific domains
4. **Input Sanitization**: Add comprehensive validation library (Zod, Joi)
5. **Oracle Key Security**: Store private key in AWS KMS or HashiCorp Vault

### Database Integration

Replace mock data with PostgreSQL:

```typescript
// lib/api/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getInvoices(filters: InvoiceFilters) {
  return prisma.invoice.findMany({
    where: {
      status: filters.status,
      issuer: filters.issuer,
      // ... additional filters
    },
    orderBy: { [filters.sort]: filters.order },
    take: filters.limit,
    skip: filters.offset,
  });
}
```

### Real IPFS Integration

```typescript
// lib/api/ipfs.ts
import { PinataSDK } from 'pinata-web3';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

export async function uploadToIPFS(file: File): Promise<string> {
  const upload = await pinata.upload.file(file);
  return upload.IpfsHash;
}
```

### Real Oracle Signing

```typescript
// lib/api/oracle.ts
import * as ed25519 from '@noble/ed25519';

const oraclePrivateKey = Buffer.from(process.env.ORACLE_PRIVATE_KEY!, 'hex');

export async function signMessage(message: string): Promise<string> {
  const messageHash = await ed25519.utils.sha256(Buffer.from(message));
  const signature = await ed25519.sign(messageHash, oraclePrivateKey);
  return Buffer.from(signature).toString('hex');
}
```

---

## Support

**Issues**: Create issue on GitHub repository  
**Contact**: team@invoice-finance.sui  
**Documentation**: https://docs.invoice-finance.sui

---

**Last Updated**: November 14, 2025  
**API Version**: 1.0  
**License**: MIT

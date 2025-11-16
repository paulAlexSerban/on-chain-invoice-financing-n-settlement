# API Quick Reference

Quick copy-paste reference for all available endpoints.

---

## 🔗 Base URL

```
http://localhost:3000/api  (development)
https://your-domain.com/api  (production)
```

---

## 📋 Endpoints at a Glance

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/health` | Health check | No |
| POST | `/oracle/sign-issuance` | Sign invoice issuance | No |
| POST | `/oracle/sign-payment` | Sign payment confirmation | No |
| POST | `/documents/upload` | Upload document to IPFS | No |
| GET | `/invoices` | List invoices | No |
| GET | `/invoices/:id` | Get invoice details | No |
| GET | `/analytics/summary` | Platform statistics | No |
| GET | `/analytics/portfolio` | Portfolio metrics | No |
| GET | `/kyc/status/:address` | Get KYC status | No |
| POST | `/kyc/submit` | Submit KYC info | No |

---

## 🚀 Quick Test Commands

### Health Check
```bash
curl http://localhost:3000/api/health
```

### List All Invoices
```bash
curl "http://localhost:3000/api/invoices"
```

### Get Available Invoices
```bash
curl "http://localhost:3000/api/invoices?status=ISSUED&limit=10"
```

### Get Invoice Details
```bash
curl "http://localhost:3000/api/invoices/0x1111111111111111111111111111111111111111111111111111111111111111"
```

### Platform Analytics
```bash
curl "http://localhost:3000/api/analytics/summary"
```

### Portfolio Metrics
```bash
curl "http://localhost:3000/api/analytics/portfolio?address=0xffff..."
```

### Sign Issuance
```bash
curl -X POST http://localhost:3000/api/oracle/sign-issuance \
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

### Sign Payment
```bash
curl -X POST http://localhost:3000/api/oracle/sign-payment \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "0x1111111111111111111111111111111111111111111111111111111111111111",
    "amount": 10000
  }'
```

### Upload Document
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@invoice.pdf"
```

### Check KYC Status
```bash
curl "http://localhost:3000/api/kyc/status/0xaaaa..."
```

### Submit KYC
```bash
curl -X POST http://localhost:3000/api/kyc/submit \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xaaaa...",
    "full_name": "John Doe",
    "email": "john@example.com"
  }'
```

---

## 📦 Import Patterns

### Import Types
```typescript
import { Invoice, InvoiceStatus, AnalyticsSummary } from '@/lib/api';
```

### Import Utilities
```typescript
import { 
  successResponse, 
  errorResponse, 
  isValidSuiAddress 
} from '@/lib/api';
```

### Import Mock Data
```typescript
import { getInvoices, mockInvoices } from '@/lib/api';
```

### Import Everything
```typescript
import * as API from '@/lib/api';
```

---

## 🎯 Common Use Cases

### Fetch and Display Invoices
```typescript
const response = await fetch('/api/invoices?status=ISSUED');
const { invoices } = await response.json();
```

### Get Oracle Signature
```typescript
const response = await fetch('/api/oracle/sign-issuance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoiceData),
});
const { signature, nonce } = await response.json();
```

### Upload Document
```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData,
});
const { ipfs_hash } = await response.json();
```

### Check Portfolio
```typescript
const response = await fetch(`/api/analytics/portfolio?address=${address}`);
const metrics = await response.json();
```

---

## ⚡ Response Formats

### Success Response
```json
{
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "status": 400,
  "details": { ... }
}
```

---

## 🔧 Environment Variables (Production)

```env
# Oracle
ORACLE_PRIVATE_KEY=your_private_key_here
ORACLE_PUBLIC_KEY=0x...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# IPFS
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=your_key
IPFS_API_SECRET=your_secret

# Network
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ID=0x...
NEXT_PUBLIC_ORACLE_REGISTRY_ID=0x...
```

---

## 📚 Documentation Files

- **Full API Docs**: `/dapp/API_DOCUMENTATION.md`
- **Implementation Summary**: `/dapp/BACKEND_IMPLEMENTATION_SUMMARY.md`
- **Types Reference**: `/dapp/lib/api/types.ts`
- **This File**: `/dapp/API_QUICK_REFERENCE.md`

---

## 🎨 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request / Validation Error |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 🧪 Testing with JavaScript

```javascript
// Test all endpoints
async function testAPI() {
  // Health
  const health = await fetch('/api/health').then(r => r.json());
  console.log('Health:', health);
  
  // Invoices
  const invoices = await fetch('/api/invoices').then(r => r.json());
  console.log('Invoices:', invoices.invoices.length);
  
  // Analytics
  const summary = await fetch('/api/analytics/summary').then(r => r.json());
  console.log('Total Volume:', summary.total_volume);
  
  // Oracle signature
  const signature = await fetch('/api/oracle/sign-issuance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      issuer: "0x" + "a".repeat(64),
      buyer_hash: "b".repeat(64),
      amount: 10000,
      due_date: Math.floor(Date.now() / 1000) + 86400 * 30,
      doc_hash: "Qm" + "x".repeat(44),
      discount_bps: 320,
    }),
  }).then(r => r.json());
  console.log('Signature:', signature.signature.substring(0, 20) + '...');
}

testAPI();
```

---

## 📊 Sample Response Data

### Invoice Object
```json
{
  "invoice_id": "0x1111...",
  "issuer": "0xaaaa...",
  "buyer_hash": "bbbb...",
  "face_value": "10000",
  "due_date": "2025-12-31T00:00:00.000Z",
  "status": "ISSUED",
  "discount_bps": 320,
  "doc_hash": "QmXxx...",
  "issued_at": "2025-11-01T12:00:00.000Z"
}
```

### Analytics Summary
```json
{
  "total_invoices": 42,
  "total_financed": 28,
  "total_settled": 15,
  "total_volume": "1250000",
  "avg_time_to_finance": 18000,
  "avg_time_to_settlement": 604800,
  "active_suppliers": 12,
  "active_financiers": 8
}
```

---

**Last Updated**: November 14, 2025  
**Version**: 1.0 MVP

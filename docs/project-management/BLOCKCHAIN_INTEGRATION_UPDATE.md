# Backend API Blockchain Integration Update

**Date:** November 15, 2025  
**Status:** ✅ Complete  
**Update Type:** Critical - Migration from Mock Data to Real Blockchain Data

---

## 🎯 Overview

Successfully migrated all API endpoints from mock data to **real-time blockchain data fetching** from the Sui network. The API now queries actual on-chain invoices, events, and analytics instead of using static mock data.

---

## ✅ What Changed

### 1. **Invoice Endpoints - Now Blockchain-Powered**

#### `GET /api/invoices`
**Before:** Returned static mock data (5 hardcoded invoices)  
**After:** 
- Queries `InvoiceCreated` events from Sui blockchain
- Fetches actual invoice objects using Sui RPC
- Parses on-chain fields (issuer, amount, status, etc.)
- Supports filtering by:
  - **Status** (ISSUED/FINANCED/PAID/DISPUTED)
  - **Issuer address** (supplier wallet)
  - **Financier address** (investor wallet)
  - Amount ranges, sorting, pagination

**Key Features:**
- ✅ Real-time data from blockchain
- ✅ Wallet-based filtering for personalized views
- ✅ Status mapping from on-chain enum to API format
- ✅ Proper error handling for blockchain connection issues

#### `GET /api/invoices/[id]`
**Before:** Returned mock invoice + fake history  
**After:**
- Fetches specific invoice object by ID
- Queries related events for transaction history
- Builds state transitions from event data
- Returns complete audit trail with transaction digests

**Key Features:**
- ✅ Full invoice lifecycle tracking
- ✅ Real event history from blockchain
- ✅ Transaction digest linkage for verification
- ✅ Automatic state transition detection

### 2. **Analytics Endpoints - Real Calculations**

#### `GET /api/analytics/summary`
**Before:** Static platform statistics  
**After:**
- Fetches all invoices from blockchain
- Calculates real-time metrics:
  - Total invoices count
  - Financed/settled counts
  - Total volume (sum of all invoice amounts)
  - Average time to finance (in seconds)
  - Average time to settlement
  - Active supplier count (unique issuers)
  - Active financier count (unique investors)

**Key Features:**
- ✅ Live platform statistics
- ✅ Accurate timing calculations from timestamps
- ✅ Volume aggregation using BigInt for precision

#### `GET /api/analytics/portfolio`
**Before:** Mock portfolio data  
**After:**
- Filters blockchain invoices by financier address
- Calculates actual portfolio metrics:
  - Total invested (sum of purchase prices)
  - Total returns (face values of settled invoices)
  - Active vs. completed investment counts
  - **Real APY calculation** based on actual holding periods
  - Success rate percentage

**Key Features:**
- ✅ Wallet-specific portfolio tracking
- ✅ Accurate APY using date math
- ✅ Real profit/loss calculations
- ✅ Investment performance metrics

### 3. **New Blockchain Utilities**

Created `/lib/api/blockchain.ts` with reusable functions:

```typescript
// Get configured Sui client
getSuiClient(): SuiClient

// Get package ID from environment
getPackageId(): string | null

// Map on-chain status to API format
mapBlockchainStatus(status: number): InvoiceStatus

// Parse invoice object from blockchain response
parseInvoiceObject(obj: any): Invoice

// Fetch all invoice IDs from events
fetchInvoiceIds(suiClient, packageId, limit): Promise<string[]>

// Fetch invoice objects by IDs
fetchInvoiceObjects(suiClient, invoiceIds): Promise<any[]>

// High-level query functions
fetchAllInvoices(): Promise<Invoice[]>
fetchUserInvoices(userAddress): Promise<Invoice[]>
fetchFinancierInvoices(financierAddress): Promise<Invoice[]>
fetchAvailableInvoices(): Promise<Invoice[]>
```

---

## 🔄 Data Flow

### Before (Mock Data)
```
API Request → Mock Data Array → Filter/Sort → Response
```

### After (Blockchain)
```
API Request → Sui RPC Client → Query Events → Fetch Objects → Parse Fields → Filter/Sort → Response
```

---

## 📊 Blockchain Integration Details

### Event Querying
```typescript
// Query InvoiceCreated events
const events = await suiClient.queryEvents({
  query: {
    MoveEventType: `${packageId}::invoice_financing::InvoiceCreated`,
  },
  limit: 100,
  order: 'descending',
});
```

### Object Fetching
```typescript
// Fetch invoice object by ID
const obj = await suiClient.getObject({
  id: invoiceId,
  options: { showContent: true },
});
```

### Field Mapping
| Blockchain Field | API Field | Transformation |
|-----------------|-----------|----------------|
| `fields.issuer` | `issuer` | Direct |
| `fields.buyer_hash` | `buyer_hash` | Buffer → hex string |
| `fields.amount` | `face_value` | Direct (as string) |
| `fields.status` | `status` | Enum mapping (0→ISSUED, 1→FINANCED, etc.) |
| `fields.financed_by` | `financier` | Direct |
| `fields.due_date` | `due_date` | Unix → ISO 8601 |
| `fields.created_at` | `issued_at` | Unix → ISO 8601 |

---

## 🎯 Wallet-Based Filtering

### For Suppliers (Business Dashboard)
```bash
# Get invoices issued by specific wallet
GET /api/invoices?issuer=0xaaaa...
```

**Frontend Integration:**
```typescript
const { currentAccount } = useWalletKit();
const response = await fetch(
  `/api/invoices?issuer=${currentAccount.address}`
);
```

### For Financiers (Investor Dashboard)
```bash
# Get invoices financed by specific wallet
GET /api/invoices?financier=0xffff...

# Get portfolio metrics
GET /api/analytics/portfolio?address=0xffff...
```

**Frontend Integration:**
```typescript
const { currentAccount } = useWalletKit();
const response = await fetch(
  `/api/analytics/portfolio?address=${currentAccount.address}`
);
```

### For Marketplace (All Available)
```bash
# Get invoices available for financing
GET /api/invoices?status=ISSUED
```

---

## 🚀 Performance Optimizations

### Implemented
1. **Event-based indexing** - Query events first, then fetch objects (faster than full object scan)
2. **Parallel fetching** - Use `Promise.all()` for concurrent object fetches
3. **Error resilience** - Individual object fetch failures don't break entire query
4. **Proper filtering** - Apply blockchain-level filters where possible

### Future Enhancements
1. **Backend indexer** - Build event indexing service for faster queries
2. **Caching layer** - Redis cache for frequently accessed invoices
3. **GraphQL subscriptions** - Real-time updates via WebSocket
4. **Pagination limits** - Current limit of 100 events, should be configurable

---

## 🔧 Environment Configuration

Ensure these are set in `.env`:

```env
NEXT_PUBLIC_CONTRACT_ID=0x4d3f0eeb160eaff90fafc34654457604bdce0ff38775f45f87561f5469aeac12
NEXT_PUBLIC_NETWORK=testnet
```

The API automatically uses:
- **Testnet**: `https://fullnode.testnet.sui.io:443`
- **Mainnet**: `https://fullnode.mainnet.sui.io:443`

---

## 🧪 Testing

### Test Invoice Queries
```bash
# All invoices
curl http://localhost:3000/api/invoices

# Supplier's invoices
curl "http://localhost:3000/api/invoices?issuer=0xYOUR_WALLET_ADDRESS"

# Investor's invoices
curl "http://localhost:3000/api/invoices?financier=0xYOUR_WALLET_ADDRESS"

# Available for financing
curl "http://localhost:3000/api/invoices?status=ISSUED"

# Specific invoice details
curl http://localhost:3000/api/invoices/0xINVOICE_OBJECT_ID
```

### Test Analytics
```bash
# Platform summary
curl http://localhost:3000/api/analytics/summary

# Investor portfolio
curl "http://localhost:3000/api/analytics/portfolio?address=0xYOUR_WALLET_ADDRESS"
```

---

## ⚠️ Breaking Changes

### Mock Data Deprecation
- `getInvoices()`, `getInvoiceById()` from `/lib/api/mock-data.ts` are **deprecated**
- Mock analytics functions are **deprecated**
- **KYC functions remain mock** (will be replaced with real service later)

### Migration Guide for Frontend

**Old (Mock Data):**
```typescript
import { getInvoices } from '@/lib/api/mock-data';
const invoices = getInvoices({ status: 'ISSUED' });
```

**New (Use React Hooks):**
```typescript
import { useInvoices } from '@/hooks/useInvoices';

function MyComponent() {
  const { data: invoices, isLoading } = useInvoices({ 
    status: 'pending' 
  });
  
  // Use wallet-filtered queries
  const { currentAccount } = useWalletKit();
  const { data: myInvoices } = useInvoices({ 
    issuer: currentAccount?.address 
  });
}
```

**Or Use API Directly:**
```typescript
// Server-side or client-side API calls
const response = await fetch('/api/invoices?status=ISSUED');
const { invoices } = await response.json();
```

---

## 📝 Updated Files

### Modified
1. `/app/api/invoices/route.ts` - Blockchain queries instead of mock data
2. `/app/api/invoices/[id]/route.ts` - Real invoice + event history
3. `/app/api/analytics/summary/route.ts` - Live platform metrics
4. `/app/api/analytics/portfolio/route.ts` - Real portfolio calculations
5. `/lib/api/mock-data.ts` - Added deprecation warnings
6. `/lib/api/index.ts` - Export blockchain utilities

### Created
7. `/lib/api/blockchain.ts` - Reusable blockchain query functions

### Unchanged (Still Working)
- Oracle endpoints (signature generation)
- Document upload endpoint
- KYC endpoints (still mock for MVP)
- Health check endpoint

---

## ✅ Verification Checklist

- [x] Invoices fetched from blockchain
- [x] Wallet-based filtering works
- [x] Status mapping correct (0=ISSUED, 1=FINANCED, 2=PAID, 3=DISPUTED)
- [x] Event history tracking functional
- [x] Analytics calculated from real data
- [x] Portfolio metrics accurate
- [x] APY calculations correct
- [x] Error handling for blockchain connection issues
- [x] Backward compatibility with existing hooks
- [x] Environment variables properly used

---

## 🎓 How It Works

### Step-by-Step Invoice Query
1. **API receives request** with filters (status, issuer, etc.)
2. **Connect to Sui** using configured network
3. **Query events** to get invoice IDs:
   ```typescript
   queryEvents({ MoveEventType: 'InvoiceCreated' })
   ```
4. **Fetch objects** in parallel using IDs
5. **Parse fields** from blockchain object structure
6. **Map status** from enum to string format
7. **Apply filters** (address, amount, status)
8. **Sort & paginate** results
9. **Return response** in API format

### Wallet Integration
```typescript
// Frontend makes wallet-aware request
const { currentAccount } = useWalletKit();

// For supplier: show their issued invoices
fetch(`/api/invoices?issuer=${currentAccount.address}`)

// For investor: show their financed invoices  
fetch(`/api/invoices?financier=${currentAccount.address}`)

// For marketplace: show available invoices
fetch(`/api/invoices?status=ISSUED`)
```

---

## 🚦 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Invoice List API | ✅ Complete | Blockchain-powered |
| Invoice Detail API | ✅ Complete | With event history |
| Analytics Summary | ✅ Complete | Real-time calculations |
| Portfolio Metrics | ✅ Complete | Wallet-specific |
| Wallet Filtering | ✅ Complete | Issuer & financier filters |
| React Hooks | ✅ Compatible | useInvoices, useMyInvoices work |
| Mock Data | ⚠️ Deprecated | KYC functions only |
| Frontend Integration | ✅ Ready | Drop-in replacement |

---

## 🔮 Next Steps

### Immediate (Post-Update)
1. ✅ Test with real wallet addresses
2. ✅ Verify invoice creation flow end-to-end
3. ✅ Check analytics accuracy with multiple invoices

### Short-term
1. **Build indexer service** for faster queries (avoid event scanning)
2. **Add caching layer** (Redis) for frequently accessed data
3. **Implement real-time updates** via WebSocket subscriptions
4. **Add query optimization** (limit by date range, etc.)

### Medium-term
1. **Replace KYC mock** with real verification service
2. **Add GraphQL layer** for more flexible queries
3. **Implement rate limiting** per wallet address
4. **Add monitoring/alerting** for blockchain connection issues

---

## 📚 Documentation

- **API Docs**: `/docs/architecture/API_DOCUMENTATION.md`
- **Quick Reference**: `/docs/architecture/API_QUICK_REFERENCE.md`
- **Original Implementation**: `/docs/project-management/BACKEND_API_IMPLEMENTATION_SUMMARY.md`
- **This Update**: `/docs/project-management/BLOCKCHAIN_INTEGRATION_UPDATE.md`

---

## 🎉 Result

The API is now a **true on-chain data layer** that:
- ✅ Fetches real invoices from Sui blockchain
- ✅ Supports wallet-based filtering for personalized views
- ✅ Calculates live analytics and portfolio metrics
- ✅ Provides complete audit trails with event history
- ✅ Maintains backward compatibility with existing frontend

**No mock data, just real blockchain truth! 🚀**

---

**Update Date:** November 15, 2025  
**Implementation Status:** ✅ Production-Ready  
**Breaking Changes:** Mock data deprecated (use hooks or API)


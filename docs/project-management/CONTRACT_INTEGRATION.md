# 🔗 Smart Contract Integration Guide

## Overview

The frontend has been updated to work with your existing smart contract modules:

## Contract Modules

### 1. **invoice_factory** (Main Entry Point)
- **Function**: `issue_invoice`
- **Location**: `contract/invoice_financing/sources/invoice_factory.move`
- **Purpose**: Creates invoices using factory pattern

### 2. **invoice** (Invoice Struct)
- **Struct**: `Invoice`
- **Location**: `contract/invoice_financing/sources/invoice.move`
- **Fields**: buyer (address), supplier (address), amount, due_date, companies_info, status, escrow_bps, discount_bps, fee_bps

### 3. **registry** (Supplier Registration)
- **Function**: `register_supplier`
- **Location**: `contract/invoice_financing/sources/registry.move`
- **Purpose**: Creates SupplierCap required to issue invoices

### 4. **financing** (Invoice Financing)
- **Function**: `finance_invoice`
- **Location**: `contract/invoice_financing/sources/financing.move`
- **Purpose**: Allows investors to finance invoices

### 5. **repayment** (Invoice Repayment)
- **Function**: `repay_invoice`
- **Location**: `contract/invoice_financing/sources/repayment.move`
- **Purpose**: Allows buyers to repay financed invoices

## Frontend Integration

### Invoice Creation

**Hook**: `useInvoiceContract`
**Function**: `createInvoice`

```typescript
const { createInvoice } = useInvoiceContract();

await createInvoice({
  invoiceNumber: "INV-001",
  buyer: "0x...", // Buyer address (not name!)
  amount: 100, // SUI
  dueDate: new Date("2024-12-31"),
  description: "Services rendered",
  discountBps: 500, // 5% default
  feeBps: 100, // 1% default
  escrowBps: 1000, // 10% default
});
```

**Transaction Flow**:
1. Register supplier (creates SupplierCap)
2. Use SupplierCap to call `issue_invoice`
3. Factory creates Invoice and Escrow as shared objects
4. Invoice ID is tracked in localStorage

### Invoice Querying

**Hook**: `useSharedInvoices`
**Function**: Fetches invoices from blockchain

```typescript
const { data: invoices } = useSharedInvoices({
  status: 'ready', // created, ready, funded, paid
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

**Important**: Since invoices are **shared objects**, they can't be queried directly like owned objects. The hook:
1. Uses invoice IDs stored in localStorage (from creation)
2. Fetches each invoice object by ID
3. Parses the Invoice struct correctly

**For Production**: Implement an indexer or backend to track all invoice IDs.

## Configuration

### Required Environment Variables

**`dapp/.env`**:
```env
NEXT_PUBLIC_CONTRACT_ID=0x8178a3ff4cdc74fbc18c435181ec0c58dde5b817237fd413b297838f295d6588
NEXT_PUBLIC_FACTORY_OBJECT_ID=0x...  # ⚠️ NEEDED!
NEXT_PUBLIC_NETWORK=testnet
```

### Finding Factory Object ID

After publishing the contract, the factory is created as a **shared object**:

1. **Check Published Package**:
   ```bash
   # After publishing, check output for "Published Objects"
   make publish_contract
   ```

2. **Query Package**:
   ```bash
   sui client object --id <package_id> --json | jq
   ```

3. **Check Explorer**:
   ```
   https://testnet.suivision.xyz/package/YOUR_PACKAGE_ID
   ```
   Look for "Published Objects" → Find `InvoiceFactory` type

4. **Or Query Programmatically**:
   The factory is created during package `init()`, so it should be in the published objects.

## Invoice Structure

### On-Chain (Invoice Struct)

```move
public struct Invoice has key, store {
    id: UID,
    buyer: address,               // Who must repay
    supplier: address,            // Who issued the invoice
    amount: u64,                  // In MIST
    due_date: u64,                // UNIX timestamp (seconds)
    companies_info: vector<u8>,   // JSON metadata
    status: u8,                   // 0=Created, 1=Ready, 2=Financed, 3=Paid
    escrow_bps: u64,              // Escrow in basis points
    discount_bps: u64,            // Discount in basis points (e.g., 500 = 5%)
    fee_bps: u64,                 // Fee in basis points
}
```

### Frontend (OnChainInvoice Type)

```typescript
interface OnChainInvoice {
  id: string;
  buyer: string; // address
  supplier: string; // address (issuer)
  amount: string; // in MIST
  amountInSui: number; // converted
  dueDate: number; // timestamp in ms
  companiesInfo: string; // JSON string
  status: number; // 0-3
  escrowBps: number;
  discountBps: number;
  feeBps: number;
  // Parsed:
  invoiceNumber?: string;
  description?: string;
  issuer?: string; // same as supplier
}
```

## Status Values

- **0 = Created** - Invoice created, not ready yet
- **1 = Ready** - Available for financing (shown in marketplace)
- **2 = Financed** - Investor has provided liquidity
- **3 = Paid** - Buyer has repaid

## Transaction Flow

### Creating Invoice

```
1. User fills form
   ↓
2. Frontend converts data:
   - Amount: SUI → MIST
   - Date: Date → timestamp (seconds)
   - Buyer: string → address
   - Metadata: JSON → bytes
   ↓
3. Transaction Block:
   - register_supplier() → creates SupplierCap
   - issue_invoice(
       factory,
       buyer_address,
       amount_mist,
       due_date_seconds,
       companies_info_bytes,
       escrow_bps,
       discount_bps,
       fee_bps,
       supplier_cap
     )
   ↓
4. Factory creates:
   - Invoice (shared object)
   - Escrow (shared object)
   ↓
5. Invoice ID tracked in localStorage
```

## Buyer Address Format

**Important**: The buyer must be a **Sui address**, not a name!

**Form Field**: Currently says "Client Name" but needs to accept:
- ✅ `0x3e5e7fbba513bfe17858488bcdb8e80b729f291dbf79be1ef3b71b96111d6ee1`
- ❌ `"TechCorp Inc"` (will fail - needs conversion)

**Solution Options**:
1. Update form to accept addresses
2. Add address lookup/validation
3. Use address book for common buyers

## Basis Points (BPS)

**10000 BPS = 100%**

Examples:
- **500 BPS = 5%** discount
- **100 BPS = 1%** fee
- **1000 BPS = 10%** escrow

**Defaults**:
- Discount: 500 BPS (5%)
- Fee: 100 BPS (1%)
- Escrow: 1000 BPS (10%)

## Next Steps

1. **✅ Get Factory Object ID**
   - Query published package
   - Add to `.env`
   - Frontend will work!

2. **🔄 Update Form**
   - Change "Client Name" to "Buyer Address"
   - Add address validation
   - Add address book feature

3. **📊 Improve Querying**
   - Implement indexer for shared objects
   - Or track invoice IDs in backend
   - Current: localStorage (temporary)

4. **🧪 Test**
   - Create invoice
   - Check it appears in marketplace
   - Test financing flow
   - Test repayment

## Troubleshooting

### "Factory Object ID not configured"
**Solution**: Get factory object ID from published package and add to `.env`

### "Buyer address invalid"
**Solution**: Buyer must be valid Sui address (66 chars, starts with 0x)

### "No invoices found"
**Solution**: 
- Check if invoices are being tracked in localStorage
- Create a test invoice first
- Implement proper indexer for production

---

**Status**: ✅ Frontend integrated with existing contract!  
**Next**: Get Factory Object ID and update buyer input format


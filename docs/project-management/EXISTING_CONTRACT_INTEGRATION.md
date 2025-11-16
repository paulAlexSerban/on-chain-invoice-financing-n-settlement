# ✅ Frontend Updated to Use Existing Smart Contracts

## Overview

The frontend has been updated to work with your existing smart contract modules:
- ✅ `invoice_factory::issue_invoice` - For creating invoices
- ✅ `registry::register_supplier` - For supplier registration  
- ✅ `invoice::Invoice` - Invoice structure
- ✅ `financing::finance_invoice` - For financing
- ✅ `repayment::repay_invoice` - For repayment

## Changes Made

### 1. Updated Invoice Creation Hook
**File:** `dapp/hooks/useInvoiceContract.ts`

**Changes:**
- ✅ Uses `invoice_factory::issue_invoice` instead of removed module
- ✅ Requires Factory Object ID (shared object)
- ✅ Requires SupplierCap (register supplier first)
- ✅ Updated function signature to match contract
- ✅ Handles buyer as address (not string)

### 2. Added Supplier Registration Hook
**File:** `dapp/hooks/useSupplierRegistration.ts` (NEW)

**Features:**
- ✅ Registers user as supplier
- ✅ Gets SupplierCap object ID
- ✅ Stores SupplierCap ID in localStorage
- ✅ Suggests updating .env

### 3. Updated Invoice Form
**File:** `dapp/components/CreateInvoiceForm.tsx`

**Changes:**
- ✅ Buyer field now accepts Sui address (0x...)
- ✅ Amount in SUI (not USD)
- ✅ Shows "Register as Supplier" button if needed
- ✅ Blocks invoice creation until supplier registered

### 4. Updated Invoice Types
**File:** `dapp/types/invoice.ts`

**Structure matches contract:**
- ✅ Buyer as address
- ✅ Supplier (issuer) as address
- ✅ Status: 0=Created, 1=Ready, 2=Financed, 3=Paid
- ✅ Companies info as JSON bytes

## Setup Steps

### Step 1: Get Factory Object ID

After publishing, the factory is created as a shared object:

```bash
make publish_contract
```

Look for:
```
[ SUCCESS ] Factory Object ID: 0x...
```

**Add to `dapp/.env`:**
```env
NEXT_PUBLIC_FACTORY_OBJECT_ID=0x...
```

**Or query it manually:**
```bash
sui client objects --json | jq '.[] | select(.data.type | contains("InvoiceFactory")) | .data.objectId'
```

### Step 2: Register as Supplier

**In the UI:**
1. Go to Business Dashboard
2. Click "Register as Supplier" button
3. Approve transaction
4. SupplierCap ID will be stored automatically

**Or manually:**
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module registry \
  --function register_supplier \
  --gas-budget 100000000
```

**Then get SupplierCap ID:**
```bash
sui client objects | grep SupplierCap
```

**Add to `dapp/.env`:**
```env
NEXT_PUBLIC_SUPPLIER_CAP_ID=0x...
```

### Step 3: Create Invoice

1. Connect wallet
2. Register as supplier (one-time)
3. Fill invoice form:
   - **Buyer Address**: 0x... (Sui address)
   - **Amount**: In SUI
   - **Invoice ID**: Unique identifier
   - **Due Date**: Future date
   - **Description**: Optional
4. Click "Tokenize Invoice"
5. Approve transaction

## Function Signatures

### Create Invoice
```move
entry fun issue_invoice(
    buyer: address,              // Buyer's Sui address
    amount: u64,                 // In MIST
    due_date: u64,              // UNIX timestamp (seconds)
    companies_info: vector<u8>, // JSON metadata
    escrow_bps: u64,            // Escrow in basis points
    discount_bps: u64,          // Discount in basis points
    fee_bps: u64,               // Fee in basis points
    _cap: &SupplierCap,         // Supplier capability
    ctx: &mut TxContext
)
```

### Register Supplier
```move
public fun register_supplier(ctx: &mut TxContext)
```

## Invoice Structure

```move
public struct Invoice has key, store {
    id: UID,
    buyer: address,               // Who must repay
    supplier: address,            // Who issued the invoice
    amount: u64,                  // In MIST
    due_date: u64,                // UNIX timestamp (seconds)
    companies_info: vector<u8>,   // JSON metadata
    status: u8,                   // 0=Created,1=Ready,2=Financed,3=Paid
    escrow_bps: u64,              // Escrow basis points
    discount_bps: u64,            // Discount basis points
    fee_bps: u64,                 // Protocol fee basis points
}
```

## Status Codes

- `0` = Created
- `1` = Ready (can be financed)
- `2` = Financed (investor provided liquidity)
- `3` = Paid (buyer repaid)

## Basis Points (BPS)

- 10,000 BPS = 100%
- 1,000 BPS = 10%
- 500 BPS = 5%
- 100 BPS = 1%

**Defaults:**
- Escrow: 1,000 BPS (10%)
- Discount: 500 BPS (5%)
- Fee: 100 BPS (1%)

## Environment Variables

**Required in `dapp/.env`:**
```env
NEXT_PUBLIC_CONTRACT_ID=0x...
NEXT_PUBLIC_FACTORY_OBJECT_ID=0x...
NEXT_PUBLIC_SUPPLIER_CAP_ID=0x...  # Or auto-stored after registration
NEXT_PUBLIC_NETWORK=testnet
```

## Workflow

```
1. Publish Contract → Get Factory Object ID
2. Register Supplier → Get SupplierCap ID
3. Create Invoice → Uses Factory + SupplierCap
4. Finance Invoice → Investor provides liquidity
5. Repay Invoice → Buyer repays investor
```

## Troubleshooting

### "Factory Object ID not configured"
**Solution:** Get factory ID from publish output and add to `.env`

### "SupplierCap required"
**Solution:** Click "Register as Supplier" button first

### "Invalid buyer address"
**Solution:** Buyer must be a valid Sui address (0x followed by 64 hex chars)

### Invoice not appearing in marketplace
**Solution:** Invoices are shared objects - query may need to track object IDs from events

## Next Steps

1. ✅ Get Factory Object ID from contract publish
2. ✅ Register as supplier
3. ✅ Create first invoice
4. ✅ Test marketplace querying
5. ✅ Implement financing flow
6. ✅ Implement repayment flow

---

**Status:** ✅ Frontend updated to use existing contract modules!


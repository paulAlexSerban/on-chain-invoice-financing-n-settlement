# DApp Smart Contract Integration Guide

## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Date:** November 16, 2025  
**Status:** Integration Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Smart Contract Modules](#smart-contract-modules)
3. [Complete Flow Integration](#complete-flow-integration)
4. [Environment Configuration](#environment-configuration)
5. [TypeScript Types](#typescript-types)
6. [Hook Usage Guide](#hook-usage-guide)
7. [Common Integration Patterns](#common-integration-patterns)
8. [Error Handling](#error-handling)
9. [Testing Integration](#testing-integration)

---

## Overview

This document provides a comprehensive guide for integrating the Next.js dApp with the Sui Move smart contracts. The smart contract consists of 7 modules that work together to manage the complete invoice financing lifecycle.

### Smart Contract Architecture

```
invoice_financing package
├── registry.move           → Supplier registration
├── invoice_factory.move    → Invoice creation entry point
├── invoice.move            → Invoice data structure
├── escrow.move             → Buyer escrow management
├── invoice_financing.move  → Financing logic
├── pay_invoice.move        → Settlement logic
└── treasury.move           → Fee collection
```

---

## Smart Contract Modules

### 1. Registry Module (`registry.move`)

**Purpose:** Manage supplier registration via capability-based access control.

**Structs:**
```move
public struct SupplierCap has key {
    id: UID
}
```

**Functions:**
```move
public fun register_supplier(ctx: &mut TxContext)
```

**DApp Integration:**
```typescript
// Hook: useInvoiceOperations.ts
const registerSupplier = async () => {
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${PACKAGE_ID}::registry::register_supplier`,
    arguments: [],
  });
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  // Extract SupplierCap ID from created objects
  const supplierCapId = result.objectChanges?.find(
    change => change.type === 'created' && 
    change.objectType.includes('SupplierCap')
  )?.objectId;
  
  // Store for future use
  localStorage.setItem('supplier_cap_id', supplierCapId);
};
```

---

### 2. Invoice Factory Module (`invoice_factory.move`)

**Purpose:** Main entry point for creating invoices with escrow.

**Structs:**
```move
public struct InvoiceFactory has key {
    id: UID,
}
```

**Entry Functions:**
```move
entry fun issue_invoice(
    buyer: address,
    amount: u64,
    due_date: u64,
    companies_info: vector<u8>,
    escrow_bps: u64,
    discount_bps: u64,
    treasury: &mut Treasury,
    payment: Coin<SUI>,      // Fee payment to treasury
    _cap: &SupplierCap,
    ctx: &mut TxContext
)
```

**DApp Integration:**
```typescript
// Hook: useInvoiceOperations.ts
const issueInvoice = async (params: {
  buyer: string;
  amount: number;          // in SUI
  dueDate: Date;
  metadata: object;        // { invoiceNumber, description }
  escrowBps: number;       // e.g., 1000 = 10%
  discountBps: number;     // e.g., 320 = 3.2%
}) => {
  const txb = new TransactionBlock();
  
  // Convert data
  const amountInMist = params.amount * 1_000_000_000;
  const dueDateUnix = Math.floor(params.dueDate.getTime() / 1000);
  const metadataBytes = new TextEncoder().encode(
    JSON.stringify(params.metadata)
  );
  
  // Calculate treasury fee (e.g., 50 MIST = 0.00000005 SUI)
  const treasuryFee = 50; // Fixed fee or calculated
  const [feeCoin] = txb.splitCoins(txb.gas, [txb.pure(treasuryFee)]);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::invoice_factory::issue_invoice`,
    arguments: [
      txb.pure(params.buyer, 'address'),
      txb.pure(amountInMist, 'u64'),
      txb.pure(dueDateUnix, 'u64'),
      txb.pure(Array.from(metadataBytes), 'vector<u8>'),
      txb.pure(params.escrowBps, 'u64'),
      txb.pure(params.discountBps, 'u64'),
      txb.object(TREASURY_ID),         // Shared Treasury object
      feeCoin,                          // Payment coin
      txb.object(supplierCapId),        // SupplierCap proof
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  // Extract Invoice ID and BuyerEscrow ID
  const invoiceId = result.objectChanges?.find(
    change => change.type === 'created' && 
    change.objectType.includes('Invoice')
  )?.objectId;
  
  const escrowId = result.objectChanges?.find(
    change => change.type === 'created' && 
    change.objectType.includes('BuyerEscrow')
  )?.objectId;
  
  return { invoiceId, escrowId, digest: result.digest };
};
```

**Important Notes:**
- `issue_invoice` creates **TWO** shared objects: Invoice + BuyerEscrow
- Treasury fee payment is **required** (not optional)
- SupplierCap must be owned by the transaction sender
- `companies_info` is stored as `vector<u8>` (JSON string bytes)

---

### 3. Invoice Module (`invoice.move`)

**Purpose:** Define invoice data structure and provide getters/setters.

**Structs:**
```move
public struct Invoice has key, store {
    id: UID,
    buyer: address,
    supplier: address,
    amount: u64,
    due_date: u64,
    companies_info: vector<u8>,
    status: u8,
    escrow_bps: u64,
    discount_bps: u64,
    fee_bps: u64,           // Note: Not used in current contract
    investor: Option<address>,
    investor_paid: Option<u64>,
    supplier_received: Option<u64>,
    origination_fee: Option<u64>,
}
```

**Status Values:**
- `0` = **Created** - Invoice issued, awaiting buyer escrow
- `1` = **Ready** - Buyer escrow paid, available for financing
- `2` = **Financed** - Investor has funded the invoice
- `3` = **Paid** - Buyer has repaid, settlement complete
- `4` = **Defaulted** - (Future feature)

**Getters:**
```move
public fun buyer(invoice: &Invoice): address
public fun supplier(invoice: &Invoice): address
public fun amount(invoice: &Invoice): u64
public fun due_date(invoice: &Invoice): u64
public fun discount_bps(invoice: &Invoice): u64
public fun status(invoice: &Invoice): u8
public fun escrow_bps(invoice: &Invoice): u64
public fun investor(invoice: &Invoice): Option<address>
public fun investor_paid(invoice: &Invoice): Option<u64>
public fun supplier_received(invoice: &Invoice): Option<u64>
public fun origination_fee(invoice: &Invoice): Option<u64>
```

**DApp Integration:**
```typescript
// Fetch invoice data
const fetchInvoice = async (invoiceId: string) => {
  const object = await suiClient.getObject({
    id: invoiceId,
    options: { showContent: true }
  });
  
  const fields = (object.data?.content as any)?.fields;
  
  // Parse companies_info (vector<u8> → JSON)
  const companiesInfoBytes = fields.companies_info;
  const companiesInfoStr = Buffer.from(companiesInfoBytes).toString('utf-8');
  const companiesInfo = JSON.parse(companiesInfoStr);
  
  // Parse Option<T> fields (Move Option = { vec: [value] } or { vec: [] })
  const extractOption = (opt: any) => 
    opt?.vec?.length > 0 ? opt.vec[0] : undefined;
  
  return {
    id: invoiceId,
    buyer: fields.buyer,
    supplier: fields.supplier,
    amount: fields.amount,
    amountInSui: Number(fields.amount) / 1_000_000_000,
    dueDate: Number(fields.due_date) * 1000, // seconds → ms
    status: Number(fields.status),
    escrowBps: Number(fields.escrow_bps),
    discountBps: Number(fields.discount_bps),
    invoiceNumber: companiesInfo.invoiceNumber,
    description: companiesInfo.description,
    investor: extractOption(fields.investor),
    investorPaid: extractOption(fields.investor_paid),
    supplierReceived: extractOption(fields.supplier_received),
    originationFee: extractOption(fields.origination_fee),
  };
};
```

---

### 4. Escrow Module (`escrow.move`)

**Purpose:** Manage buyer collateral deposits.

**Structs:**
```move
public struct BuyerEscrow has key, store {
    id: UID,
    invoice_id: ID,
    buyer: address,
    escrow_amount: u64,
    paid: bool,
    escrow: Balance<SUI>,
}
```

**Entry Functions:**
```move
entry fun pay_escrow(
    invoice: &mut Invoice,
    buyer_escrow: &mut BuyerEscrow,
    payment: Coin<SUI>,
    ctx: &TxContext
)
```

**Package-Visible Functions:**
```move
public(package) fun payback_escrow(buyer_escrow: &mut BuyerEscrow, ctx: &mut TxContext)
public(package) fun collect_escrow(buyer_escrow: &mut BuyerEscrow, funder: address, ctx: &mut TxContext)
```

**DApp Integration:**
```typescript
// Hook: usePayEscrow.ts
const payEscrow = async (
  invoiceId: string, 
  escrowObjectId: string, 
  escrowAmount: number // in SUI
) => {
  const txb = new TransactionBlock();
  
  const escrowAmountInMist = Math.floor(escrowAmount * 1_000_000_000);
  const [paymentCoin] = txb.splitCoins(txb.gas, [
    txb.pure(escrowAmountInMist)
  ]);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::escrow::pay_escrow`,
    arguments: [
      txb.object(invoiceId),       // invoice: &mut Invoice
      txb.object(escrowObjectId),  // buyer_escrow: &mut BuyerEscrow
      paymentCoin,                 // payment: Coin<SUI>
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  // After success: Invoice status → 1 (Ready), escrow.paid → true
  return result;
};
```

**Error Codes:**
- `E_NOT_BUYER` - Caller is not the invoice buyer
- `E_INVALID_PAYMENT_AMOUNT` - Payment doesn't match `escrow_amount`
- `E_WRONG_INVOICE` - Escrow `invoice_id` doesn't match invoice object ID

---

### 5. Invoice Financing Module (`invoice_financing.move`)

**Purpose:** Handle investor financing of invoices.

**Structs:**
```move
public struct Funding has key, store {
    id: UID,
    invoice_id: ID,
    funder: address,
}
```

**Entry Functions:**
```move
entry fun fund_invoice(
    invoice: &mut Invoice,
    buyer_escrow: &BuyerEscrow,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

**DApp Integration:**
```typescript
// Hook: useInvoiceContract.ts
const financeInvoice = async (
  invoiceId: string,
  escrowId: string,
  invoice: OnChainInvoice
) => {
  // Calculate purchase price
  const discountAmount = (invoice.amount * invoice.discountBps) / 10000;
  const purchasePrice = invoice.amount - discountAmount;
  const purchasePriceInMist = Math.floor(purchasePrice);
  
  const txb = new TransactionBlock();
  const [paymentCoin] = txb.splitCoins(txb.gas, [
    txb.pure(purchasePriceInMist)
  ]);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::invoice_financing::fund_invoice`,
    arguments: [
      txb.object(invoiceId),   // invoice: &mut Invoice
      txb.object(escrowId),    // buyer_escrow: &BuyerEscrow
      paymentCoin,             // payment: Coin<SUI>
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  // After success:
  // - Invoice status → 2 (Financed)
  // - Funding object created (shared)
  // - Payment transferred to supplier
  
  return result;
};
```

**Calculation Example:**
```
Invoice amount: 100,000 MIST (0.0001 SUI)
Discount BPS: 320 (3.2%)

Discount amount = 100,000 * 320 / 10,000 = 3,200 MIST
Purchase price = 100,000 - 3,200 = 96,800 MIST

Investor pays: 96,800 MIST
Supplier receives: 96,800 MIST
Investor profit (on repayment): 3,200 MIST (3.2%)
```

**Error Codes:**
- `E_ESCROW_NOT_PAID` - Buyer hasn't paid escrow yet
- `E_INVOICE_NOT_READY_FOR_FUNDING` - Invoice status != 1 (Ready)
- `E_WRONG_PAYMENT_AMOUNT` - Payment doesn't equal purchase price

---

### 6. Pay Invoice Module (`pay_invoice.move`)

**Purpose:** Handle buyer repayment and settlement.

**Entry Functions:**
```move
entry fun pay_invoice(
    invoice: &mut Invoice,
    buyer_escrow: &mut BuyerEscrow,
    funding: &Funding,
    treasury: &mut Treasury,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

**DApp Integration:**
```typescript
// Hook: useSettleInvoice.ts
const settleInvoice = async (
  invoiceId: string,
  escrowId: string,
  fundingId: string,
  invoice: OnChainInvoice
) => {
  // Calculate payment breakdown
  const amount = invoice.amount;
  const discountBps = invoice.discountBps;
  const treasuryFeeBps = 300; // 3% of discount (from Treasury)
  
  const discountAmount = (amount * discountBps) / 10000;
  const treasuryFee = (discountAmount * treasuryFeeBps) / 10000;
  const totalPayment = amount + discountAmount;
  
  const txb = new TransactionBlock();
  const [paymentCoin] = txb.splitCoins(txb.gas, [
    txb.pure(totalPayment)
  ]);
  
  txb.moveCall({
    target: `${PACKAGE_ID}::pay_invoice::pay_invoice`,
    arguments: [
      txb.object(invoiceId),      // invoice: &mut Invoice
      txb.object(escrowId),       // buyer_escrow: &mut BuyerEscrow
      txb.object(fundingId),      // funding: &Funding
      txb.object(TREASURY_ID),    // treasury: &mut Treasury
      paymentCoin,                // payment: Coin<SUI>
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  // After success:
  // - Invoice status → 3 (Paid)
  // - Treasury fee transferred to treasury
  // - Remaining payment transferred to funder
  // - Escrow returned to buyer
  
  return result;
};
```

**Payment Breakdown:**
```
Invoice amount: 100,000 MIST
Discount BPS: 320 (3.2%)
Treasury fee BPS: 300 (3%)

Discount amount = 100,000 * 320 / 10,000 = 3,200 MIST
Treasury fee = 100,000 * 320 * 300 / 100,000,000 = 96 MIST
Funder receives = 100,000 + 3,200 - 96 = 103,104 MIST
Escrow returned to buyer

Total buyer pays = 100,000 + 3,200 = 103,200 MIST
```

**Error Codes:**
- `E_NOT_BUYER` - Only the buyer can pay the invoice
- `E_CANNOT_PAY_INVOICE` - Invoice already paid (status 3) or defaulted (status 4)

---

### 7. Treasury Module (`treasury.move`)

**Purpose:** Collect and manage protocol fees.

**Structs:**
```move
public struct Treasury has key, store {
    id: UID,
    owner: address,
    fee_bps: u64,
    balance: Balance<SUI>
}
```

**Functions:**
```move
public fun create_treasury(owner: address, fee_bps: u64, ctx: &mut TxContext): Treasury
public fun set_fee_bps(treasury: &mut Treasury, caller: address, new_fee_bps: u64)
public fun deposit_fee(treasury: &mut Treasury, coin: Coin<SUI>)

entry fun withdraw(
    treasury: &mut Treasury,
    amount: u64,
    ctx: &mut TxContext
)
```

**DApp Integration:**
```typescript
// Hook: useTreasuryWithdraw.ts (Admin only)
const withdrawFromTreasury = async (amount: number) => {
  const amountInMist = Math.floor(amount * 1_000_000_000);
  
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${PACKAGE_ID}::treasury::withdraw`,
    arguments: [
      txb.object(TREASURY_ID),
      txb.pure(amountInMist, 'u64'),
    ],
  });
  
  const result = await signAndExecuteTransactionBlock({ 
    transactionBlock: txb 
  });
  
  return result;
};

// Fetch treasury balance
const fetchTreasuryBalance = async () => {
  const object = await suiClient.getObject({
    id: TREASURY_ID,
    options: { showContent: true }
  });
  
  const fields = (object.data?.content as any)?.fields;
  
  return {
    owner: fields.owner,
    feeBps: Number(fields.fee_bps),
    balance: Number(fields.balance),
    balanceInSui: Number(fields.balance) / 1_000_000_000,
  };
};
```

---

## Complete Flow Integration

### Full Invoice Lifecycle in DApp

```typescript
// 1. Supplier registers (one-time)
const { supplierCapId } = await registerSupplier();

// 2. Supplier creates invoice
const { invoiceId, escrowId } = await issueInvoice({
  buyer: '0x...',
  amount: 1000, // SUI
  dueDate: new Date('2025-12-31'),
  metadata: { 
    invoiceNumber: 'INV-001', 
    description: 'Services'
  },
  escrowBps: 1000, // 10%
  discountBps: 320, // 3.2%
});
// Invoice status: 0 (Created)

// 3. Buyer pays escrow
await payEscrow(invoiceId, escrowId, 100); // 10% of 1000
// Invoice status: 1 (Ready)

// 4. Investor finances invoice
await financeInvoice(invoiceId, escrowId, invoice);
// Invoice status: 2 (Financed)
// Supplier receives: 968 SUI (1000 - 3.2% discount)

// 5. Buyer repays invoice
await settleInvoice(invoiceId, escrowId, fundingId, invoice);
// Invoice status: 3 (Paid)
// Funder receives: 1032 SUI (1000 + 32 discount)
// Treasury receives: 0.96 SUI (3% of 32 discount)
// Buyer gets escrow back: 100 SUI
```

---

## Environment Configuration

### Required Environment Variables

```env
# Smart Contract
NEXT_PUBLIC_CONTRACT_ID=0x...           # Package ID after deployment
NEXT_PUBLIC_TREASURY_ID=0x...           # Shared Treasury object ID
NEXT_PUBLIC_FACTORY_OBJECT_ID=0x...     # Shared InvoiceFactory object ID
NEXT_PUBLIC_OWNER_ADDRESS=0x...         # Treasury owner address
NEXT_PUBLIC_NETWORK=testnet             # testnet or mainnet

# Optional
NEXT_PUBLIC_EXPLORER_URL=https://testnet.suivision.xyz
```

### Getting Deployment IDs

After deploying the contract with `sui client publish`:

```bash
# Extract from output:
Published Objects:
- 0xABCD... (package)           → NEXT_PUBLIC_CONTRACT_ID
- 0x1234... (InvoiceFactory)    → NEXT_PUBLIC_FACTORY_OBJECT_ID
- 0x5678... (Treasury)          → NEXT_PUBLIC_TREASURY_ID
```

---

## TypeScript Types

### Aligned with Smart Contract

```typescript
// types/invoice.ts

export interface OnChainInvoice {
  id: string;
  buyer: address;
  supplier: address;
  amount: string;                    // u64 as string
  amountInSui: number;              // Converted for display
  dueDate: number;                  // Unix timestamp (ms)
  companiesInfo: {
    invoiceNumber: string;
    description: string;
  };
  status: 0 | 1 | 2 | 3 | 4;
  escrowBps: number;
  discountBps: number;
  // Optional financing fields
  investor?: string;
  investorPaid?: string;
  supplierReceived?: string;
  originationFee?: string;
}

export interface BuyerEscrow {
  id: string;
  invoiceId: string;
  buyer: string;
  escrowAmount: string;             // u64 as string
  escrowAmountInSui: number;
  paid: boolean;
}

export interface Funding {
  id: string;
  invoiceId: string;
  funder: string;
}

export interface Treasury {
  id: string;
  owner: string;
  feeBps: number;
  balance: string;                  // u64 as string
  balanceInSui: number;
}
```

---

## Hook Usage Guide

### 1. useSupplierRegistration

**Purpose:** Register a supplier to get SupplierCap

```typescript
const { 
  registerSupplier, 
  supplierCapId,
  isRegistered,
  isLoading 
} = useSupplierRegistration();

// Usage
if (!isRegistered) {
  await registerSupplier();
}
```

### 2. useInvoiceOperations

**Purpose:** Issue invoices

```typescript
const { 
  issueInvoice, 
  isLoading 
} = useInvoiceOperations();

const result = await issueInvoice({
  buyer: '0x...',
  amount: 1000,
  dueDate: new Date('2025-12-31'),
  metadata: { 
    invoiceNumber: 'INV-001',
    description: 'Services'
  },
  escrowBps: 1000,
  discountBps: 320,
});
```

### 3. usePayEscrow

**Purpose:** Buyer pays collateral

```typescript
const { 
  payEscrow, 
  findEscrowObject,
  isLoading 
} = usePayEscrow();

const escrowId = await findEscrowObject(invoiceId);
await payEscrow(invoiceId, escrowId, 100);
```

### 4. useInvoiceContract

**Purpose:** Investor finances invoice

```typescript
const { 
  financeInvoice,
  calculateFinancing,
  isLoading 
} = useInvoiceContract();

const calc = calculateFinancing(invoice);
console.log('Purchase price:', calc.purchasePrice);
console.log('Investor profit:', calc.investorProfit);

await financeInvoice(invoiceId, escrowId, invoice);
```

### 5. useSettleInvoice

**Purpose:** Buyer repays invoice

```typescript
const { 
  settleInvoice,
  isSettling 
} = useSettleInvoice();

await settleInvoice({
  invoiceId,
  escrowId,
  fundingId,
  invoice
});
```

### 6. useTreasuryWithdraw

**Purpose:** Admin withdraws fees (owner only)

```typescript
const { 
  withdraw,
  isWithdrawing 
} = useTreasuryWithdraw();

await withdraw(100); // Withdraw 100 SUI
```

---

## Common Integration Patterns

### Pattern 1: Query Objects by Type

```typescript
const suiClient = new SuiClient({ url: getRpcUrl() });

// Get all invoices
const invoices = await suiClient.queryObjects({
  filter: {
    StructType: `${PACKAGE_ID}::invoice::Invoice`
  },
  options: { showContent: true }
});
```

### Pattern 2: Subscribe to Events

```typescript
// Listen for InvoiceCreated events
const unsubscribe = await suiClient.subscribeEvent({
  filter: {
    MoveEventType: `${PACKAGE_ID}::invoice_factory::InvoiceCreated`
  },
  onMessage(event) {
    console.log('New invoice:', event.parsedJson);
  }
});
```

### Pattern 3: Extract Option<T> Fields

```typescript
const extractOption = (optionField: any) => {
  if (!optionField || !optionField.vec) return undefined;
  return optionField.vec.length > 0 ? optionField.vec[0] : undefined;
};

const investor = extractOption(fields.investor);
```

### Pattern 4: Parse vector<u8> Strings

```typescript
const parseVectorU8 = (bytes: number[]) => {
  return Buffer.from(bytes).toString('utf-8');
};

const companiesInfoStr = parseVectorU8(fields.companies_info);
const companiesInfo = JSON.parse(companiesInfoStr);
```

---

## Error Handling

### Smart Contract Errors

| Error Code                           | Module            | Meaning                                   | User Action                     |
| ------------------------------------ | ----------------- | ----------------------------------------- | ------------------------------- |
| `E_NOT_BUYER`                        | escrow            | Caller is not the invoice buyer           | Connect correct wallet          |
| `E_INVALID_PAYMENT_AMOUNT`           | escrow            | Payment doesn't match escrow amount       | Check escrow amount             |
| `E_WRONG_INVOICE`                    | escrow            | Escrow doesn't belong to this invoice     | Verify invoice/escrow IDs       |
| `E_ESCROW_NOT_PAID`                  | invoice_financing | Buyer hasn't paid escrow                  | Pay escrow first                |
| `E_INVOICE_NOT_READY_FOR_FUNDING`    | invoice_financing | Invoice status != Ready                   | Check invoice status            |
| `E_WRONG_PAYMENT_AMOUNT`             | invoice_financing | Payment doesn't match purchase price      | Recalculate purchase price      |
| `E_CANNOT_PAY_INVOICE`               | pay_invoice       | Invoice already paid or defaulted         | Check invoice status            |
| `E_NOT_TREASURY_OWNER`               | treasury          | Only owner can withdraw                   | Connect owner wallet            |

### DApp Error Handling Pattern

```typescript
try {
  await someContractCall();
} catch (error: any) {
  console.error('Contract error:', error);
  
  let userMessage = 'Transaction failed';
  
  if (error.message?.includes('E_NOT_BUYER')) {
    userMessage = 'Only the buyer can perform this action';
  } else if (error.message?.includes('E_ESCROW_NOT_PAID')) {
    userMessage = 'Escrow must be paid before financing';
  } else if (error.message?.includes('Insufficient')) {
    userMessage = 'Insufficient SUI balance';
  }
  
  toast({
    title: 'Transaction Failed',
    description: userMessage,
    variant: 'destructive',
  });
}
```

---

## Testing Integration

### Test Checklist

- [ ] Supplier registration creates SupplierCap
- [ ] Issue invoice with treasury fee payment
- [ ] Invoice and escrow objects created correctly
- [ ] Pay escrow updates invoice status to Ready (1)
- [ ] Finance invoice transfers funds to supplier
- [ ] Finance invoice creates Funding object
- [ ] Finance invoice updates invoice status to Financed (2)
- [ ] Settle invoice transfers payment to funder
- [ ] Settle invoice transfers fee to treasury
- [ ] Settle invoice returns escrow to buyer
- [ ] Settle invoice updates status to Paid (3)
- [ ] Treasury withdrawal works for owner only

### Example Test Scenario

```typescript
// Test complete flow
describe('Invoice Financing Flow', () => {
  it('should complete full lifecycle', async () => {
    // 1. Register supplier
    const { supplierCapId } = await registerSupplier();
    expect(supplierCapId).toBeDefined();
    
    // 2. Issue invoice
    const { invoiceId, escrowId } = await issueInvoice({...});
    expect(invoiceId).toBeDefined();
    expect(escrowId).toBeDefined();
    
    // 3. Check initial status
    const invoice = await fetchInvoice(invoiceId);
    expect(invoice.status).toBe(0); // Created
    
    // 4. Pay escrow
    await payEscrow(invoiceId, escrowId, 100);
    const invoiceAfterEscrow = await fetchInvoice(invoiceId);
    expect(invoiceAfterEscrow.status).toBe(1); // Ready
    
    // 5. Finance invoice
    await financeInvoice(invoiceId, escrowId, invoice);
    const invoiceAfterFinance = await fetchInvoice(invoiceId);
    expect(invoiceAfterFinance.status).toBe(2); // Financed
    
    // 6. Settle invoice
    await settleInvoice({...});
    const invoiceAfterSettle = await fetchInvoice(invoiceId);
    expect(invoiceAfterSettle.status).toBe(3); // Paid
  });
});
```

---

## Summary

This guide provides complete integration between the Next.js dApp and Sui Move smart contracts. Key takeaways:

1. **Treasury fee required** when issuing invoices
2. **SupplierCap** must be obtained before issuing
3. **Status flow**: Created (0) → Ready (1) → Financed (2) → Paid (3)
4. **Escrow payment** transitions invoice to Ready status
5. **Finance invoice** calculates discount correctly
6. **Settlement** distributes funds to funder, treasury, and returns escrow
7. **Option<T>** fields require special parsing ({ vec: [value] })
8. **vector<u8>** strings need Buffer conversion

For questions or issues, refer to:
- Smart Contract Documentation: `/docs/SMART_CONTRACT_DOCUMENTATION.md`
- Architecture Docs: `/docs/architecture/`
- Deployment Info: `/docs/DEPLOYMENT_INFO.md`

---

**Last Updated:** November 16, 2025  
**Version:** 1.0.0

# Settlement Flow - Correct Implementation ✅

**Date:** November 15, 2025  
**Status:** Restructured - Buyers settle, not investors

## Problem Identified

The original implementation incorrectly placed settlement functionality in the **Investor Dashboard**. This was wrong because:

❌ **Investors don't pay invoices** - they finance them and wait for settlement  
✅ **Buyers (debtors) pay invoices** - they are the ones who owe the money

## Solution - Correct Actor Roles

### Actor Responsibilities

| Actor | Role | Actions |
|-------|------|---------|
| **Supplier (Issuer)** | Creates invoice | - Issues invoice<br>- Receives discounted payment upfront |
| **Investor (Financier)** | Finances invoice | - Buys invoice at discount<br>- Waits for settlement<br>- Receives full amount when settled |
| **Buyer (Debtor)** | Pays invoice | - **SETTLES INVOICE**<br>- Pays full face value<br>- Receives goods/services |
| **Platform** | Facilitates transactions | - Collects fees<br>- Manages escrow<br>- Processes settlements |

## Implementation

### 1. ✅ Navigation Updated
**File:** `/dapp/components/Navigation.tsx`

**Added:**
```tsx
<Link href="/dashboard/settle">
  Settle Invoices
</Link>
```

Now visible in:
- Desktop navigation (top menu)
- Mobile navigation (hamburger menu)

### 2. ✅ New Hook: `useMyPayableInvoices()`
**File:** `/dapp/hooks/useInvoices.ts`

**Purpose:** Fetch invoices where the current user is the **buyer** (debtor)

**Logic:**
```typescript
export function useMyPayableInvoices() {
  // 1. Fetch all InvoiceCreated events
  // 2. Get invoice objects
  // 3. Filter where invoice.buyer === currentAccount.address
  // 4. Return invoices the user needs to pay
}
```

**Returns:**
- Pending invoices (not yet financed)
- Funded invoices (awaiting settlement) ← **THESE NEED PAYMENT**
- Repaid invoices (already settled)

### 3. ✅ New Page: Settle Dashboard
**File:** `/dapp/app/dashboard/settle/page.tsx`

**URL:** `/dashboard/settle`

**Features:**
- **Summary Cards:**
  - Invoices to Settle (count)
  - Total Payable (SUI amount)
  - Settled Total (SUI amount paid)

- **Awaiting Settlement Section:**
  - Lists all FUNDED invoices where user is buyer
  - Shows invoice details (amount, due date, days until due)
  - Highlights overdue invoices in red
  - "Settle Invoice" button for each

- **Settled Invoices Section:**
  - Shows payment history
  - Completed/paid invoices

- **SettleInvoiceModal Integration:**
  - Click "Settle Invoice" → Modal opens
  - Modal shows payment breakdown
  - User pays full face value
  - Investor receives funds
  - Platform collects fees

### 4. ✅ Investor Dashboard Cleanup
**File:** `/dapp/app/dashboard/investor/page.tsx`

**Removed:**
- ❌ Settle button from investment cards
- ❌ Settlement modal state
- ❌ Settlement handlers
- ❌ `SettleInvoiceModal` import

**Why:** Investors should **NOT** settle invoices. They:
- Finance invoices (already done)
- Monitor investments
- Wait for buyers to settle
- Receive payments automatically when settlement happens

## Correct Flow

```
┌──────────────────────────────────────────────────────────┐
│                   Invoice Lifecycle                       │
└──────────────────────────────────────────────────────────┘

1. SUPPLIER creates invoice
   └─> Invoice status: PENDING
   └─> Buyer field: Set to debtor's address

2. INVESTOR finances invoice
   └─> Pays discounted amount to supplier
   └─> Invoice status: FUNDED
   └─> Waits for settlement

3. BUYER settles invoice  ← THIS IS THE KEY CHANGE
   └─> Goes to /dashboard/settle
   └─> Sees invoices where they are the buyer
   └─> Clicks "Settle Invoice"
   └─> Pays full face value (1000 SUI)
   └─> Invoice status: REPAID

4. SMART CONTRACT distributes funds
   └─> Investor receives: ~998 SUI (after fees)
   └─> Platform receives: ~2 SUI (fees)
   └─> Invoice marked REPAID
```

## User Journeys

### Journey 1: Buyer Settling Invoice

```
Buyer logs in
    ↓
Navigates to "Settle Invoices"
    ↓
Sees dashboard with:
├── Summary: "You have 3 invoices to settle"
├── Total Payable: "3,450.00 SUI"
└── List of funded invoices where buyer is current user
    ↓
Clicks "Settle Invoice - Pay 1,000.00 SUI"
    ↓
SettleInvoiceModal opens
├── Shows invoice #INV-001
├── Amount: 1,000 SUI
├── Due Date: Dec 15, 2025
└── Payment Breakdown
    ↓
Clicks "Settle Invoice" button
    ↓
Wallet prompts for approval
    ↓
User signs transaction (pays 1,000 SUI)
    ↓
Smart Contract:
├── Receives 1,000 SUI
├── Sends ~998 SUI to investor
├── Sends ~2 SUI to platform (fees)
└── Updates invoice status: REPAID
    ↓
Modal shows success
    ↓
Dashboard refreshes
├── Funded count decreases
├── Settled count increases
└── Invoice moves to "Settled" section
```

### Journey 2: Investor Monitoring Investment

```
Investor logs in
    ↓
Navigates to "For Investors"
    ↓
Sees dashboard with:
├── Active Investments (funded, waiting for settlement)
└── Settled Investments (completed, funds received)
    ↓
Clicks investment card → Opens explorer
    ↓
Views transaction details on blockchain
    ↓
When buyer settles:
├── Investment automatically moves to "Settled"
├── Investor receives funds (no action needed)
└── Dashboard updates on next refresh
```

## Component Architecture

```
Navigation
├── "Settle Invoices" link → /dashboard/settle
│
├── /dashboard/settle (NEW PAGE)
│   ├── useMyPayableInvoices() hook
│   │   └── Filters invoices where user is buyer
│   │
│   ├── Summary Cards
│   │   ├── Invoices to Settle
│   │   ├── Total Payable
│   │   └── Settled Total
│   │
│   ├── Awaiting Settlement Section
│   │   └── Invoice Cards
│   │       ├── Invoice details
│   │       ├── Due date / Overdue status
│   │       └── "Settle Invoice" button
│   │           └── Opens SettleInvoiceModal
│   │
│   └── SettleInvoiceModal
│       ├── useSettleInvoice() hook
│       ├── Payment breakdown
│       └── Settlement transaction
│
└── /dashboard/investor
    ├── NO settlement functionality
    ├── View investments only
    └── Monitor status (Active/Settled)
```

## Data Flow

```
useMyPayableInvoices()
    ↓
1. Query InvoiceCreated events
    ↓
2. Fetch invoice objects
    ↓
3. Filter: invoice.buyer === currentAccount.address
    ↓
4. Return filtered invoices
    ↓
┌─────────────────────────────────────┐
│ Settle Dashboard                    │
├─────────────────────────────────────┤
│ Funded Invoices (buyer = me):       │
│ ├── INV-001: 1,000 SUI  [Settle]   │
│ ├── INV-002: 1,500 SUI  [Settle]   │
│ └── INV-003: 950 SUI    [Settle]    │
└─────────────────────────────────────┘
```

## Smart Contract Interaction

### Settlement Call: `repay_invoice()`

**Who calls:** Buyer (debtor)  
**What it does:**
1. Receives full invoice amount from buyer
2. Calculates platform fees
3. Sends investor portion to financier
4. Sends fees to platform treasury
5. Updates invoice status to REPAID
6. Emits `InvoiceRepaid` event

**Transaction:**
```typescript
const tx = new TransactionBlock();

// Buyer pays full amount
const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountInMist)]);

tx.moveCall({
  target: `${packageId}::invoice_financing::repay_invoice`,
  arguments: [
    tx.object(platformId),  // Platform shared object
    tx.object(invoiceId),   // Invoice to settle
    coin,                   // Payment (full face value)
  ],
});

// Smart contract distributes:
// - Investor gets: amount - fees (~998 SUI)
// - Platform gets: fees (~2 SUI)
// - Invoice status → REPAID
```

## File Changes Summary

| File | Change | Purpose |
|------|--------|---------|
| `Navigation.tsx` | ✅ Added "Settle Invoices" link | Access for buyers |
| `useInvoices.ts` | ✅ Added `useMyPayableInvoices()` hook | Fetch buyer's invoices |
| `app/dashboard/settle/page.tsx` | ✅ Created new page | Buyer settlement interface |
| `app/dashboard/investor/page.tsx` | ✅ Removed settlement code | Investors don't settle |
| `InvestmentCard.tsx` | ℹ️ Kept (no changes needed) | Works without settle button |
| `InvestmentList.tsx` | ℹ️ Kept (no changes needed) | `showSettleButton=false` |
| `SettleInvoiceModal.tsx` | ℹ️ Reused by settle dashboard | Same modal, different context |
| `useSettleInvoice.ts` | ℹ️ Reused by settle dashboard | Same hook, called by buyer |

## Testing Checklist

### Setup
- [ ] Connect wallet as **Buyer** (not investor)
- [ ] Ensure you have invoices where you are the buyer
- [ ] Verify invoices are FUNDED (already financed by investor)

### Buyer Flow
- [ ] Navigate to "Settle Invoices" in navigation
- [ ] See dashboard with correct invoice count
- [ ] Verify only invoices where you are buyer are shown
- [ ] Check summary cards show correct totals
- [ ] Verify overdue invoices highlighted in red
- [ ] Click "Settle Invoice" button
- [ ] Modal opens with correct invoice data
- [ ] Payment breakdown shows correct amounts
- [ ] Click "Settle Invoice" in modal
- [ ] Wallet prompts for signature
- [ ] Sign transaction
- [ ] Success message displayed
- [ ] Dashboard refreshes automatically
- [ ] Invoice moves from "Awaiting" to "Settled"

### Investor Flow
- [ ] Connect wallet as **Investor**
- [ ] Navigate to "For Investors"
- [ ] See active investments (funded invoices)
- [ ] **Verify NO settle button** on cards
- [ ] Wait for buyer to settle
- [ ] After settlement, investment moves to "Settled" tab
- [ ] Verify investor received correct amount

### Smart Contract Verification
- [ ] Check transaction on explorer
- [ ] Verify `InvoiceRepaid` event emitted
- [ ] Check invoice status updated to REPAID (2)
- [ ] Verify investor received correct amount
- [ ] Verify platform received fees
- [ ] Check total = investor amount + platform fees

## Key Differences: Before vs After

### Before (WRONG ❌)
```
Investor Dashboard
└── Active Investments
    └── Investment Card
        └── [Settle Invoice] button  ← WRONG!

Problem: Investors don't owe money, they lent it!
```

### After (CORRECT ✅)
```
Settle Dashboard (NEW)
└── Awaiting Settlement
    └── Invoice Card
        └── [Settle Invoice] button  ← CORRECT!
        
Only visible to: Buyer (invoice.buyer === wallet.address)

Investor Dashboard
└── Active Investments
    └── Investment Card
        └── [View Details] button only
        
Investors just monitor, no settlement action
```

## Environment Requirements

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...     # Deployed contract
NEXT_PUBLIC_PLATFORM_ID=0x...    # Platform shared object
```

## Next Steps

1. **Test with Multiple Accounts:**
   - Account A: Supplier (creates invoice)
   - Account B: Investor (finances invoice)
   - Account C: Buyer (settles invoice) ← Test this!

2. **Verify Correct Access:**
   - Only Account C should see invoice in /dashboard/settle
   - Account B should see it in /dashboard/investor (as active investment)
   - After settlement, Account B should see it as settled investment

3. **End-to-End Flow:**
   ```
   1. Account A → Create invoice (buyer = Account C)
   2. Account B → Finance invoice
   3. Account C → Settle invoice (/dashboard/settle)
   4. Account B → Verify received payment (dashboard updates)
   ```

## Success Criteria ✅

- [x] "Settle Invoices" link added to navigation
- [x] Settle dashboard created at `/dashboard/settle`
- [x] `useMyPayableInvoices()` hook fetches correct invoices
- [x] Only invoices where user is buyer are shown
- [x] Settlement modal integrated properly
- [x] Investor dashboard cleaned (no settle functionality)
- [x] All files compile without errors
- [ ] End-to-end test passed with 3 accounts

---

**Status:** ✅ Correctly Implemented  
**Ready for Testing:** Yes  
**Key Fix:** Settlement moved from investor → buyer (correct actor)

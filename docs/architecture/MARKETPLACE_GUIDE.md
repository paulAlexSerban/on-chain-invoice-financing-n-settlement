# 📊 Marketplace Implementation Guide

## Overview

The marketplace fetches and displays **ALL invoices from the blockchain**, not just those owned by the current user.

## How It Works

### Data Fetching Strategy

The marketplace uses **event-based querying** to find all invoices:

```typescript
// Query ALL InvoiceCreated events
const events = await suiClient.queryEvents({
  query: {
    MoveEventType: `${packageId}::invoice_financing::InvoiceCreated`
  },
  limit: 50,
  order: 'descending'
});
```

This approach:
- ✅ Fetches invoices created by **anyone** (not just current user)
- ✅ Works regardless of invoice ownership
- ✅ Uses blockchain events (emitted during creation)
- ✅ Independent of who owns the invoice object

### Why Events?

Invoice objects in Sui are owned by their creator initially. To see **all** invoices (not just ones you own), we need to:

1. **Query events** - These are public and searchable
2. **Extract invoice IDs** from events
3. **Fetch full invoice data** using the IDs

### Current vs. All Invoices

```typescript
// ✅ useInvoices() - ALL invoices (marketplace)
const { data: allInvoices } = useInvoices();
// Returns: Invoices created by anyone

// ✅ useMyInvoices() - Only YOUR invoices (dashboard)
const { data: myInvoices } = useMyInvoices();
// Returns: Only invoices you created
```

## Verification

### Check Console Logs

When the marketplace loads, you'll see:

```
🔍 Fetching Invoices from Blockchain
  Package ID: 0x4d3f...
  Network: testnet
  Querying for type: 0x4d3f...::invoice_financing::Invoice
  Events found: X  // <-- This shows ALL events
  Invoice IDs: [...]  // <-- All invoice IDs
  Fetched objects: Y
  Parsed invoices: Y
```

### What You Should See

**Marketplace** (`/marketplace`):
- Shows ALL invoices from ALL users
- Available for financing
- Full marketplace view

**Business Dashboard** (`/dashboard/business`):
- Shows only YOUR invoices
- Ones you created
- Your portfolio

## Testing

### Create Invoices from Multiple Wallets

1. **Wallet A**: Create invoice "INV-001"
2. **Wallet B**: Create invoice "INV-002"  
3. **Visit marketplace**: Should see BOTH invoices

### Debug in Console

```javascript
// Open DevTools Console (F12)

// Check what the hook is returning
console.log("All invoices:", allInvoices);

// Should show invoices from different issuers
allInvoices.forEach(inv => {
  console.log(`${inv.invoiceNumber} by ${inv.issuer}`);
});
```

## Current Implementation

### Marketplace Page
```typescript
// /app/marketplace/page.tsx
const { data: invoices } = useInvoices(filters);
// ✅ Fetches ALL invoices
```

### useInvoices Hook
```typescript
// Queries ALL InvoiceCreated events
const events = await suiClient.queryEvents({
  query: { MoveEventType: `${packageId}::invoice_financing::InvoiceCreated` }
});

// Gets invoice IDs from ALL events
const invoiceIds = events.data.map(event => 
  event.parsedJson?.invoice_id
);

// Fetches ALL invoice objects
const invoiceObjects = await Promise.all(
  invoiceIds.map(id => suiClient.getObject({ id }))
);
```

## Filters

The marketplace filters work on ALL invoices:

- **Status**: pending / funded / repaid / all
- **Sort**: by amount / due date / created date
- **Order**: ascending / descending

## Troubleshooting

### Issue: Only seeing my invoices

**Check:**
1. Are there other invoices on the blockchain?
2. Is Package ID correct?
3. Check console for event count

**Debug:**
```typescript
// In browser console
const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
console.log("Package ID:", packageId);

// Check events manually
// (requires SuiClient setup)
```

### Issue: No invoices showing

**Possible causes:**
1. No invoices created yet → Create some!
2. Package ID not configured → Check .env
3. Network mismatch → Verify testnet/mainnet
4. Events not indexed yet → Wait ~10 seconds, refresh

### Issue: Can't see new invoice immediately

**Expected behavior:**
- Marketplace refetches every 10 seconds
- Click refresh button (🔄) to update immediately

## Performance Notes

### Current Limits

```typescript
const events = await suiClient.queryEvents({
  limit: 50,  // Fetches last 50 invoices
  order: 'descending'  // Newest first
});
```

### For Production

Consider:
- Increase limit or add pagination
- Add backend indexer for faster queries
- Implement cursor-based pagination
- Cache results

## Architecture

```
Blockchain (All Invoices)
    ↓
InvoiceCreated Events (Public)
    ↓
useInvoices Hook (Queries events)
    ↓
Marketplace (Displays ALL)
```

vs.

```
Blockchain
    ↓
Owned Objects (Filter by owner)
    ↓
useMyInvoices Hook
    ↓
Dashboard (YOUR invoices only)
```

## Summary

✅ **Marketplace shows ALL invoices** - Uses event-based queries  
✅ **Dashboard shows YOUR invoices** - Uses owned objects query  
✅ **Filters apply to ALL invoices** - Not just yours  
✅ **Auto-refresh every 10 seconds** - Or manual refresh  

The implementation is correct - the marketplace will show all invoices from all users on the blockchain!


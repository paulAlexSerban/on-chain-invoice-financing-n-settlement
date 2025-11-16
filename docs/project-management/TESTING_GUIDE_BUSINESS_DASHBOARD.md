# Business Dashboard Tab Filtering - Testing Guide

**Date:** November 15, 2025  
**Purpose:** Verify the fixed tab filtering is working correctly

---

## 🧪 Quick Test Steps

### Prerequisites
- Wallet connected to testnet
- Contract deployed with package ID in `.env`
- Dev server running (`npm run dev`)

---

## Test 1: Check Console Logs

### Expected Output
When you open the Business Dashboard, you should see in browser console:

```
📋 Fetching My Invoices (Business Dashboard)
  Issuer Address: 0x[your-wallet-address]
  Package ID: 0x4d3f0eeb160eaff90fafc34654457604bdce0ff38775f45f87561f5469aeac12
  Total InvoiceCreated events found: [number]
  Events for this issuer: [number]
  Invoice IDs: ["0x...", "0x...", ...]
  Successfully fetched objects: [number]
  Parsed invoices: [number]
  Status breakdown: { 
    pending: X, 
    funded: Y, 
    repaid: Z, 
    defaulted: 0 
  }
```

### What to Look For
✅ **Total events > 0** - Contract has emitted events  
✅ **Events for issuer matches your invoices** - Filtering works  
✅ **Fetched objects = Parsed invoices** - No fetch failures  
✅ **Status breakdown adds up** - All invoices categorized

---

## Test 2: Active Invoices Tab

### Should Show:
- ✅ Invoices with status `PENDING` (0) - Badge: "Listed" (blue outline)
- ✅ Invoices with status `FUNDED` (1) - Badge: "Financed" (solid blue)

### Should NOT Show:
- ❌ Invoices with status `REPAID` (2)
- ❌ Invoices with status `DEFAULTED` (3)

### Test Actions:
1. Create a new invoice → Should appear in Active tab immediately (after 10s refetch)
2. Finance an invoice from marketplace → Should stay in Active tab but badge changes to "Financed"
3. Check count badge on tab → Should match `pending + funded` count

---

## Test 3: Settled Tab

### Should Show:
- ✅ Invoices with status `REPAID` (2) - Badge: "Settled" (gray)
- ✅ Invoices with status `DEFAULTED` (3) - Badge: "Settled" (gray)

### Should NOT Show:
- ❌ Invoices with status `PENDING` (0)
- ❌ Invoices with status `FUNDED` (1)

### Test Actions:
1. Oracle confirms payment on a financed invoice → Should move to Settled tab
2. Check settled date is displayed
3. Check count badge on tab → Should match `repaid + defaulted` count

---

## Test 4: Statistics Cards

### Total Invoices
**Should show:** Count of ALL invoices created by user (pending + funded + repaid)

### Total Financed
**Should show:** Sum of `supplierReceivedInSui` (or `financedAmountInSui`) for invoices with status FUNDED or REPAID

### Pending Amount
**Should show:** Sum of `amountInSui` for invoices with status PENDING or FUNDED

### Avg. Discount
**Should show:** Mock value 3.5% (or calculated from `discountRateBps` if available)

---

## Test 5: Full Lifecycle

### Step-by-Step:
1. **Create Invoice**
   - Go to "Create New" tab
   - Fill form: Client="ACME Corp", Amount=1000, Discount=5%
   - Click "Tokenize Invoice"
   - ✅ Should appear in Active tab with "Listed" badge
   - ✅ Statistics: Total +1, Pending Amount +1000

2. **Finance Invoice**
   - Switch to Investor wallet
   - Go to Marketplace
   - Finance the invoice
   - Switch back to Business wallet
   - ✅ Invoice still in Active tab (doesn't disappear!)
   - ✅ Badge changes to "Financed"
   - ✅ Statistics: Total Financed updates

3. **Settle Invoice**
   - Oracle confirms payment (status → REPAID)
   - ✅ Invoice disappears from Active tab
   - ✅ Invoice appears in Settled tab
   - ✅ Badge shows "Settled"
   - ✅ Settled date displayed

---

## 🐛 Troubleshooting

### Issue: No invoices showing at all

**Check:**
1. Console logs show "Events for this issuer: 0"
   - You haven't created any invoices with this wallet
   - Or contract not emitting `InvoiceCreated` events

2. Console error: "Package ID not configured"
   - Check `.env` has `NEXT_PUBLIC_CONTRACT_ID`
   - Restart dev server after adding env var

3. Console error: "Error fetching my invoices"
   - Check network connectivity
   - Verify package ID is correct
   - Check testnet RPC is responding

### Issue: Invoices disappear after financing

**This should be fixed!** If still happening:
1. Check console logs - is `useMyInvoices()` using event-based query?
2. Check hook file has the updated code (lines 251-328)
3. Hard refresh browser (Cmd+Shift+R)
4. Clear React Query cache (refresh page)

### Issue: Wrong invoices in tabs

**Check:**
1. Console log "Status breakdown" - verify numbers
2. Inspect invoice object in console - check `status` field value
3. Verify status mapping in `convertToInvoiceData`:
   - 0 → "listed" (Active tab)
   - 1 → "financed" (Active tab)
   - 2 → "settled" (Settled tab)

### Issue: Statistics wrong

**Check:**
1. Total Invoices = `myInvoices.length`
2. Active = `pending + funded`
3. Settled = `repaid + defaulted`
4. Total Financed = sum of financed/repaid amounts
5. Pending Amount = sum of active invoice amounts

---

## 📊 Expected Console Output Examples

### Healthy State (User with 3 invoices)
```
📋 Fetching My Invoices (Business Dashboard)
  Issuer Address: 0xabc123...
  Package ID: 0x4d3f0e...
  Total InvoiceCreated events found: 15
  Events for this issuer: 3
  Invoice IDs: ["0x111...", "0x222...", "0x333..."]
  Successfully fetched objects: 3
  Parsed invoices: 3
  Status breakdown: { 
    pending: 1, 
    funded: 1, 
    repaid: 1, 
    defaulted: 0 
  }
```

**Expected UI:**
- Active Invoices (2) - Shows 1 Listed + 1 Financed
- Settled (1) - Shows 1 Settled
- Total Invoices: 3
- Total Financed: [amount from 2 invoices]

### New User (No invoices)
```
📋 Fetching My Invoices (Business Dashboard)
  Issuer Address: 0xdef456...
  Package ID: 0x4d3f0e...
  Total InvoiceCreated events found: 15
  Events for this issuer: 0
  Invoice IDs: []
  Successfully fetched objects: 0
  Parsed invoices: 0
  Status breakdown: { 
    pending: 0, 
    funded: 0, 
    repaid: 0, 
    defaulted: 0 
  }
```

**Expected UI:**
- Active Invoices (0) - Empty state with "Create Invoice" CTA
- Settled (0) - Empty state
- All statistics show 0

---

## ✅ Success Criteria

The fix is working correctly if:

1. ✅ **Console logs appear** and show invoice fetching process
2. ✅ **All user's invoices show up** (regardless of financing status)
3. ✅ **Active tab shows PENDING + FUNDED** invoices only
4. ✅ **Settled tab shows REPAID** invoices only
5. ✅ **Badges match status** (Listed/Financed/Settled)
6. ✅ **Statistics calculate correctly** from all invoice data
7. ✅ **Invoices don't disappear** when financed or settled
8. ✅ **Tab counts match** number of visible cards
9. ✅ **Real-time updates** work (10s refetch interval)
10. ✅ **Empty states show** when no invoices in category

---

## 🎯 Key Differences vs Before

### Before (Broken)
- ❌ Used `getOwnedObjects()` - only showed owned invoices
- ❌ Invoices disappeared when financed (ownership changed)
- ❌ No debug logging
- ❌ Only worked with legacy contract fields

### After (Fixed)
- ✅ Uses `queryEvents()` - shows all created invoices
- ✅ Invoices persist through entire lifecycle
- ✅ Comprehensive debug logging
- ✅ Supports both legacy and new contract fields
- ✅ Follows Sui best practices (event-based indexing)

---

**Testing Status:** Ready for verification  
**Expected Result:** All tabs show correct invoices at all times  
**Debugging:** Console logs provide detailed information


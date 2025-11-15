# Fee Calculator - Simple Explanation

## How Fees Work in Invoice Financing

### Example: 100 SUI Invoice, 2% Discount, 60 Days

---

## AT FINANCING (What Happens Immediately)

### Investor Action:
- **Investor sends:** 100 SUI

### Platform Calculates:
1. **Discount (investor's profit margin):** 100 × 2% = 2 SUI
2. **Platform origination fee:** 100 × 1% = 1 SUI
3. **Supplier receives:** 100 - 2 - 1 = **97 SUI**

### Money Flow:
```
Investor (100 SUI)
    │
    ├─→ Platform Treasury: 1 SUI (origination fee)
    └─→ Supplier: 97 SUI (immediate liquidity)
```

---

## AT SETTLEMENT (When Buyer Pays - 60 Days Later)

### Buyer Action:
- **Buyer pays:** 100 SUI (full face value)

### Platform Calculates:
1. **Discount that investor earned:** 2 SUI (from financing)
2. **Platform take-rate (10% of discount):** 2 × 10% = 0.20 SUI
3. **Platform settlement fee:** 0.01 SUI (flat)
4. **Investor receives:** 100 - 0.20 - 0.01 = **99.79 SUI**

### Money Flow:
```
Buyer (100 SUI)
    │
    ├─→ Platform Treasury: 0.21 SUI (take-rate + settlement)
    └─→ Investor: 99.79 SUI
```

---

## INVESTOR MATH (Simplified)

```
Initial Investment:    100.00 SUI (paid at financing)
Received at Settlement: 99.79 SUI (60 days later)
────────────────────────────────────────
LOSS:                   -0.21 SUI
```

**Wait, this is a LOSS?**

### The Issue:

In the current implementation, the investor pays the **full invoice amount** (100 SUI) but the supplier only receives 97 SUI. The 2 SUI discount is "lost" in the calculation.

---

## CORRECTED MODEL (Recommended)

### At Financing:

**Investor should pay:** 100 - 2 = **98 SUI** (invoice amount minus their discount)

Then:
- Platform fee: 98 × 1% = 0.98 SUI
- Supplier receives: 98 - 0.98 = **97.02 SUI**

### At Settlement:

**Buyer pays:** 100 SUI
- Take-rate: 2 × 10% = 0.20 SUI
- Settlement: 0.01 SUI
- **Investor receives:** 100 - 0.20 - 0.01 = **99.79 SUI**

### Investor Math (Corrected):
```
Initial Investment:     98.00 SUI
Received at Settlement: 99.79 SUI
────────────────────────────────────
PROFIT:                  1.79 SUI
ROI:                     1.83%
APY:                    11.1%
```

---

## PLATFORM REVENUE

### Total Platform Fees:
```
Origination Fee:        0.98 SUI (at financing)
Take-Rate:              0.20 SUI (at settlement)
Settlement Fee:         0.01 SUI (at settlement)
────────────────────────────────────
Total Platform Revenue: 1.19 SUI per invoice
```

---

## RECOMMENDED FIX

Update the smart contract so investor pays:
```move
// Current (incorrect):
let investor_pays = invoice.amount; // 100 SUI

// Should be:
let investor_pays = invoice.amount - discount_amount; // 98 SUI
```

Or update the frontend calculation to show the correct investment amount.

---

## ALTERNATIVE: Keep Current Model, Adjust Discount

If you want to keep the current implementation where investor pays full amount:

**Don't call it a "discount" - call it investor's expected return:**

```
Investor pays:          100 SUI
Expected return:          2 SUI (2% for 60 days)
Platform fees:            0.21 SUI
Net return:               1.79 SUI
APY:                     10.9%
```

But the supplier still receives 97 SUI, which means they're paying:
- 2 SUI (discount)
- 1 SUI (platform fee)
- **Total cost: 3% of invoice value**

This makes it less attractive than the business model suggests (1-2% target).

---

## RECOMMENDATION

**Option 1: Fix the Smart Contract** (Preferred)
- Change `finance_invoice` so investor pays `amount - discount`
- Keep all fee calculations the same
- Results in profitable returns for investors

**Option 2: Adjust Frontend Display**
- Show investor they're paying full amount
- Call the 2% the "expected return" not "discount"
- Make it clear supplier pays both discount AND platform fee

**Option 3: Reduce Platform Fees**
- Keep current model
- Reduce origination fee to 0.5%
- Reduce take-rate to 5%
- This would make returns positive

---

## CURRENT vs RECOMMENDED

### Current Implementation:
```
Invoice: 100 SUI, 2% discount
Investor pays: 100 SUI → Gets back: 99.79 SUI → LOSS: -0.21 SUI ❌
Supplier gets: 97 SUI → Cost: 3% ❌
```

### Recommended Fix:
```
Invoice: 100 SUI, 2% discount
Investor pays: 98 SUI → Gets back: 99.79 SUI → PROFIT: 1.79 SUI ✅
Supplier gets: 97 SUI → Cost: 3% (but knows upfront) ✅
```

---

**Which approach would you like to implement?**

1. Fix smart contract (investor pays discounted amount)
2. Adjust UI messaging (be clear about costs)
3. Reduce platform fees (make current model profitable)

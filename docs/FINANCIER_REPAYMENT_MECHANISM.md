# How Financiers Get Repaid: Complete Explanation

## Executive Summary

The financier (investor) gets repaid through an **on-chain settlement mechanism** triggered by an **oracle-verified payment confirmation**. When the buyer pays the invoice off-chain, an oracle service deposits funds into a `SettlementEscrow` smart contract, which then automatically distributes the **full face value** to the financier, ensuring they receive both their principal **and** their profit (the discount).

---

## The Complete Payment Flow

### Step 1: Financier Purchases Invoice (Financing)

**What happens:**
- Financier sees an invoice on the marketplace (face value: $10,000, discount: 3.2%)
- Financier calculates purchase price: `$10,000 × (100% - 3.2%) = $9,680`
- Financier clicks "Buy" and pays **$9,680** to the supplier

**On-chain transaction (`accept_finance`):**
```move
// Financier transfers purchase_price to supplier
let purchase_price = compute_purchase_price(face_value, discount_bps);
// $9,680 transferred to supplier immediately

// Invoice object updated
invoice.status = STATUS_FINANCED;
invoice.financier = option::some(financier_address);
invoice.financed_at = option::some(current_timestamp);
```

**Result:**
- ✅ Supplier receives **$9,680** immediately (early payment)
- ✅ Financier now owns the right to collect **$10,000** from buyer
- ✅ Financier's expected profit: **$320** (3.2% return)

---

### Step 2: Buyer Pays Invoice (Off-Chain)

**Real-world scenario:**
```
Days/weeks later...
Buyer (ACME Corp) pays $10,000 to supplier's bank account
```

**Critical point:** This happens **outside the blockchain**:
- Traditional bank transfer
- Wire transfer
- ACH payment
- Payment gateway (Stripe, etc.)

**Problem:** The blockchain doesn't know this payment happened!

---

### Step 3: Oracle Verifies Payment

**The Oracle's Role:**
The oracle is a trusted service that monitors off-chain payment systems and reports verified payments to the blockchain.

**How it works:**

1. **Payment Detection:**
   - Oracle monitors supplier's bank account (via banking API)
   - OR: Supplier uploads payment proof (bank statement)
   - OR: Payment gateway webhook notifies oracle

2. **Verification:**
   ```typescript
   // Oracle backend checks:
   - Payment amount matches invoice face_value ($10,000)
   - Payment reference includes invoice ID
   - Payment from correct buyer
   - Payment to correct supplier account
   ```

3. **Oracle Signs Attestation:**
   ```typescript
   const attestation = {
     type: "PAYMENT_CONFIRMED",
     invoice_id: "0x123...",
     amount: 10000,
     paid_at: 1731628800,
     nonce: "unique_random_123"
   };
   
   const signature = signWithOracleKey(attestation);
   ```

---

### Step 4: Oracle Deposits Funds On-Chain

**Transaction: `deposit_payment`**

```move
public entry fun deposit_payment<CoinType>(
    registry: &OracleRegistry,
    invoice: &Invoice<CoinType>,
    funds: Coin<CoinType>,  // Oracle deposits $10,000
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Only oracle can call this
    must_sender(registry.oracle);
    
    // Create escrow object holding the funds
    let escrow = SettlementEscrow<CoinType> {
        id: object::new(ctx),
        invoice_id: object::id(&invoice.id),
        funds: coin::into_balance(funds),  // $10,000 locked
        depositor: tx::sender(),
        created_at: Clock::timestamp_ms(clock) / 1000,
    };
    
    event::emit(PaymentDeposited<CoinType> {
        invoice_id: escrow.invoice_id,
        amount: 10000,
        depositor: registry.oracle,
    });
    
    // Oracle keeps custody until confirm
    transfer::transfer(escrow, registry.oracle);
}
```

**What just happened:**
- Oracle converted off-chain $10,000 to on-chain coins (MockUSD or SUI)
- Funds locked in `SettlementEscrow` smart contract
- Escrow owned by oracle (temporary custody)

---

### Step 5: Settlement Executed (Financier Gets Paid)

**Transaction: `confirm_payment`**

```move
public entry fun confirm_payment<CoinType>(
    registry: &OracleRegistry,
    invoice: &mut Invoice<CoinType>,
    mut escrow: SettlementEscrow<CoinType>,
    clock: &Clock
) {
    // Only oracle can confirm
    must_sender(registry.oracle);
    
    // Check invoice is financed (not disputed)
    assert!(invoice.status == STATUS_FINANCED, EWrongStatus);
    assert!(invoice.status != STATUS_DISPUTED, EWrongStatus);
    
    // Get financier address from invoice
    let financier = option::borrow(&invoice.financier)[0];
    
    // Calculate payout (should be full face_value)
    let available = balance::value(&escrow.funds);
    let payout = if (available >= invoice.face_value) {
        invoice.face_value  // $10,000
    } else {
        available  // Partial payment (rare)
    };
    
    // Split funds: payout to financier, remainder to oracle
    let (to_financier, remainder) = balance::split(&mut escrow.funds, payout);
    
    // Transfer full $10,000 to financier
    let coin_to_financier = coin::from_balance(to_financier);
    transfer::public_transfer(coin_to_financier, financier);
    
    // Mark invoice as PAID
    invoice.status = STATUS_PAID;
    invoice.paid_at = option::some(current_timestamp);
    
    event::emit(SettlementExecuted<CoinType> {
        invoice_id: object::id(&invoice.id),
        to: financier,
        amount: payout,  // $10,000
    });
    
    // Destroy escrow object (empty now)
    destroy_escrow(escrow);
}
```

**Final Result:**
- ✅ Financier receives **$10,000** (face value)
- ✅ Financier's profit realized: **$320** ($10,000 - $9,680)
- ✅ Invoice marked as PAID
- ✅ Transaction complete

---

## Money Flow Diagram

```
TIME: T0 - Invoice Created
┌─────────────┐
│   Supplier  │  Face Value: $10,000
│ (needs cash)│  Discount: 3.2%
└─────────────┘  Due: 30 days

        ↓

TIME: T1 - Financing (Immediate)
┌─────────────┐           ┌─────────────┐
│  Financier  │ ─[$9,680]→ │   Supplier  │
│ (pays 96.8%)│            │ (gets cash) │
└─────────────┘            └─────────────┘
     ↓ owns right to collect $10,000

        ↓

TIME: T30 - Buyer Pays (Off-Chain)
┌─────────────┐            ┌─────────────┐
│    Buyer    │ ─[$10,000]→│   Supplier  │
│ (ACME Corp) │  (bank)    │    Bank     │
└─────────────┘            └─────────────┘

        ↓

TIME: T30+1hr - Oracle Detects & Deposits
┌─────────────┐            ┌─────────────────┐
│   Oracle    │ ─[$10,000]→│ SettlementEscrow│
│   Service   │  (on-chain)│ (smart contract)│
└─────────────┘            └─────────────────┘

        ↓

TIME: T30+1hr - Settlement Executes
┌─────────────────┐            ┌─────────────┐
│ SettlementEscrow│ ─[$10,000]→│  Financier  │
│ (smart contract)│            │   (profit)  │
└─────────────────┘            └─────────────┘

FINANCIER'S RETURN:
Invested: $9,680
Received: $10,000
Profit:   $320 (3.2% return in 30 days)
```

---

## Key Security Mechanisms

### 1. **Dispute Window (Risk Protection)**

```move
// After financing, there's an optional dispute window
if (window > 0) {
    invoice.dispute_until = option::some(now + window);
}

// Settlement can only happen after dispute window expires
public entry fun confirm_payment(...) {
    // Check no active dispute
    assert!(invoice.status != STATUS_DISPUTED, EWrongStatus);
    
    // If someone raises dispute during window, settlement blocked
    // This protects against fraudulent payment confirmations
}
```

**Purpose:** Gives supplier or financier time to challenge oracle's payment confirmation if something is wrong.

---

### 2. **Oracle Authentication**

```move
// Only oracle can deposit and confirm payments
fun must_sender(addr: address) {
    assert!(tx::sender() == addr, ENotAuthorized);
}

public entry fun deposit_payment<CoinType>(
    registry: &OracleRegistry,
    ...
) {
    must_sender(registry.oracle);  // Only oracle address allowed
    ...
}
```

**Production upgrade:** Multi-sig oracle (3-of-5 attestors must agree)

---

### 3. **Replay Protection**

```typescript
// Each oracle signature includes unique nonce
const attestation = {
  invoice_id: "0x123...",
  amount: 10000,
  nonce: "random_unique_456",  // Prevents reuse
  timestamp: 1731628800
};
```

**On-chain check:**
```move
// Track used nonces to prevent replay attacks
struct UsedNonces has key {
    id: UID,
    nonces: vector<vector<u8>>
}

// Before accepting signature, verify nonce not used
assert!(!vector::contains(&used_nonces.nonces, &nonce), EReplayAttack);
```

---

### 4. **State Machine Enforcement**

```
Allowed transitions:
ISSUED → FINANCED → PAID ✅
ISSUED → CANCELED ✅
FINANCED → DISPUTED → PAID ✅

Blocked transitions:
PAID → anything ❌ (final state)
ISSUED → PAID ❌ (must be financed first)
```

---

## Oracle Trust Model

### MVP (Hackathon):
```
┌─────────────────────┐
│  Single Oracle Key  │
│  (centralized)      │
└─────────────────────┘
         ↓
    Signs payment
    confirmations
```

**Risks:**
- ❌ Oracle can sign fake payment confirmations
- ❌ Single point of failure
- ❌ Key compromise = system compromised

**Mitigations:**
- ✅ Dispute window allows challenges
- ✅ Oracle actions logged on-chain (auditable)
- ✅ Rate limiting on oracle calls

---

### Production (Roadmap):

```
┌──────────────┐  ┌───────────────┐  ┌──────────────┐
│ Bank API     │  │Payment Gateway│  │  Audit Node  │
│ Attestor     │  │   Attestor    │  │   Attestor   │
└──────────────┘  └───────────────┘  └──────────────┘
      ↓                  ↓                  ↓
      └──────────────────┴──────────────────┘
                         ↓
              ┌──────────────────────┐
              │   Multi-Sig Oracle   │
              │   (3-of-5 required)  │
              └──────────────────────┘
```

**Benefits:**
- ✅ No single point of failure
- ✅ Requires majority agreement
- ✅ Each attestor checks independently
- ✅ One compromised key ≠ system compromise

---

## What If Buyer Doesn't Pay?

### Scenario: Invoice due date passes, buyer hasn't paid

**Current state:**
```
Invoice status: FINANCED
Financier: Already paid $9,680 to supplier
Buyer: Owes $10,000 (not yet paid)
```

### Option 1: Grace Period
```move
// Check if payment overdue
if (current_time > invoice.due_date + grace_period) {
    // Allow financier to raise dispute
    invoice.status = STATUS_DISPUTED;
}
```

### Option 2: Default Mechanism (Future)
```move
// After timeout, allow financier to claim from insurance pool
public entry fun claim_default_insurance<CoinType>(
    invoice: &Invoice<CoinType>,
    insurance_pool: &mut InsurancePool<CoinType>,
    clock: &Clock
) {
    assert!(current_time > due_date + 30_days, ETooEarly);
    assert!(invoice.status == FINANCED, EWrongStatus);
    
    // Pay financier from insurance pool (partial recovery)
    let recovery_amount = (face_value * 80) / 100;  // 80% recovery
    transfer_from_pool(insurance_pool, financier, recovery_amount);
    
    invoice.status = STATUS_DEFAULTED;
}
```

### Option 3: Off-Chain Collection
- Supplier responsible for collecting from buyer
- If supplier can't collect, it's their problem (they already got paid)
- Legal contracts off-chain enforce buyer's obligation

---

## Comparison: Traditional vs On-Chain

### Traditional Invoice Factoring

```
Day 0:   Factor pays supplier 97% ($9,700)
Day 30:  Buyer pays factor 100% ($10,000)
Result:  Factor profit: $300
Time:    Manual verification, 3-5 days settlement
Risk:    Factor trusts supplier's invoice authenticity
```

### On-Chain Invoice Financing

```
Day 0:   Financier pays supplier 96.8% ($9,680)
Day 30:  Buyer pays (off-chain)
Day 30:  Oracle verifies + deposits $10,000 on-chain
Day 30:  Smart contract auto-pays financier $10,000
Result:  Financier profit: $320
Time:    Instant settlement (< 1 minute after verification)
Risk:    Cryptographic attestations + dispute mechanism
```

**Advantages:**
- ✅ **Instant settlement** (vs days)
- ✅ **Transparent pricing** (discount visible on-chain)
- ✅ **Auditable trail** (all transactions public)
- ✅ **No trust in counterparty** (smart contract enforces)
- ✅ **Composable** (can integrate with DeFi)

---

## Detailed Code Example

### Complete Settlement Flow (TypeScript + Move)

```typescript
// 1. Financier purchases invoice
async function purchaseInvoice(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  const purchasePrice = calculatePurchasePrice(
    invoice.face_value,
    invoice.discount_bps
  );
  
  // Build transaction
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice_finance::accept_finance`,
    arguments: [
      tx.object(invoiceId),              // invoice
      tx.object(financierCoinId),        // payment coin
      tx.object(CLOCK_ID),               // clock
      tx.object(ORACLE_REGISTRY_ID),     // registry
    ],
    typeArguments: [COIN_TYPE],
  });
  
  await signAndExecute(tx);
  console.log("✅ Financed invoice, paid:", purchasePrice);
}

// 2. Oracle detects payment (runs server-side)
async function detectPayment(invoiceId: string) {
  // Check bank API
  const payment = await checkBankPayment(invoiceId);
  
  if (payment.status === "completed") {
    // Generate attestation
    const attestation = {
      invoice_id: invoiceId,
      amount: payment.amount,
      paid_at: Date.now() / 1000,
      nonce: crypto.randomUUID(),
    };
    
    // Sign with oracle key
    const signature = await signAttestation(attestation);
    
    // Deposit funds on-chain
    await depositPayment(invoiceId, payment.amount, signature);
  }
}

// 3. Oracle deposits funds
async function depositPayment(
  invoiceId: string,
  amount: number,
  signature: string
) {
  const tx = new Transaction();
  
  // Oracle mints/transfers coins equivalent to off-chain payment
  const coin = tx.moveCall({
    target: `${COIN_PACKAGE}::mock_usd::mint`,
    arguments: [tx.object(TREASURY_CAP), tx.pure.u64(amount)],
  });
  
  // Deposit into escrow
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice_finance::deposit_payment`,
    arguments: [
      tx.object(ORACLE_REGISTRY_ID),
      tx.object(invoiceId),
      coin,
      tx.object(CLOCK_ID),
    ],
    typeArguments: [COIN_TYPE],
  });
  
  await signAndExecute(tx);
  console.log("✅ Deposited payment to escrow:", amount);
}

// 4. Oracle confirms and settles
async function confirmPayment(invoiceId: string, escrowId: string) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice_finance::confirm_payment`,
    arguments: [
      tx.object(ORACLE_REGISTRY_ID),
      tx.object(invoiceId),
      tx.object(escrowId),
      tx.object(CLOCK_ID),
    ],
    typeArguments: [COIN_TYPE],
  });
  
  await signAndExecute(tx);
  console.log("✅ Settlement executed, financier paid");
}
```

---

## Summary: How Financiers Get Repaid

1. **Financier pays discounted amount** → Supplier gets immediate cash
2. **Buyer pays full amount off-chain** → Traditional payment rails
3. **Oracle verifies payment** → Checks bank/payment gateway
4. **Oracle deposits on-chain** → Converts to blockchain tokens
5. **Smart contract settles** → Automatically pays financier face value
6. **Financier realizes profit** → Receives more than they paid

**Key Innovation:** The smart contract acts as an **automated escrow agent** that:
- ✅ Can't be corrupted (code is law)
- ✅ Settles instantly (no manual processing)
- ✅ Is transparent (all transactions public)
- ✅ Requires no trust (cryptographic verification)

---

## Risk Management

### For Financiers

**Risks:**
1. ❌ Buyer defaults (doesn't pay)
2. ❌ Oracle malfunction/corruption
3. ❌ Fake invoice (supplier fraud)

**Protections:**
1. ✅ Credit scoring (check buyer history)
2. ✅ Insurance pool (partial recovery)
3. ✅ Dispute mechanism (challenge false claims)
4. ✅ KYC verification (know supplier identity)
5. ✅ Diversification (invest in many small invoices)

### For Suppliers

**Risks:**
1. ❌ Can't find financier (no liquidity)
2. ❌ High discount rates (expensive financing)

**Protections:**
1. ✅ Competitive marketplace (multiple bids)
2. ✅ Transparent pricing (see market rates)
3. ✅ Reputation system (better rates over time)

---

## Conclusion

The **financier repayment mechanism** is elegant because it:

1. **Bridges off-chain and on-chain worlds**
   - Real payments happen via traditional rails
   - Settlement happens on blockchain

2. **Automates trust**
   - No need to trust supplier or buyer
   - Smart contract enforces payment

3. **Provides instant liquidity**
   - Suppliers get cash immediately
   - Financiers get guaranteed repayment

4. **Is auditable and transparent**
   - All transactions on-chain
   - Dispute mechanisms for safety

The key is the **oracle** acting as a **verified bridge** between the traditional payment system and the blockchain, with the **smart contract** ensuring automatic, trustless settlement to the financier.

# Smart Contract Quick Reference Guide

**Quick lookup for developers integrating with the On-Chain Invoice Financing smart contract**

---

## 📦 Package Information

```bash
PACKAGE_ID=0x...              # Your deployed package ID
TREASURY_ID=0x...             # Shared Treasury object
INVOICE_FACTORY_ID=0x...      # Shared InvoiceFactory object
```

See `/docs/DEPLOYMENT_INFO.md` for current addresses.

---

## 🎯 Key Objects

| Object | Type | Description |
|--------|------|-------------|
| `Invoice` | Shared | Main invoice object with all data |
| `BuyerEscrow` | Shared | Buyer's collateral deposit |
| `Funding` | Shared | Proof of investor financing |
| `SupplierCap` | Owned | Capability to issue invoices |
| `Treasury` | Shared | Protocol fee collection |

---

## 🔢 Status Codes

```typescript
0 = Created   // Invoice issued, awaiting escrow
1 = Ready     // Escrow paid, available for financing
2 = Financed  // Investor has funded
3 = Paid      // Fully settled
4 = Defaulted // Payment overdue (future)
```

---

## 💰 Financial Calculations

### Amount Conversions

```typescript
// SUI to MIST
const amountInMist = suiAmount * 1_000_000_000;

// MIST to SUI
const suiAmount = mistAmount / 1_000_000_000;
```

### Purchase Price

```typescript
const discountAmount = (amount * discount_bps) / 10_000;
const purchasePrice = amount - discountAmount;
```

### Repayment Amount

```typescript
const repaymentAmount = amount + discountAmount;
```

### APY Calculation

```typescript
const daysToMaturity = (dueDate - now) / (1000 * 60 * 60 * 24);
const apy = (discountAmount / purchasePrice) * (365 / daysToMaturity) * 100;
```

---

## 📝 Contract Calls

### 1. Register Supplier

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::registry::register_supplier`,
  arguments: [],
});
```

**Returns**: `SupplierCap` object (save the ID!)

---

### 2. Issue Invoice

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::invoice_factory::issue_invoice`,
  arguments: [
    tx.pure(buyerAddress, 'address'),
    tx.pure(amountInMist, 'u64'),
    tx.pure(dueDateMs, 'u64'),
    tx.pure(metadataBytes, 'vector<u8>'),
    tx.pure(escrowBps, 'u64'),      // e.g., 1000 = 10%
    tx.pure(discountBps, 'u64'),    // e.g., 320 = 3.2%
    tx.pure(feeBps, 'u64'),         // e.g., 50 = 0.5%
    tx.object(supplierCapId),
  ],
});
```

**Creates**: `Invoice` + `BuyerEscrow` objects  
**Event**: `InvoiceCreated`

---

### 3. Pay Escrow (Buyer)

```typescript
const [coin] = tx.splitCoins(tx.gas, [tx.pure(escrowAmount)]);

tx.moveCall({
  target: `${PACKAGE_ID}::escrow::pay_escrow`,
  arguments: [
    tx.object(invoiceId),
    tx.object(escrowId),
    coin,
  ],
});
```

**Effect**: Invoice status → `1` (Ready)

---

### 4. Finance Invoice (Investor)

```typescript
const [coin] = tx.splitCoins(tx.gas, [tx.pure(purchasePrice)]);

tx.moveCall({
  target: `${PACKAGE_ID}::invoice_financing::fund_invoice`,
  arguments: [
    tx.object(invoiceId),
    tx.object(escrowId),
    coin,
  ],
});
```

**Creates**: `Funding` object  
**Effect**: Invoice status → `2` (Financed)

---

### 5. Pay Invoice (Buyer)

```typescript
const [coin] = tx.splitCoins(tx.gas, [tx.pure(totalAmount)]);

tx.moveCall({
  target: `${PACKAGE_ID}::pay_invoice::pay_invoice`,
  arguments: [
    tx.object(invoiceId),
    tx.object(escrowId),
    coin,
  ],
});
```

**Effect**: Invoice status → `3` (Paid)

---

## 🔍 Query Functions

### Get Invoice Details

```typescript
const invoice = await suiClient.getObject({
  id: invoiceId,
  options: { showContent: true }
});

const fields = invoice.data?.content?.fields;
// Access: fields.amount, fields.status, fields.buyer, etc.
```

### List Available Invoices

```typescript
const response = await suiClient.queryObjects({
  filter: {
    StructType: `${PACKAGE_ID}::invoice::Invoice`,
  },
  options: { showContent: true }
});

// Filter by status
const ready = response.data.filter(obj => 
  obj.data?.content?.fields?.status === 1
);
```

### Get Escrow Amount

```typescript
const escrow = await suiClient.getObject({
  id: escrowId,
  options: { showContent: true }
});

const escrowAmount = escrow.data?.content?.fields?.escrow_amount;
const isPaid = escrow.data?.content?.fields?.paid;
```

---

## 🎪 Events

### Subscribe to Events

```typescript
await suiClient.subscribeEvent({
  filter: {
    MoveModule: {
      package: PACKAGE_ID,
      module: 'invoice_factory'
    }
  },
  onMessage(event) {
    if (event.type.endsWith('::InvoiceCreated')) {
      console.log('New invoice:', event.parsedJson);
    }
  }
});
```

### Event Types

- `InvoiceCreated` - New invoice issued
  ```typescript
  { invoice_id, supplier, buyer, amount }
  ```

---

## ⚠️ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `E_WRONG_PAYMENT_AMOUNT` | Incorrect coin amount | Calculate exact amount needed |
| `E_ESCROW_NOT_PAID` | Trying to fund before escrow | Buyer must pay escrow first |
| `E_INVOICE_NOT_READY_FOR_FUNDING` | Status != 1 | Check invoice status |
| `E_NOT_BUYER` | Wrong address | Must be invoice buyer |
| `E_NOT_FUNDER` | Wrong address | Must be original funder |
| `E_ALREADY_PAID_OR_DEFAULTED` | Status 3 or 4 | Invoice already completed |

---

## 🧮 Example Calculations

### Invoice: 100 SUI, 3.2% discount, 0.5% fee

```typescript
// Constants
const faceValue = 100_000_000_000n;  // 100 SUI in MIST
const discountBps = 320;              // 3.2%
const feeBps = 50;                    // 0.5%
const escrowBps = 1000;               // 10%

// Calculations
const discountAmount = (faceValue * 320n) / 10_000n;
// = 3,200,000,000 MIST (3.2 SUI)

const purchasePrice = faceValue - discountAmount;
// = 96,800,000,000 MIST (96.8 SUI)

const escrowAmount = (faceValue * 1000n) / 10_000n;
// = 10,000,000,000 MIST (10 SUI)

const totalRepayment = faceValue + discountAmount;
// = 103,200,000,000 MIST (103.2 SUI)

// What each party pays/receives:
// Buyer pays escrow: 10 SUI
// Investor pays: 96.8 SUI → Supplier receives: 96.8 SUI
// Buyer repays: 103.2 SUI → Supplier: 100 SUI, Investor: 3.2 SUI
// Investor profit: 3.2 SUI - 0.5% fee = ~3.184 SUI
```

---

## 🧪 Testing Workflow

### Complete Test Flow

```bash
# 1. Get testnet SUI
sui client faucet

# 2. Register as supplier
sui client call \
  --package $PACKAGE_ID \
  --module registry \
  --function register_supplier \
  --gas-budget 10000000

# Save SupplierCap ID from output

# 3. Issue invoice
sui client call \
  --package $PACKAGE_ID \
  --module invoice_factory \
  --function issue_invoice \
  --args $BUYER_ADDRESS 100000000000 1735689600000 "[...]" 1000 320 50 $SUPPLIER_CAP_ID \
  --gas-budget 20000000

# Save Invoice ID and BuyerEscrow ID from output

# 4. Pay escrow (as buyer)
sui client call \
  --package $PACKAGE_ID \
  --module escrow \
  --function pay_escrow \
  --args $INVOICE_ID $ESCROW_ID [COIN] \
  --gas-budget 10000000

# 5. Finance invoice (as investor)
sui client call \
  --package $PACKAGE_ID \
  --module invoice_financing \
  --function fund_invoice \
  --args $INVOICE_ID $ESCROW_ID [COIN] \
  --gas-budget 15000000

# 6. Pay invoice (as buyer)
sui client call \
  --package $PACKAGE_ID \
  --module pay_invoice \
  --function pay_invoice \
  --args $INVOICE_ID $ESCROW_ID [COIN] \
  --gas-budget 15000000
```

---

## 📚 Type Definitions

### TypeScript Types

```typescript
export interface Invoice {
  id: string;
  buyer: string;
  supplier: string;
  amount: bigint;
  due_date: number;           // milliseconds
  companies_info: string;
  status: 0 | 1 | 2 | 3 | 4;
  escrow_bps: number;
  discount_bps: number;
  fee_bps: number;
  investor?: string;
}

export interface BuyerEscrow {
  id: string;
  invoice_id: string;
  buyer: string;
  escrow_amount: bigint;
  paid: boolean;
}

export interface Funding {
  id: string;
  invoice_id: string;
  funder: string;
}
```

---

## 🔗 Related Documentation

- **Full Documentation**: `/docs/SMART_CONTRACT_DOCUMENTATION.md`
- **Architecture**: `/docs/architecture/technical-architecture.md`
- **API Documentation**: `/docs/architecture/API_DOCUMENTATION.md`
- **Deployment Info**: `/docs/DEPLOYMENT_INFO.md`

---

## 💡 Tips

### Gas Optimization
- Batch read operations when possible
- Use `showContent: true` only when needed
- Cache frequently accessed data

### Error Handling
```typescript
try {
  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  // Success
} catch (error) {
  if (error.message.includes('E_WRONG_PAYMENT_AMOUNT')) {
    // Handle specific error
  }
}
```

### Amount Precision
```typescript
// Always use BigInt for amounts
const amount = BigInt(100_000_000_000);

// Format for display
const displayAmount = (amount / 1_000_000_000n).toString() + ' SUI';
```

---

## 🆘 Support

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check `/docs/` folder
- **Examples**: See `/dapp/` for complete integration examples

---

**Last Updated**: November 15, 2025  
**Version**: 1.0

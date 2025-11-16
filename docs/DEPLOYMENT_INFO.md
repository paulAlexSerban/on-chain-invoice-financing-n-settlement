# Invoice Financing Deployment Information

**Deployment Date:** 2025-11-15
**Network:** Sui Testnet
**Transaction Digest:** `Fd6jF2CgLYExPkxDXH64oDgradt7rfXqP7nA93C4ccnH`

---

## Deployed Contract Information

### Package ID
```
0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4
```

### Platform Object ID (Shared Object)
```
0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
```

### UpgradeCap Object ID
```
0x9a7d4460f5c5703b040de82e0bbd103006cffb912f3b1ed0aa127182af0b1a37
```
**Owner:** `0x3e5e7fbba513bfe17858488bcdb8e80b729f291dbf79be1ef3b71b96111d6ee1`

---

## Platform Configuration (Default)

The Platform object was initialized with these default fees:

- **Origination Fee:** 100 basis points (1%)
- **Take-Rate:** 1000 basis points (10% of investor's discount)
- **Settlement Fee:** 10,000,000 MIST (0.01 SUI)
- **Admin:** `0x3e5e7fbba513bfe17858488bcdb8e80b729f291dbf79be1ef3b71b96111d6ee1`
- **Treasury:** `0x3e5e7fbba513bfe17858488bcdb8e80b729f291dbf79be1ef3b71b96111d6ee1`

---

## Explorer Links

### Package
- **Testnet:** https://testnet.suivision.xyz/package/0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4
- **SuiScan:** https://suiscan.xyz/testnet/object/0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4

### Platform Object (Shared)
- **Testnet:** https://testnet.suivision.xyz/object/0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
- **SuiScan:** https://suiscan.xyz/testnet/object/0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb

### Transaction
- **Testnet:** https://testnet.suivision.xyz/txblock/Fd6jF2CgLYExPkxDXH64oDgradt7rfXqP7nA93C4ccnH
- **SuiScan:** https://suiscan.xyz/testnet/tx/Fd6jF2CgLYExPkxDXH64oDgradt7rfXqP7nA93C4ccnH

---

## Environment Variables

The following variables have been configured in `dapp/.env`:

```bash
NEXT_PUBLIC_CONTRACT_ID=0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4
NEXT_PUBLIC_PLATFORM_ID=0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
NEXT_PUBLIC_NETWORK=testnet
```

---

## Gas Costs

- **Storage Cost:** 32,155,600 MIST (0.0321556 SUI)
- **Computation Cost:** 1,000,000 MIST (0.001 SUI)
- **Storage Rebate:** 978,120 MIST (0.00097812 SUI)
- **Total Cost:** 32,177,480 MIST (0.03217748 SUI)

---

## Module Functions

### Public Entry Functions

1. **`create_invoice`**
   - Creates a new invoice on-chain
   - Parameters: invoice_number, buyer, amount, due_date, description, clock
   - Returns: Invoice object (transferred to creator)

2. **`finance_invoice`**
   - Finances an invoice with discount and fee collection
   - Parameters: platform, invoice, payment, discount_rate_bps
   - Fee Distribution:
     - Origination fee → Platform treasury
     - Supplier amount → Invoice issuer
     - Overpayment refund → Investor

3. **`repay_invoice`**
   - Repays a financed invoice
   - Parameters: platform, invoice, payment
   - Fee Distribution:
     - Take-rate + settlement fee → Platform treasury
     - Net amount → Investor

### View Functions

- `get_amount(invoice)` - Get invoice amount
- `get_issuer(invoice)` - Get issuer address
- `get_status(invoice)` - Get invoice status
- `get_due_date(invoice)` - Get due date
- `is_funded(invoice)` - Check if funded
- `is_repaid(invoice)` - Check if repaid
- `get_financed_amount(invoice)` - Get investor paid amount
- `get_investor_paid(invoice)` - Get investor paid amount
- `get_supplier_received(invoice)` - Get supplier received amount
- `get_origination_fee_collected(invoice)` - Get origination fee
- `get_discount_rate_bps(invoice)` - Get discount rate
- `get_origination_fee_bps(platform)` - Get platform origination fee rate
- `get_take_rate_bps(platform)` - Get platform take-rate
- `get_settlement_fee(platform)` - Get settlement fee
- `get_platform_treasury(platform)` - Get treasury address

### Admin Functions (Requires Admin Privileges)

- `update_platform_fees(platform, origination_fee_bps, take_rate_bps, settlement_fee)`
- `update_treasury(platform, new_treasury)`
- `transfer_admin(platform, new_admin)`

---

## Events Emitted

### InvoiceCreated
```move
public struct InvoiceCreated has copy, drop {
    invoice_id: ID,
    issuer: address,
    amount: u64,
    due_date: u64,
    invoice_number: vector<u8>,
}
```

### InvoiceFunded
```move
public struct InvoiceFunded has copy, drop {
    invoice_id: ID,
    investor: address,
    investor_paid: u64,
    supplier_received: u64,
    origination_fee: u64,
    discount_rate_bps: u64,
}
```

### InvoiceRepaid
```move
public struct InvoiceRepaid has copy, drop {
    invoice_id: ID,
    amount_paid: u64,
    investor_received: u64,
    platform_take_rate_fee: u64,
    settlement_fee: u64,
}
```

### FeesCollected
```move
public struct FeesCollected has copy, drop {
    invoice_id: ID,
    origination_fee: u64,
    take_rate_fee: u64,
    settlement_fee: u64,
    total_fees: u64,
}
```

---

## Testing the Deployment

### 1. Start the Frontend
```bash
cd dapp
npm install  # if needed
npm run dev
```

### 2. Connect Wallet
- Open http://localhost:3000
- Connect your Sui wallet (must be on testnet)
- Ensure you have testnet SUI (get from faucet if needed)

### 3. Create an Invoice (Business)
- Navigate to `/dashboard/business`
- Fill in invoice details
- Click "Create Invoice"
- Wait for blockchain confirmation

### 4. Finance an Invoice (Investor)
- Navigate to `/marketplace`
- Find pending invoices
- Click "Finance Invoice"
- Adjust discount rate (e.g., 2%)
- Review fee breakdown
- Confirm transaction
- Check treasury received origination fee

### 5. Verify on Explorer
- Copy transaction digest from success message
- Open in explorer to see:
  - Invoice object created/updated
  - Events emitted
  - Fee transfers to treasury

---

## Querying Platform Fees

Using Sui CLI:

```bash
# View platform configuration
sui client object 0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb

# Call view function
sui client call --package 0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4 \
  --module invoice_financing \
  --function get_origination_fee_bps \
  --args 0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
```

---

## Updating Platform Fees (Admin Only)

```bash
sui client call --package 0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4 \
  --module invoice_financing \
  --function update_platform_fees \
  --args \
    0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb \
    150 \
    1200 \
    15000000 \
  --gas-budget 10000000
```

Parameters:
- Platform object ID
- Origination fee: 150 bps (1.5%)
- Take-rate: 1200 bps (12%)
- Settlement fee: 15,000,000 MIST (0.015 SUI)

---

## Monitoring Revenue

### Query All FeesCollected Events

```typescript
import { SuiClient } from '@mysten/sui.js/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

const packageId = '0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4';

const events = await client.queryEvents({
  query: {
    MoveEventType: `${packageId}::invoice_financing::FeesCollected`
  }
});

console.log('Total events:', events.data.length);

// Calculate total revenue
const totalRevenue = events.data.reduce((sum, event) => {
  return sum + BigInt(event.parsedJson.total_fees);
}, BigInt(0));

console.log(`Total Platform Revenue: ${Number(totalRevenue) / 1_000_000_000} SUI`);
```

---

## Troubleshooting

### Frontend Issues

1. **"Package ID not configured" error**
   - Ensure `.env` exists in `dapp/` directory
   - Restart dev server: `npm run dev`

2. **"Platform ID not configured" error**
   - Check `NEXT_PUBLIC_PLATFORM_ID` is set correctly
   - Restart dev server

3. **Transaction fails**
   - Check wallet has enough SUI for gas + invoice amount
   - Verify invoice is in PENDING status
   - Check discount rate is reasonable (1-10%)

### Smart Contract Issues

1. **EInvoiceAlreadyFunded (error code 3)**
   - Invoice has already been financed
   - Check invoice status before financing

2. **EInvalidDiscountRate (error code 6)**
   - Discount rate exceeds 50% (5000 bps)
   - Use a lower discount rate

3. **ENotAuthorized (error code 2)**
   - Only admin can call admin functions
   - Verify transaction sender is admin address

---

## Next Steps

1. ✅ Smart contract deployed
2. ✅ Environment configured
3. ⏳ Test invoice creation
4. ⏳ Test invoice financing with fees
5. ⏳ Test invoice repayment
6. ⏳ Monitor fee collection
7. ⏳ Gather user feedback
8. ⏳ Optimize fee rates based on usage

---

## Support

For issues or questions:
- Smart Contract: See [invoice_financing.move](../contract/invoice_financing/sources/invoice_financing.move)
- Implementation: See [IMPLEMENTATION_FEE_BASED_FINANCING.md](./IMPLEMENTATION_FEE_BASED_FINANCING.md)
- Business Model: See [business-model.md](./business-model.md)

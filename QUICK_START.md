# Quick Start Guide - Invoice Financing with Fees

## 🚀 Deployment Complete!

Your fee-based invoice financing platform is now live on Sui Testnet.

---

## 📦 Key Deployment Info

```bash
Package ID:  0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4
Platform ID: 0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
Network:     Sui Testnet
```

**Explorer:** https://testnet.suivision.xyz/package/0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4

---

## 💰 Fee Structure (Default)

| Fee Type | Who Pays | When | Rate |
|----------|----------|------|------|
| **Origination** | Supplier | At financing | 1.0% of face value |
| **Take-Rate** | Investor | At settlement | 10% of discount earned |
| **Settlement** | Investor | At settlement | 0.01 SUI (flat) |

**Example:** 100 SUI invoice, 2% discount (60 days)
- Investor pays: 100 SUI
- Supplier receives: 97 SUI (100 - 2 discount - 1 fee)
- Platform collects: 1 SUI now, 0.21 SUI at settlement
- Investor profit: ~1.79 SUI (~10.9% APY)

---

## 🎯 Quick Test Flow

### 1. Start Frontend
```bash
cd dapp
npm run dev
```

Open: http://localhost:3000

### 2. Create Invoice (Business)
1. Go to `/dashboard/business`
2. Click "Create New Invoice"
3. Fill details:
   - Invoice #: INV-TEST-001
   - Buyer: Test Corp
   - Amount: 100 SUI
   - Due Date: 60 days from now
   - Description: Test invoice
4. Click "Create Invoice"
5. Wait for confirmation

### 3. Finance Invoice (Investor)
1. Go to `/marketplace`
2. Find your test invoice
3. Click "Finance Invoice"
4. Set discount rate: 2%
5. Review fee breakdown:
   - You pay: 100 SUI
   - Supplier gets: 97 SUI
   - Expected return: ~1.79 SUI
6. Click "Finance for 100 SUI"
7. Confirm in wallet

### 4. Verify Success
Check explorer:
- Invoice status changed to "Funded"
- Platform treasury received 1 SUI (origination fee)
- Supplier received 97 SUI
- Events emitted: `InvoiceFunded`, `FeesCollected`

---

## 📊 Fee Breakdown Example

**Invoice: 100 SUI, Due in 60 days, 2% discount**

### At Financing:
```
Invoice Amount:         100.00 SUI
─────────────────────────────────
Investor Pays:          100.00 SUI

Deductions:
  - Discount (2%):       -2.00 SUI
  - Platform Fee (1%):   -1.00 SUI
─────────────────────────────────
Supplier Receives:       97.00 SUI
Platform Collects:        1.00 SUI
```

### At Settlement (Expected):
```
Buyer Pays:             100.00 SUI
─────────────────────────────────
Deductions:
  - Take-Rate (10% of 2): -0.20 SUI
  - Settlement Fee:       -0.01 SUI
─────────────────────────────────
Investor Receives:       99.79 SUI
Platform Collects:        0.21 SUI

Net Investor Profit:      1.79 SUI
ROI: 1.79% (60 days)
APY: 10.9%
```

---

## 🔧 Common Commands

### View Platform Config
```bash
sui client object 0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb
```

### Update Fees (Admin Only)
```bash
sui client call \
  --package 0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4 \
  --module invoice_financing \
  --function update_platform_fees \
  --args 0x4d937c5a4fff22270da4afc7ba94b1f90e073d0c8629d35703ed547e3aa135cb 150 1200 15000000 \
  --gas-budget 10000000
```

---

## 📚 Documentation

- **Full Implementation:** [docs/IMPLEMENTATION_FEE_BASED_FINANCING.md](docs/IMPLEMENTATION_FEE_BASED_FINANCING.md)
- **Deployment Details:** [docs/DEPLOYMENT_INFO.md](docs/DEPLOYMENT_INFO.md)
- **Business Model:** [docs/business-model.md](docs/business-model.md)
- **Smart Contract:** [contract/invoice_financing/sources/invoice_financing.move](contract/invoice_financing/sources/invoice_financing.move)

---

## 🐛 Troubleshooting

### Transaction Failed?
- ✅ Check wallet has enough SUI (amount + gas)
- ✅ Verify invoice status is "PENDING"
- ✅ Ensure discount rate < 50%
- ✅ Check Platform ID is correct in `.env.local`

### No Invoices Showing?
- ✅ Restart dev server
- ✅ Check Package ID in `.env.local`
- ✅ Create test invoice first
- ✅ Wait 10 seconds for indexing

### Modal Not Opening?
- ✅ Check browser console for errors
- ✅ Verify `FinanceInvoiceModal` is imported
- ✅ Clear browser cache

---

## 🎉 Success Checklist

- [x] Smart contract deployed
- [x] Environment variables configured
- [x] Frontend updated with fee modal
- [x] Documentation created
- [ ] Test invoice creation
- [ ] Test invoice financing
- [ ] Verify fee collection
- [ ] Monitor events on explorer

---

## 🚀 What's Next?

1. **Test the Flow:** Create and finance a test invoice
2. **Monitor Revenue:** Query `FeesCollected` events
3. **Adjust Fees:** Based on market feedback
4. **Add Analytics:** Track total platform revenue
5. **Prepare Mainnet:** Audit, test, deploy

---

## 💡 Tips

- **Start Small:** Test with 1-10 SUI invoices first
- **Watch Fees:** Monitor if your fee rates are competitive
- **Track APY:** Ensure investors get reasonable returns
- **Be Transparent:** Always show full fee breakdown to users
- **Iterate Fast:** Adjust rates based on early usage

---

## 📞 Need Help?

- **Smart Contract Issues:** Check error codes in [invoice_financing.move](contract/invoice_financing/sources/invoice_financing.move)
- **Frontend Issues:** Check browser console and terminal logs
- **Fee Calculations:** See examples in [IMPLEMENTATION_FEE_BASED_FINANCING.md](docs/IMPLEMENTATION_FEE_BASED_FINANCING.md)

---

**Ready to test? Start with Step 1 above! 🚀**

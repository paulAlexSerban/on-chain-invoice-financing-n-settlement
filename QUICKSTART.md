# 🚀 Quick Start Guide: Invoice Creation

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ Sui wallet browser extension (Sui Wallet, Suiet, or Ethos)
- ✅ Testnet SUI tokens for gas fees

## Step-by-Step Setup

### 1. Deploy Smart Contract

```bash
# From project root
cd /home/g/projects/sui_hackathon/new/on-chain-invoice-financing-n-settlement

# Build contract
make build_contract

# Publish to testnet (you'll need SUI in your wallet)
make publish_contract
```

**Copy the Package ID** from the output:
```
[ SUCCESS ] Published package with ID: 0x...
```

### 2. Configure Frontend

```bash
cd dapp

# Create environment file
cp .env.example .env.local

# Edit .env.local and add your Package ID
nano .env.local
```

Add:
```env
NEXT_PUBLIC_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
NEXT_PUBLIC_NETWORK=testnet
```

### 3. Install & Run

```bash
# Install dependencies
yarn install

# Start dev server
yarn dev
```

### 4. Test Invoice Creation

1. Open http://localhost:3000
2. Click "Connect Wallet" → Select your wallet → Approve
3. Go to http://localhost:3000/dashboard/business
4. Fill in the invoice form:
   - Client Name: `TechCorp Inc`
   - Amount: `100` (SUI)
   - Invoice ID: `INV-2024-001`
   - Due Date: Pick a future date
   - Description: `Web development services`
5. Click "Tokenize Invoice"
6. Approve in wallet
7. Success! 🎉

## Troubleshooting

### Wallet not connecting?
See: `WALLET_WORKING.md`

### Need testnet SUI?
1. Join Sui Discord: https://discord.gg/sui
2. Go to #testnet-faucet
3. Type: `!faucet YOUR_ADDRESS`

### Transaction failing?
- Ensure due date is in the future
- Check you have enough SUI for gas (~0.01 SUI)
- Verify you're on testnet network

## File Structure

```
├── contract/invoice_financing/
│   └── sources/invoice_financing.move    ← Smart contract
├── dapp/
│   ├── hooks/useInvoiceContract.ts       ← Blockchain integration
│   ├── components/CreateInvoiceForm.tsx  ← UI form
│   └── .env.local                        ← Configuration
└── INVOICE_IMPLEMENTATION.md             ← Full documentation
```

## What's Next?

- View created invoices
- Implement financing flow
- Add investor dashboard
- Build marketplace

See `INVOICE_IMPLEMENTATION.md` for complete documentation!


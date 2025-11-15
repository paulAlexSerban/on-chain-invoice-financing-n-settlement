# Smart Contract Documentation Index

This folder contains comprehensive documentation for the On-Chain Invoice Financing & Settlement smart contract system.

---

## 📋 Documentation Files

### 1. [SMART_CONTRACT_DOCUMENTATION.md](./SMART_CONTRACT_DOCUMENTATION.md)
**Complete technical reference for developers**

- Full module structure and architecture
- Detailed data structures with field descriptions
- Complete API reference for all entry functions
- View functions and query methods
- Event definitions and indexing guides
- Error codes and troubleshooting
- Integration guides for Frontend and Backend
- Security considerations
- Testing and deployment procedures

**Use this when**: Building integrations, understanding the complete system, debugging issues

---

### 2. [SMART_CONTRACT_QUICK_REFERENCE.md](./SMART_CONTRACT_QUICK_REFERENCE.md)
**Quick lookup guide for common tasks**

- Package and object IDs
- Status codes reference
- Financial calculation formulas
- Code snippets for common operations
- Query examples
- Event subscription patterns
- Error reference table
- Example calculations with real numbers

**Use this when**: Quick lookups, copying code snippets, verifying calculations

---

## 🎯 Quick Navigation

### For Frontend Developers

1. Start with **Quick Reference** for code snippets
2. Reference **Full Documentation** Section 10: "Integration Guide for Frontend"
3. Check `/docs/architecture/API_DOCUMENTATION.md` for backend API endpoints

**Key Files**:
- Transaction building: Quick Reference → "Contract Calls"
- Query methods: Quick Reference → "Query Functions"
- Event handling: Quick Reference → "Events"
- Type definitions: Full Documentation → "Appendix: Complete Type Definitions"

---

### For Backend Developers

1. Review **Full Documentation** Section 11: "Integration Guide for Backend"
2. Study event indexing patterns
3. Reference financial calculation functions

**Key Files**:
- Event indexing: Full Documentation → "Integration Guide for Backend"
- Financial calculations: Quick Reference → "Financial Calculations"
- Database schema: `/docs/architecture/technical-architecture.md` → "Data Architecture"

---

### For Smart Contract Developers

1. Read **Full Documentation** sections 3-6 for architecture
2. Study error codes and security considerations
3. Review testing procedures

**Key Files**:
- Module structure: Full Documentation → "Module Structure"
- Data structures: Full Documentation → "Core Data Structures"
- Security: Full Documentation → "Security Considerations"

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Sui CLI
cargo install --git https://github.com/MystenLabs/sui.git sui

# Install Node.js dependencies
npm install @mysten/sui.js @mysten/dapp-kit
```

### First Steps

1. **Deploy Contract** (if not already deployed)
   ```bash
   cd contract/invoice_financing
   sui move build
   sui client publish --gas-budget 100000000
   ```

2. **Save Package Info**
   ```bash
   export PACKAGE_ID=0x...
   export TREASURY_ID=0x...
   ```

3. **Test Basic Flow**
   - Register as supplier
   - Issue test invoice
   - Query invoice details

---

## 📊 Current Contract State

**Version**: 1.0  
**Status**: MVP Deployed on Testnet  
**Last Updated**: November 15, 2025

### Deployed Objects

See `/docs/DEPLOYMENT_INFO.md` for current addresses:
- Package ID
- Treasury object ID
- InvoiceFactory object ID

### Key Features

✅ **Implemented**:
- Invoice issuance with supplier registration
- Buyer escrow system (collateral)
- Investor financing with discount
- Buyer repayment and settlement
- Treasury fee collection (structure in place)
- Event emission for all state changes

⚠️ **Known Limitations (MVP)**:
- No time-based defaults
- No dispute mechanism
- Fixed to SUI coin (not generic)
- No invoice cancellation
- Treasury fee not collected in pay_invoice

🔮 **Planned Enhancements**:
- Multi-coin support (generic CoinType)
- Dispute resolution system
- Time-based default handling
- Batch operations for gas optimization
- Invoice cancellation functionality

---

## 🔄 Contract Lifecycle

```
1. Supplier Registration
   └─> Issue SupplierCap

2. Invoice Issuance
   └─> Create Invoice + BuyerEscrow
       └─> Status: Created (0)

3. Buyer Pays Escrow
   └─> Update Invoice
       └─> Status: Ready (1)

4. Investor Finances
   └─> Create Funding
   └─> Transfer to Supplier
       └─> Status: Financed (2)

5. Buyer Repays
   └─> Distribute to Supplier + Investor
       └─> Status: Paid (3)

6. Investor Collects
   └─> Optional verification step
```

---

## 💰 Financial Model

### Example: 100 SUI Invoice

| Metric | Value | Formula |
|--------|-------|---------|
| Face Value | 100 SUI | Input |
| Discount Rate | 3.2% | 320 BPS |
| Escrow Rate | 10% | 1000 BPS |
| Protocol Fee | 0.5% | 50 BPS |
| **Buyer Deposits** | 10 SUI | amount × escrow_bps / 10000 |
| **Investor Pays** | 96.8 SUI | amount - discount |
| **Supplier Receives** | 96.8 SUI | Immediate |
| **Buyer Repays** | 103.2 SUI | amount + discount |
| **Investor Returns** | 100 SUI | Face value |
| **Investor Profit** | 3.2 SUI | Discount amount |
| **Protocol Fee** | 0.016 SUI | 0.5% of discount |

---

## 📐 Architecture Alignment

This documentation aligns with:

### `/docs/architecture/technical-architecture.md`
- Section 5: Smart Contract Architecture
- Section 8: Data Architecture
- Section 9: Security Architecture

### `/docs/architecture/API_DOCUMENTATION.md`
- Oracle endpoints for backend
- Invoice query endpoints
- Event structures

### `/docs/architecture/sequence-diagrams.md`
- Complete lifecycle flow
- Invoice issuance process
- Financing flow
- Payment confirmation

### `/docs/architecture/INVOICE_IMPLEMENTATION.md`
- Frontend integration examples
- Transaction building patterns
- Wallet connection flow

---

## 🧪 Testing

### Unit Tests

```bash
cd contract/invoice_financing
sui move test
```

### Integration Tests

See `/dapp/` for complete frontend integration examples:
- `hooks/useInvoiceContract.ts` - Contract interaction hooks
- `components/CreateInvoiceForm.tsx` - Form with validation
- `app/marketplace/page.tsx` - Query and display invoices

---

## 🔐 Security

### Access Control

- **SupplierCap**: Only holders can issue invoices
- **Buyer verification**: Only buyer can pay escrow/invoice
- **Funder verification**: Only funder can collect escrow
- **Treasury owner**: Only owner can withdraw fees

### Validation

All entry functions perform extensive validation:
- Amount checks (> 0, exact matches)
- Status checks (prevent invalid transitions)
- Address verification (buyer, supplier, funder)
- Object ID consistency checks

### Audit Status

⚠️ **Not yet audited** - This is MVP code for hackathon/demo purposes.  
For production use, require professional security audit.

---

## 📞 Support & Contributing

### Reporting Issues

1. Check existing documentation first
2. Search for similar issues
3. Create detailed bug report with:
   - Transaction digest
   - Expected vs actual behavior
   - Environment details

### Documentation Updates

When updating the smart contract:

1. ✅ Update `SMART_CONTRACT_DOCUMENTATION.md` with detailed changes
2. ✅ Update `SMART_CONTRACT_QUICK_REFERENCE.md` with new snippets
3. ✅ Update version numbers and dates
4. ✅ Add migration guide if breaking changes
5. ✅ Update deployment info
6. ✅ Regenerate TypeScript types if needed

---

## 📚 Additional Resources

### Related Documentation

- **Business Model**: `/docs/business-model.md`
- **Deployment Guide**: `/docs/DEPLOYMENT_INFO.md`
- **Frontend Setup**: `/dapp/README.md`
- **Contract Source**: `/contract/invoice_financing/sources/`

### External Resources

- [Sui Move Book](https://move-book.com/)
- [Sui Documentation](https://docs.sui.io/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sui Explorer](https://suiexplorer.com/)

---

## 🎓 Learning Path

### Beginner: Understanding the System

1. Read Quick Reference → Overview
2. Study the lifecycle diagram
3. Review example calculations
4. Try querying deployed invoices

### Intermediate: Building Integrations

1. Set up development environment
2. Follow Quick Reference code snippets
3. Build simple invoice creation UI
4. Add query and display functionality

### Advanced: Extending the Contract

1. Study full module structure
2. Understand security considerations
3. Review Move source code
4. Implement new features with tests

---

## ✅ Checklist for New Developers

- [ ] Read Quick Reference overview
- [ ] Set up Sui CLI and get testnet SUI
- [ ] Deploy or connect to existing package
- [ ] Register as supplier
- [ ] Issue test invoice
- [ ] Query invoice via RPC
- [ ] Subscribe to events
- [ ] Build simple UI integration
- [ ] Review security considerations
- [ ] Read full documentation for deep dive

---

**Last Updated**: November 15, 2025  
**Maintained by**: Development Team  
**Questions?** Check related docs or create an issue

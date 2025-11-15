# 🔧 Module Not Found Fix

## Issue
Frontend error: "No module found with module name invoice_financing"

## Root Cause
The package on-chain may not have the `invoice_financing::invoice_financing` module, or the package ID is incorrect.

## Solution Options

### Option 1: Use Existing Factory Pattern (Recommended)
Update frontend to use the existing `invoice_factory` module:

```typescript
// Use invoice_factory instead
const moveCallTarget = `${packageId}::invoice_factory::issue_invoice`;
```

**Requirements:**
- Need Factory Object ID (shared object)
- Need SupplierCap (register supplier first)
- Different function signature

### Option 2: Republish Contract
Publish the contract with the `invoice_financing` module:

```bash
make publish_contract
```

Then update `.env` with new Package ID.

### Option 3: Verify Package ID
Check if the package ID matches what's deployed:

```bash
# Check current package ID
cat .env | grep PACKAGE_ID

# View on explorer
https://testnet.suivision.xyz/package/YOUR_PACKAGE_ID
```

## Current Module Structure

Your contract has these modules:
- ✅ `invoice_financing::invoice_financing` - Simple create_invoice function
- ✅ `invoice_financing::invoice_factory` - Factory pattern (issue_invoice)
- ✅ `invoice_financing::invoice` - Invoice struct
- ✅ `invoice_financing::financing` - Finance functions
- ✅ `invoice_financing::repayment` - Repay functions
- ✅ `invoice_financing::escrow` - Escrow functions
- ✅ `invoice_financing::registry` - Registry functions

## Quick Fix

1. **Republish the contract** to include all modules:
   ```bash
   make publish_contract
   ```

2. **Update frontend package ID** in `dapp/.env`:
   ```env
   NEXT_PUBLIC_CONTRACT_ID=<new_package_id>
   ```

3. **Restart dev server**:
   ```bash
   cd dapp
   yarn dev
   ```

## Verification

After republishing, verify the module exists:

1. Go to Sui Explorer:
   ```
   https://testnet.suivision.xyz/package/YOUR_PACKAGE_ID
   ```

2. Check "Modules" section - should see:
   - invoice_financing
   - invoice_factory
   - invoice
   - financing
   - repayment
   - escrow
   - registry

## Next Steps

✅ Republish contract with all modules  
✅ Update package ID in frontend  
✅ Test invoice creation  
✅ Verify module appears in explorer  


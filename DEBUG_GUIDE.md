# 🐛 Debug Guide

## Overview

Comprehensive debugging has been added to help you track the invoice creation process step-by-step.

## Debug Features Added

### 1. Console Logging (Browser DevTools)

**Location:** Open browser DevTools (F12) → Console tab

**What You'll See:**

#### Form Submission
```
📝 Form Submission
  Timestamp: 2024-11-15T...
  ✅ Wallet connected, proceeding with submission
  📋 Form Data Collected: { invoiceNumber: "...", buyer: "...", ... }
  💰 Amount (raw): "100"
  💰 Amount (parsed): 100
  📅 Due Date (raw): "2024-12-31"
  📅 Due Date (parsed): Tue Dec 31 2024 ...
  🚀 Calling createInvoice hook...
```

#### Invoice Creation Process
```
🔷 Invoice Creation Process Started
  📋 Input Parameters: { ... }
  ✅ Wallet connected: 0x3e5e...6ee1
  ✅ Package ID: 0x4d3f...ac12
  🔄 Building transaction block...
  💰 Amount conversion: 100 SUI → 100000000000 MIST
  📅 Due date: 2024-12-31T... → 1735689600000ms
  📝 Encoded data:
    - Invoice Number: "INV-001" → [73, 78, 86, ...]
    - Buyer: "TechCorp" → [84, 101, 99, ...]
    - Description: "Test" → [84, 101, 115, 116]
  🎯 Move Call Target: 0x4d3f...::invoice_financing::create_invoice
  🕐 Clock Object ID: 0x6
  ✅ Transaction block built successfully
  📤 Sending transaction to blockchain...
  ✅ Transaction executed successfully!
  📊 Full Transaction Result: { ... }
  🔗 Transaction Digest: BguHEJP...
  📦 Created Objects: [...]
  🆔 Invoice Object ID: 0x...
  🎉 Events emitted: [...]
  ✅ Invoice creation completed successfully
```

#### Error Logging
```
❌ Transaction Error
  Error object: { ... }
  Error message: "..."
  Error stack: "..."
  Error cause: { ... }
```

### 2. Debug Panel Component

**Usage:** Add to any page to see live configuration status

```tsx
import { DebugPanel } from "@/components/DebugPanel";

export default function Page() {
  return (
    <div>
      <DebugPanel />
      {/* Your other components */}
    </div>
  );
}
```

**Shows:**
- ✅ Wallet connection status
- ✅ Package ID configuration
- ✅ Network settings
- ✅ Environment variables status

## How to Debug Issues

### Issue: "Package ID not configured"

**Check Console:**
```javascript
❌ Package ID not configured
Current NEXT_PUBLIC_PACKAGE_ID: undefined
```

**Solution:**
1. Check `dapp/.env.local` exists
2. Verify it contains: `NEXT_PUBLIC_PACKAGE_ID=0x4d3f...`
3. Restart dev server: `yarn dev`

### Issue: Transaction fails

**Check Console:**
Look for the error section:
```javascript
❌ Transaction Error
  Error message: "Execution failed due to..."
```

**Common Causes:**
- Due date in the past
- Amount is 0 or negative
- Insufficient gas (need ~0.01 SUI)
- Wrong network

**Debug Steps:**
1. Check input values in console
2. Verify conversions (SUI → MIST, Date → timestamp)
3. Check wallet has enough SUI
4. Verify on correct network (testnet)

### Issue: Form data not correct

**Check Console:**
```javascript
📋 Form Data Collected: {
  invoiceNumber: "INV-001",
  buyer: "TechCorp",
  amount: 100,
  dueDate: Tue Dec 31 2024,
  description: "Test"
}
```

**What to Check:**
- Amount is a number, not string
- Date is a valid Date object
- All required fields present

### Issue: Wallet not connected

**Check Console:**
```javascript
❌ Wallet not connected - cannot submit
```

**Solution:**
1. Click "Connect Wallet" in navigation
2. Approve connection in wallet extension
3. Try form submission again

## Debugging Workflow

### 1. Before Submitting Form

**Console Check:**
```javascript
// Type in console:
console.log(process.env.NEXT_PUBLIC_PACKAGE_ID);
// Should show: 0x4d3f0eeb160eaff90fafc34654457604bdce0ff38775f45f87561f5469aeac12
```

### 2. During Form Fill

Check DebugPanel shows:
- ✅ Wallet: Connected
- ✅ Package ID: Configured
- ✅ Network: testnet

### 3. After Clicking Submit

**Watch Console for:**
1. Form data collection logs
2. Wallet connection check
3. Transaction building logs
4. Blockchain submission
5. Success or error messages

### 4. If Transaction Succeeds

You'll see:
- ✅ Transaction digest
- ✅ Invoice object ID
- ✅ Events emitted
- ✅ Success toast notification

### 5. If Transaction Fails

You'll see:
- ❌ Detailed error logs
- ❌ Error message and stack
- ❌ Error toast notification

## Advanced Debugging

### Enable Verbose Logging

Add to console:
```javascript
localStorage.setItem('debug', '*');
// Then refresh page
```

### Check Transaction on Explorer

After transaction:
```javascript
// Copy digest from console, then:
// Go to: https://testnet.suivision.xyz/txblock/PASTE_DIGEST_HERE
```

### Test Data Conversions

In console:
```javascript
// Test amount conversion
const sui = 100;
const mist = sui * 1_000_000_000;
console.log(`${sui} SUI = ${mist} MIST`);

// Test date conversion
const date = new Date("2024-12-31");
const timestamp = date.getTime();
console.log(`Date: ${date} = ${timestamp}ms`);

// Test byte encoding
const text = "INV-001";
const bytes = Array.from(new TextEncoder().encode(text));
console.log(`Text: ${text} = [${bytes}]`);
```

## Troubleshooting Common Errors

### Error: "Failed to fetch"

**Meaning:** Network issue or RPC endpoint down

**Check:**
- Internet connection
- Sui testnet status: https://status.sui.io

### Error: "Insufficient gas"

**Meaning:** Not enough SUI for transaction

**Check:**
```javascript
// In console, check balance
// (after connecting wallet)
```

**Solution:** Get testnet SUI from faucet

### Error: "Invalid transaction"

**Meaning:** Transaction structure incorrect

**Check Console:**
- Verify Move Call Target is correct
- Check all arguments are properly encoded
- Ensure Clock object ID is `0x6`

### Error: "Object not found"

**Meaning:** Package ID incorrect or not deployed

**Check:**
1. Verify Package ID in `.env.local`
2. Check contract is deployed: `make build_contract`
3. Verify on explorer: https://testnet.suivision.xyz/package/YOUR_PACKAGE_ID

## Pro Tips

### 1. Keep Console Open
Always have DevTools console open when testing

### 2. Use Console Groups
Logs are organized in collapsible groups - click arrows to expand/collapse

### 3. Filter Console
- Type "Invoice" in console filter to see only invoice-related logs
- Type "error" to see only errors
- Type "✅" or "❌" to filter by status

### 4. Copy Debug Info
Right-click on console logs → "Copy object" to share debug info

### 5. Network Tab
Check DevTools → Network tab to see API calls to blockchain

## Debug Checklist

Before asking for help, check:

- [ ] Console shows Package ID configured
- [ ] DebugPanel shows wallet connected
- [ ] Form data logs show correct values
- [ ] Transaction building completes without errors
- [ ] Error message (if any) is shown in console
- [ ] Wallet has sufficient SUI for gas
- [ ] On correct network (testnet)
- [ ] Contract is deployed (check explorer)

## Getting Help

When reporting issues, provide:

1. **Console logs** (copy the entire group)
2. **DebugPanel screenshot**
3. **Transaction digest** (if transaction was submitted)
4. **Error message** (exact text)
5. **Steps to reproduce**

## Example Debug Session

```
✅ 1. Open page → DebugPanel shows all green
✅ 2. Fill form → Console logs form data
✅ 3. Click submit → Console shows transaction building
✅ 4. Approve in wallet → Console shows transaction sent
✅ 5. Wait → Console shows transaction success
✅ 6. See invoice ID → Invoice created!
```

---

**Remember:** Open DevTools Console (F12) before testing! 🔍


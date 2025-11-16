# Settlement UI Flow - Visual Guide

## UI States

### 1. Active Investments View (Before Settlement)
```
┌─────────────────────────────────────────────────────────────┐
│ Investment Card                                    [Active] │
├─────────────────────────────────────────────────────────────┤
│ ACME Corp                                                   │
│ Invoice #INV-001                                            │
├─────────────────────────────────────────────────────────────┤
│ Invested: $950    Expected: $998    Rate: 5.05%            │
│ Due Date: 2025-12-15                   Rating: A            │
├─────────────────────────────────────────────────────────────┤
│ [🔗 View Details]  [Settle 998.00 SUI]  ← NEW BUTTONS     │
└─────────────────────────────────────────────────────────────┘
```

### 2. Click "Settle" Button → Modal Opens
```
┌──────────────────────────────────────────────────────┐
│                Settle Invoice                    [×] │
├──────────────────────────────────────────────────────┤
│ Settle this invoice and receive your return         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Invoice Details                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                      │
│ Invoice Number:  INV-001                            │
│ Face Value:      1000.00 SUI                        │
│ Due Date:        Dec 15, 2025                       │
│ Status:          [⚡ Active]                         │
│                                                      │
│ Payment Breakdown                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                      │
│ Face Value:           1000.00 SUI                   │
│ Platform Fees:          -2.00 SUI                   │
│ ──────────────────────────────────                  │
│ You Will Receive:      998.00 SUI                   │
│                                                      │
│ [Cancel]  [⚡ Settle Invoice]  ← ACTION BUTTON      │
└──────────────────────────────────────────────────────┘
```

### 3. Click "Settle Invoice" → Wallet Approval
```
┌──────────────────────────────────────────────────────┐
│ Sui Wallet                                           │
├──────────────────────────────────────────────────────┤
│ Sign Transaction                                     │
│                                                      │
│ App: On-Chain Invoice Financing                     │
│ Action: repay_invoice                               │
│ Amount: 1000.00 SUI                                 │
│                                                      │
│ Gas Fee: ~0.001 SUI                                 │
│                                                      │
│ [Reject]  [Approve & Sign]                          │
└──────────────────────────────────────────────────────┘
```

### 4. Transaction Processing
```
┌──────────────────────────────────────────────────────┐
│                Settle Invoice                    [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│                  ⏳ Processing...                    │
│                                                      │
│          Settling invoice on blockchain              │
│               Please wait...                         │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5. Success State (Auto-closes after 2s)
```
┌──────────────────────────────────────────────────────┐
│                Settle Invoice                    [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│        ✅ Invoice Settled Successfully!             │
│                                                      │
│    Transaction Hash:                                │
│    0x1a2b3c4d5e6f...                               │
│                                                      │
│    Amount Received: 998.00 SUI                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 6. After Settlement - Updated View
```
┌─────────────────────────────────────────────────────────────┐
│ Active Investments (0)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│       No active investments found.                          │
│       Visit the marketplace to finance invoices!            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Settled Investments (1)                         [Settled]   │
├─────────────────────────────────────────────────────────────┤
│ ACME Corp                                                   │
│ Invoice #INV-001                                            │
├─────────────────────────────────────────────────────────────┤
│ Invested: $950    Returned: $998    Rate: 5.05%            │
│ Settled Date: 2025-11-15               Status: [Paid]       │
└─────────────────────────────────────────────────────────────┘
            (No settle button - already complete)
```

## Click Flow Diagram

```
User on Investor Dashboard
         │
         ├─[View Active Investments Tab]
         │
         ▼
┌─────────────────────────┐
│ InvestmentCard          │
│                         │
│ [ View Details ] button │───► Opens explorer in new tab
│                         │
│ [ Settle X SUI ] button │───┐
└─────────────────────────┘   │
                              │
                              ▼
                    handleSettleClick()
                              │
                              ├─ Find full invoice data
                              ├─ setSelectedInvoice(invoice)
                              └─ setSettleModalOpen(true)
                              │
                              ▼
                    ┌───────────────────┐
                    │ SettleInvoiceModal│
                    │                   │
                    │ [Cancel] button   │───► Close modal
                    │                   │
                    │ [Settle] button   │───┐
                    └───────────────────┘   │
                                            │
                                            ▼
                                  useSettleInvoice()
                                            │
                                            ├─ Build TransactionBlock
                                            ├─ Call repay_invoice()
                                            └─ signAndExecuteTransaction
                                            │
                                            ▼
                                    Wallet Approval
                                            │
                                            ├─[User Approves]
                                            │
                                            ▼
                                    Blockchain TX
                                            │
                                            ├─ Invoice status: FUNDED → REPAID
                                            ├─ Funds distributed
                                            └─ Events emitted
                                            │
                                            ▼
                                  handleSettleSuccess()
                                            │
                                            ├─ refetch() investments
                                            ├─ Show success message
                                            └─ Auto-close modal (2s)
                                            │
                                            ▼
                                    UI Updates
                                            │
                                            ├─ Active count decreases
                                            ├─ Settled count increases
                                            └─ Investment moves to Settled tab
```

## Component Integration

```
app/dashboard/investor/page.tsx
├── State Management
│   ├── settleModalOpen: boolean
│   └── selectedInvoice: OnChainInvoice | null
│
├── Event Handlers
│   ├── handleSettleClick(investment)
│   │   └── Opens modal with invoice data
│   └── handleSettleSuccess()
│       └── Refetches investment list
│
├── Render Tree
│   ├── <Navigation />
│   ├── <InvestorDashboardHeader />
│   ├── <Tabs>
│   │   ├── Active Tab
│   │   │   └── <InvestmentList
│   │   │         investments={active}
│   │   │         showSettleButton={true}    ← SHOWS BUTTON
│   │   │         onSettle={handleSettleClick}
│   │   │       />
│   │   │       └── <InvestmentCard
│   │   │             showSettleButton={true}
│   │   │             onSettle={onSettle}
│   │   │           />
│   │   │           └── <CardFooter>
│   │   │                 ├── View Details Button
│   │   │                 └── Settle Button ← USER CLICKS HERE
│   │   │
│   │   └── Settled Tab
│   │       └── <InvestmentList
│   │             investments={settled}
│   │             showSettleButton={false}   ← NO BUTTON
│   │           />
│   │
│   └── <SettleInvoiceModal                  ← MODAL RENDERS HERE
│         open={settleModalOpen}
│         invoice={selectedInvoice}
│         onSuccess={handleSettleSuccess}
│       />
│       └── useSettleInvoice() hook
│           └── TransactionBlock
│               └── repay_invoice() call
```

## Data Flow

```
OnChainInvoice (from blockchain)
         │
         ├── convertToInvestment()
         ▼
Investment (UI format)
         │
         ├── Active investments filtered
         ▼
InvestmentList
         │
         └── map to InvestmentCard
                   │
                   ├── Click "Settle" button
                   ▼
         handleSettleClick(investment)
                   │
                   ├── Find full OnChainInvoice
                   ▼
         selectedInvoice set
                   │
                   ├── Modal opens
                   ▼
         SettleInvoiceModal
                   │
                   ├── Display invoice details
                   ├── Click "Settle Invoice"
                   ▼
         useSettleInvoice()
                   │
                   ├── Build transaction
                   ├── Call repay_invoice
                   ├── Get wallet signature
                   ▼
         Blockchain Transaction
                   │
                   ├── Update invoice status
                   ├── Transfer funds
                   ▼
         handleSettleSuccess()
                   │
                   ├── refetch()
                   ▼
         Updated Investment List
                   │
                   └── UI reflects new state
```

## Error Handling

```
Settlement Flow
      │
      ├─ No Wallet Connected
      │  └─► Error: "Please connect your wallet"
      │
      ├─ Invalid Invoice ID
      │  └─► Error: "Invoice not found"
      │
      ├─ Insufficient Balance
      │  └─► Wallet rejection + Error displayed
      │
      ├─ User Rejects TX
      │  └─► Error: "Transaction rejected"
      │
      ├─ Network Error
      │  └─► Error: "Failed to submit transaction"
      │
      └─ Success
         └─► Success message + Auto-close + Refetch
```

## Key Features Implemented

✅ **Conditional Button Rendering**
- Shows on active investments only
- Hidden on settled investments
- Controlled via `showSettleButton` prop

✅ **Click Event Isolation**
- Card click → View explorer
- Button click → Specific action
- `e.stopPropagation()` prevents conflicts

✅ **State Synchronization**
- Modal state tracked in parent
- Invoice data passed correctly
- Success triggers refetch

✅ **Type Safety**
- OnChainInvoice → Investment conversion
- Date formatting applied
- All props properly typed

✅ **User Feedback**
- Loading states during TX
- Success message with hash
- Error messages with details
- Auto-close on success

✅ **Responsive Layout**
- Buttons flex to fill space
- Icons properly sized
- Mobile-friendly design

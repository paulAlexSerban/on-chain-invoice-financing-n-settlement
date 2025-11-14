# Sequence Diagrams
## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Date:** November 14, 2025

---

## Overview

This document contains detailed sequence diagrams illustrating the key workflows and interactions in the On-Chain Invoice Financing & Settlement platform.

---

## 1. Complete Lifecycle Flow (Happy Path)

### End-to-End: Invoice Issuance → Financing → Settlement

```mermaid
sequenceDiagram
    autonumber
    actor Supplier
    actor Financier
    participant UI as Web Application
    participant Backend as Oracle Backend
    participant Indexer as Event Indexer
    participant Sui as Sui Blockchain
    participant IPFS as IPFS Network
    
    %% === PHASE 1: INVOICE ISSUANCE ===
    Note over Supplier,IPFS: Phase 1: Invoice Issuance
    
    Supplier->>UI: Navigate to "Issue Invoice"
    Supplier->>UI: Fill form (amount, due date, buyer info)
    Supplier->>UI: Upload PDF document
    
    UI->>Backend: POST /api/documents/upload
    Backend->>IPFS: Pin document
    IPFS-->>Backend: Return IPFS CID (doc_hash)
    Backend-->>UI: { ipfs_hash }
    
    UI->>Backend: POST /api/oracle/sign-issuance<br/>{issuer, buyer_hash, amount, due_date, doc_hash}
    Backend->>Backend: Generate signature with private key
    Backend-->>UI: { signature, timestamp, nonce }
    
    UI->>Supplier: Request wallet signature
    Supplier->>UI: Approve transaction
    UI->>Sui: Submit transaction: issue_invoice<CoinType>()
    
    Sui->>Sui: Validate signature against OracleRegistry
    Sui->>Sui: Create Invoice object (status=ISSUED)
    Sui->>Sui: Emit InvoiceIssued event
    Sui-->>UI: Transaction confirmed { digest, invoice_id }
    
    Sui->>Indexer: Event: InvoiceIssued
    Indexer->>Indexer: Store in database
    
    UI->>Supplier: Show success + invoice ID
    
    %% === PHASE 2: MARKETPLACE BROWSING ===
    Note over Financier,Indexer: Phase 2: Marketplace Discovery
    
    Financier->>UI: Navigate to Marketplace
    UI->>Indexer: GET /api/invoices?status=ISSUED
    Indexer-->>UI: Return list of available invoices
    UI->>Financier: Display invoice cards
    
    Financier->>UI: Click on specific invoice
    UI->>Sui: Query invoice object details
    Sui-->>UI: Return invoice data
    UI->>UI: Calculate purchase price<br/>(face_value * (10000-discount_bps)/10000)
    UI->>Financier: Show invoice details + purchase price
    
    %% === PHASE 3: FINANCING ===
    Note over Financier,Indexer: Phase 3: Invoice Financing
    
    Financier->>UI: Click "Finance Invoice"
    UI->>Financier: Request wallet approval
    Financier->>UI: Approve transaction + payment
    
    UI->>Sui: Submit transaction: accept_finance<CoinType>()<br/>with Coin payment
    
    Sui->>Sui: Validate status==ISSUED
    Sui->>Sui: Transfer purchase_price to Supplier
    Sui->>Sui: Update Invoice (status=FINANCED, financier=address)
    Sui->>Sui: Record financing timestamp
    Sui->>Sui: Set dispute window (optional)
    Sui->>Sui: Emit InvoiceFinanced event
    Sui-->>UI: Transaction confirmed
    
    Sui->>Indexer: Event: InvoiceFinanced
    Indexer->>Indexer: Update invoice status in database
    
    UI->>Financier: Show success confirmation
    UI->>Supplier: Notify of funding (via UI/email)
    
    %% === PHASE 4: PAYMENT & SETTLEMENT ===
    Note over Supplier,Indexer: Phase 4: Payment Observation & Settlement
    
    Note right of Backend: Off-chain: Buyer pays invoice via bank transfer
    Backend->>Backend: Observe payment event (mocked)
    Backend->>Backend: Verify payment details
    
    UI->>Backend: POST /api/oracle/sign-payment<br/>{invoice_id, amount}
    Backend->>Backend: Generate payment signature
    Backend-->>UI: { payment_signature, timestamp }
    
    UI->>Backend: Request settlement execution
    Backend->>Sui: Submit transaction: deposit_payment<CoinType>()<br/>with settlement funds
    
    Sui->>Sui: Verify sender==oracle
    Sui->>Sui: Create SettlementEscrow object
    Sui->>Sui: Emit PaymentDeposited event
    Sui-->>Backend: Transaction confirmed
    
    UI->>Sui: Submit transaction: confirm_payment<CoinType>()
    
    Sui->>Sui: Verify payment signature
    Sui->>Sui: Validate status==FINANCED && not DISPUTED
    Sui->>Sui: Transfer face_value to Financier
    Sui->>Sui: Update Invoice (status=PAID)
    Sui->>Sui: Emit PaymentConfirmed + SettlementExecuted events
    Sui-->>UI: Transaction confirmed
    
    Sui->>Indexer: Events: PaymentConfirmed, SettlementExecuted
    Indexer->>Indexer: Update invoice status to PAID
    
    UI->>Financier: Notify of settlement complete
    UI->>Supplier: Notify of invoice marked paid
```

---

## 2. Invoice Issuance (Detailed)

### Focus: Document Upload and Signature Verification

```mermaid
sequenceDiagram
    autonumber
    actor Supplier
    participant UI as Web Application
    participant Backend as Oracle Backend
    participant IPFS
    participant Sui as Sui Blockchain
    
    Supplier->>UI: Access "Issue Invoice" page
    UI->>Supplier: Render form
    
    Supplier->>UI: Enter invoice details<br/>(amount, due date, buyer info)
    UI->>UI: Validate form inputs
    
    Supplier->>UI: Upload PDF file
    UI->>UI: Validate file (size, type)
    UI->>Backend: POST /api/documents/upload<br/>multipart/form-data
    
    Backend->>Backend: Validate file
    Backend->>Backend: Calculate SHA256 hash
    Backend->>IPFS: Pin file to IPFS
    IPFS-->>Backend: Return CID
    Backend->>Backend: Store metadata in database
    Backend-->>UI: { ipfs_hash, url }
    
    UI->>UI: Hash buyer identifier (SHA3)
    
    UI->>Backend: POST /api/oracle/sign-issuance<br/>{ issuer, buyer_hash, amount, due_date, doc_hash, discount_bps }
    
    Backend->>Backend: Validate parameters
    Backend->>Backend: Generate nonce (prevent replay)
    Backend->>Backend: Create message to sign:<br/>{issuer, buyer_hash, amount, due_date, doc_hash, nonce, timestamp}
    Backend->>Backend: Sign with oracle private key (Ed25519)
    Backend->>Backend: Log signature to database
    Backend-->>UI: { signature, nonce, timestamp, oracle_pubkey }
    
    UI->>Supplier: Show transaction preview
    Supplier->>UI: Confirm transaction
    UI->>UI: Build transaction call data:<br/>issue_invoice<CoinType>(<br/>  buyer_hash, face_value, due_ts,<br/>  discount_bps, doc_hash,<br/>  issuance_note_hash, signature<br/>)
    
    UI->>Supplier: Request wallet signature
    Supplier->>Supplier: Review in wallet
    Supplier->>UI: Approve signature
    
    UI->>Sui: Submit signed transaction
    Sui->>Sui: Execute issue_invoice entry function
    Sui->>Sui: Verify signature matches OracleRegistry.oracle pubkey
    Sui->>Sui: Validate amount > 0, due_date > now
    Sui->>Sui: Create Invoice object<br/>{ id: UID, issuer, buyer_hash, ..., status: ISSUED }
    Sui->>Sui: Transfer Invoice object to Supplier address
    Sui->>Sui: Emit InvoiceIssued event
    Sui-->>UI: Return transaction digest
    
    UI->>UI: Poll for transaction confirmation
    Sui-->>UI: Transaction confirmed
    UI->>Sui: Query created Invoice object
    Sui-->>UI: Return Invoice data
    
    UI->>Supplier: Display success message<br/>+ Invoice ID<br/>+ Explorer link
```

---

## 3. Invoice Financing (Detailed)

### Focus: Marketplace Discovery and Atomic Payment

```mermaid
sequenceDiagram
    autonumber
    actor Financier
    participant UI as Web Application
    participant Indexer as Event Indexer
    participant Sui as Sui Blockchain
    participant Wallet as Sui Wallet
    
    Financier->>UI: Navigate to Marketplace
    UI->>Indexer: GET /api/invoices?status=ISSUED&sort=due_date
    Indexer-->>UI: Return invoice list with metadata
    UI->>Financier: Render invoice cards
    
    Financier->>UI: Click invoice card
    UI->>Sui: Query Invoice object by ID
    Sui-->>UI: Return Invoice details
    
    UI->>Sui: Query mock risk score (future)
    UI->>UI: Calculate metrics:<br/>- Purchase price<br/>- Effective APY<br/>- Days to maturity
    
    UI->>Financier: Display invoice detail view:<br/>- Face value<br/>- Discount rate<br/>- Purchase price<br/>- Due date<br/>- Risk indicators<br/>- Document link (IPFS)
    
    Financier->>UI: Click "Finance Invoice"
    UI->>UI: Validate financier has sufficient balance
    
    UI->>Wallet: Request current balance
    Wallet-->>UI: Balance info
    
    alt Insufficient Balance
        UI->>Financier: Show error: "Insufficient funds"
    else Sufficient Balance
        UI->>Financier: Show confirmation dialog<br/>"Purchase for X tokens?"
        Financier->>UI: Confirm
        
        UI->>UI: Build transaction:<br/>accept_finance<CoinType>(<br/>  invoice: &mut Invoice,<br/>  payment: Coin<CoinType>,<br/>  clock: &Clock,<br/>  registry: &OracleRegistry<br/>)
        
        UI->>Wallet: Request signature
        Wallet->>Financier: Show transaction details
        Financier->>Wallet: Approve
        Wallet->>UI: Return signed transaction
        
        UI->>Sui: Submit transaction
        Sui->>Sui: Execute accept_finance
        Sui->>Sui: Assert invoice.status == ISSUED
        Sui->>Sui: Calculate required purchase price
        Sui->>Sui: Split payment coin:<br/>- to_issuer (purchase price)<br/>- change (excess, returned)
        Sui->>Sui: Transfer to_issuer to Supplier
        Sui->>Sui: Return change to Financier
        Sui->>Sui: Update Invoice object:<br/>- status = FINANCED<br/>- financier = Financier address<br/>- financed_at = current timestamp<br/>- dispute_until = timestamp + window
        Sui->>Sui: Emit InvoiceFinanced event
        Sui-->>UI: Transaction confirmed { digest }
        
        UI->>Financier: Show success notification
        UI->>Financier: Display transaction link
    end
```

---

## 4. Payment Confirmation & Settlement (Detailed)

### Focus: Oracle Attestation and Multi-Step Settlement

```mermaid
sequenceDiagram
    autonumber
    participant Buyer as Buyer (Off-Chain)
    participant Bank as Banking System
    participant Backend as Oracle Backend
    participant UI as Web Application
    participant Sui as Sui Blockchain
    actor Financier
    
    Note over Buyer,Bank: Off-Chain Payment Process
    Buyer->>Bank: Pay invoice via wire/ACH
    Bank->>Bank: Process payment
    Bank-->>Buyer: Payment confirmed
    
    Note over Backend,Sui: Oracle Detection (Mocked for MVP)
    Backend->>Backend: Payment monitoring service<br/>detects payment event
    Backend->>Backend: Validate payment details:<br/>- Amount matches face_value<br/>- Invoice ID correlation<br/>- Buyer identity
    Backend->>Backend: Log payment observation
    
    Note over UI,Sui: Settlement Initiation
    alt Automatic Trigger (Production)
        Backend->>Backend: Auto-trigger settlement flow
    else Manual Trigger (MVP Demo)
        UI->>Backend: POST /api/oracle/sign-payment<br/>{ invoice_id, amount, payment_proof }
    end
    
    Backend->>Backend: Verify invoice is FINANCED
    Backend->>Backend: Generate payment attestation:<br/>{ invoice_id, amount, timestamp, nonce }
    Backend->>Backend: Sign with oracle private key
    Backend->>Backend: Store signature in database
    Backend-->>UI: { payment_signature, timestamp }
    
    Note over Backend,Sui: Step 1: Deposit Settlement Funds
    Backend->>Sui: Submit transaction: deposit_payment<CoinType>(<br/>  registry, invoice, funds: Coin<CoinType><br/>)
    
    Sui->>Sui: Verify sender == OracleRegistry.oracle
    Sui->>Sui: Create SettlementEscrow object:<br/>{ invoice_id, funds: Balance, depositor }
    Sui->>Sui: Emit PaymentDeposited event
    Sui-->>Backend: Transaction confirmed
    Backend-->>UI: Deposit complete
    
    Note over UI,Sui: Step 2: Confirm Payment & Execute Settlement
    UI->>UI: Build transaction:<br/>confirm_payment<CoinType>(<br/>  registry, invoice, escrow, clock<br/>)
    
    UI->>Financier: Request signature for settlement
    Financier->>UI: Approve transaction
    
    UI->>Sui: Submit transaction
    Sui->>Sui: Verify sender == oracle (or financier with proof)
    Sui->>Sui: Assert invoice.status == FINANCED
    Sui->>Sui: Assert invoice.status != DISPUTED
    Sui->>Sui: Verify payment signature (if required)
    
    Sui->>Sui: Extract funds from SettlementEscrow
    Sui->>Sui: Calculate payout (face_value)
    Sui->>Sui: Transfer payout to Financier
    
    alt Escrow has excess funds
        Sui->>Sui: Return excess to oracle/depositor
    end
    
    Sui->>Sui: Update Invoice:<br/>- status = PAID<br/>- paid_at = current timestamp
    
    Sui->>Sui: Delete SettlementEscrow object
    Sui->>Sui: Emit events:<br/>- PaymentConfirmed<br/>- SettlementExecuted
    
    Sui-->>UI: Transaction confirmed
    UI->>Financier: Notify: "Settlement complete!<br/>X tokens received"
    UI->>UI: Update invoice display
```

---

## 5. Dispute Flow

### Focus: Dispute Window and Settlement Blocking

```mermaid
sequenceDiagram
    autonumber
    actor Party as Supplier or Financier
    participant UI as Web Application
    participant Sui as Sui Blockchain
    participant Clock as Sui Clock
    participant Backend as Oracle Backend
    
    Note over Party,Backend: Scenario: Issue detected after financing
    
    Party->>UI: Navigate to invoice detail
    UI->>Sui: Query Invoice object
    Sui-->>UI: Return Invoice data<br/>(status=FINANCED, dispute_until timestamp)
    
    UI->>Party: Display invoice with "Raise Dispute" button
    
    Party->>UI: Click "Raise Dispute"
    UI->>Party: Show dispute form<br/>"Reason for dispute?"
    Party->>UI: Enter reason (e.g., "Payment already received")
    
    UI->>UI: Hash reason text
    UI->>UI: Build transaction:<br/>raise_dispute<CoinType>(<br/>  invoice, reason_hash, clock<br/>)
    
    UI->>Party: Request wallet signature
    Party->>UI: Approve
    
    UI->>Sui: Submit transaction
    Sui->>Sui: Execute raise_dispute
    Sui->>Sui: Verify sender authorization:<br/>sender == invoice.issuer OR<br/>sender == invoice.financier
    
    Sui->>Clock: Get current timestamp
    Clock-->>Sui: Current timestamp
    
    alt Within Dispute Window
        Sui->>Sui: Verify current_time <= invoice.dispute_until
        Sui->>Sui: Update Invoice:<br/>- status = DISPUTED
        Sui->>Sui: Emit DisputeRaised event<br/>{ invoice_id, by, at, reason_hash }
        Sui-->>UI: Transaction confirmed
        UI->>Party: "Dispute raised successfully"
    else Outside Dispute Window
        Sui-->>UI: Transaction failed:<br/>"Dispute window expired"
        UI->>Party: Show error message
    end
    
    Note over Backend,Sui: Blocked Settlement Attempt
    Backend->>Backend: Attempts to confirm payment
    Backend->>Sui: Submit confirm_payment transaction
    Sui->>Sui: Execute confirm_payment
    Sui->>Sui: Check invoice.status
    
    alt Invoice is DISPUTED
        Sui->>Sui: Assert fails: status != DISPUTED
        Sui-->>Backend: Transaction reverted:<br/>"Invoice is disputed"
        Backend-->>UI: Settlement blocked
        UI->>Party: "Cannot settle disputed invoice"
    end
    
    Note over Party,Backend: Manual Resolution (Off-Chain)
    Party->>Backend: Contact support for dispute resolution
    Backend->>Backend: Investigation process
    Backend->>Backend: Manual resolution decision
    
    alt Dispute Resolved - Valid Settlement
        Backend->>Sui: Admin function to clear dispute<br/>(or new invoice created)
    else Dispute Resolved - Invalid Invoice
        Backend->>Sui: Cancel invoice<br/>Refund financier (manual)
    end
```

---

## 6. Wallet Connection Flow

### Focus: User Authentication via Sui Wallet

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Web Application
    participant WalletAdapter as @mysten/dapp-kit
    participant WalletExt as Sui Wallet Extension
    participant Sui as Sui Blockchain
    
    User->>UI: Visit platform homepage
    UI->>UI: Check wallet connection status
    UI->>User: Show "Connect Wallet" button
    
    User->>UI: Click "Connect Wallet"
    UI->>WalletAdapter: Request wallet connection
    
    WalletAdapter->>WalletAdapter: Detect available wallets
    WalletAdapter->>User: Show wallet selection dialog
    
    User->>WalletAdapter: Select "Sui Wallet"
    WalletAdapter->>WalletExt: Request connection permission
    
    WalletExt->>User: Show authorization prompt
    User->>WalletExt: Approve connection
    
    WalletExt->>WalletAdapter: Return account address(es)
    WalletAdapter->>UI: Connection established<br/>{ address, publicKey }
    
    UI->>Sui: Query account balances
    Sui-->>UI: Return balance data
    
    UI->>UI: Store connection state
    UI->>User: Update UI:<br/>- Show address (truncated)<br/>- Show balance<br/>- Enable platform features
    
    Note over User,Sui: Optional: Backend Session
    UI->>UI: Generate session message
    UI->>WalletAdapter: Request signature for session
    WalletAdapter->>WalletExt: Sign message request
    User->>WalletExt: Approve signature
    WalletExt-->>UI: Return signature
    
    UI->>UI: Backend: Verify signature<br/>(for session management)
```

---

## 7. Event Indexing Flow

### Focus: Real-Time Data Synchronization

```mermaid
sequenceDiagram
    autonumber
    participant Sui as Sui Blockchain
    participant Indexer as Event Indexer Service
    participant DB as PostgreSQL Database
    participant UI as Web Application
    
    Note over Sui,DB: Initial Setup
    Indexer->>Sui: Subscribe to events:<br/>- InvoiceIssued<br/>- InvoiceFinanced<br/>- PaymentConfirmed<br/>- SettlementExecuted<br/>- DisputeRaised
    Sui-->>Indexer: WebSocket connection established
    
    Note over Sui,UI: Invoice Issuance Event
    Sui->>Sui: Transaction executed:<br/>issue_invoice()
    Sui->>Sui: Emit InvoiceIssued event<br/>{ invoice_id, issuer, face_value, due_ts, ... }
    
    Sui->>Indexer: Event notification (WebSocket)
    Indexer->>Indexer: Parse event data
    Indexer->>Indexer: Transform to database schema
    Indexer->>DB: INSERT INTO indexed_invoices<br/>(invoice_id, issuer, status, ...)<br/>VALUES (...)
    DB-->>Indexer: Insert successful
    Indexer->>Indexer: Log processing
    
    Note over UI,DB: Frontend Query
    UI->>Indexer: GET /api/invoices?status=ISSUED
    Indexer->>DB: SELECT * FROM indexed_invoices<br/>WHERE status = 'ISSUED'<br/>ORDER BY created_at DESC
    DB-->>Indexer: Return rows
    Indexer->>Indexer: Format response
    Indexer-->>UI: Return JSON array
    
    Note over Sui,UI: Invoice Financing Event
    Sui->>Sui: Transaction executed:<br/>accept_finance()
    Sui->>Sui: Emit InvoiceFinanced event
    Sui->>Indexer: Event notification
    
    Indexer->>Indexer: Parse event
    Indexer->>DB: UPDATE indexed_invoices<br/>SET status = 'FINANCED',<br/>    financier = ...,<br/>    financed_at = ...<br/>WHERE invoice_id = ...
    DB-->>Indexer: Update successful
    
    Note over UI,Indexer: Real-Time Update (WebSocket)
    Indexer->>UI: Push update via WebSocket:<br/>{ type: 'invoice_updated', invoice_id, ... }
    UI->>UI: Update displayed invoice card
    UI->>UI: Show notification to user
    
    Note over Indexer,DB: Periodic Health Check
    loop Every 10 seconds
        Indexer->>Sui: Check connection health
        Indexer->>DB: Verify database connection
        alt Connection Issues
            Indexer->>Indexer: Log error
            Indexer->>Indexer: Attempt reconnection
        end
    end
```

---

## 8. Error Handling & Recovery Flow

### Focus: Transaction Failure Scenarios

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Web Application
    participant Sui as Sui Blockchain
    participant Backend as Oracle Backend
    
    Note over User,Backend: Scenario 1: Transaction Rejected
    User->>UI: Submit transaction (e.g., finance invoice)
    UI->>Sui: Submit transaction
    
    alt Transaction Validation Fails
        Sui-->>UI: Error: "Insufficient gas"
        UI->>User: Show error notification:<br/>"Transaction failed: Not enough SUI for gas"
        UI->>User: Suggest: "Get SUI from faucet"
    else Smart Contract Logic Fails
        Sui-->>UI: Error: "Invoice already financed"
        UI->>User: Show error:<br/>"This invoice is no longer available"
        UI->>UI: Refresh invoice status
    end
    
    Note over User,Backend: Scenario 2: Network Timeout
    User->>UI: Submit transaction
    UI->>Sui: Submit transaction (timeout 30s)
    
    alt Network Timeout
        Note over UI,Sui: No response after 30s
        UI->>User: Show warning:<br/>"Transaction pending...<br/>Checking status..."
        
        loop Every 5 seconds, max 60s
            UI->>Sui: Query transaction by digest
            alt Transaction Found
                Sui-->>UI: Transaction confirmed
                UI->>User: Show success (delayed)
            else Still Pending
                UI->>UI: Continue polling
            else Transaction Not Found
                UI->>User: Show error:<br/>"Transaction may have failed.<br/>Please refresh and try again."
            end
        end
    end
    
    Note over User,Backend: Scenario 3: Oracle Signature Failure
    User->>UI: Request oracle signature
    UI->>Backend: POST /api/oracle/sign-issuance
    
    alt Backend Error
        Backend-->>UI: HTTP 500: Internal Server Error
        UI->>User: Show error:<br/>"Service temporarily unavailable"
        UI->>User: Provide retry button
    else Signature Validation Fails On-Chain
        UI->>Sui: Submit transaction with signature
        Sui->>Sui: Verify signature against OracleRegistry
        Sui-->>UI: Error: "Invalid signature"
        UI->>User: Show error:<br/>"Verification failed. Please try again."
        UI->>Backend: Log error for investigation
    end
    
    Note over User,Backend: Scenario 4: Wallet Rejection
    User->>UI: Initiate transaction
    UI->>User: Request wallet signature
    User->>User: Review in wallet
    User->>UI: Reject transaction
    
    UI->>User: Show info message:<br/>"Transaction cancelled by user"
    UI->>UI: Return to previous state
```

---

## 9. Admin Operations Flow

### Focus: Oracle Management and Dispute Resolution

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Platform Admin
    participant AdminUI as Admin Dashboard
    participant Backend as Oracle Backend
    participant Sui as Sui Blockchain
    participant DB as Database
    
    Note over Admin,DB: Scenario 1: Update Oracle Registry
    Admin->>AdminUI: Access admin panel
    AdminUI->>Backend: Authenticate admin
    Backend->>Backend: Verify admin credentials
    Backend-->>AdminUI: Authentication successful
    
    Admin->>AdminUI: Navigate to "Oracle Management"
    AdminUI->>Sui: Query OracleRegistry object
    Sui-->>AdminUI: Return current oracle addresses
    
    Admin->>AdminUI: Update oracle address
    AdminUI->>Admin: Show confirmation:<br/>"This will affect all future attestations"
    Admin->>AdminUI: Confirm
    
    AdminUI->>Sui: Submit transaction:<br/>update_oracle_registry(new_address)
    Sui->>Sui: Verify sender == admin capability
    Sui->>Sui: Update OracleRegistry.oracle
    Sui->>Sui: Emit OracleUpdated event
    Sui-->>AdminUI: Transaction confirmed
    AdminUI->>Admin: Show success message
    
    Note over Admin,DB: Scenario 2: Manual Dispute Resolution
    Admin->>AdminUI: View "Disputed Invoices" list
    AdminUI->>DB: Query invoices with status=DISPUTED
    DB-->>AdminUI: Return disputed invoice list
    
    Admin->>AdminUI: Select invoice for review
    AdminUI->>Sui: Query full invoice details
    AdminUI->>DB: Query dispute history & evidence
    AdminUI->>Admin: Display full context
    
    Admin->>AdminUI: Decision: "Resolve in favor of financier"
    AdminUI->>Admin: Show resolution options:<br/>1. Force settlement<br/>2. Refund financier<br/>3. Cancel invoice
    
    Admin->>AdminUI: Select "Force settlement"
    AdminUI->>Backend: POST /api/admin/resolve-dispute<br/>{ invoice_id, resolution: "settle" }
    
    Backend->>Backend: Verify admin authority
    Backend->>Sui: Submit admin transaction:<br/>admin_force_settle(invoice, proof)
    
    Sui->>Sui: Verify admin capability
    Sui->>Sui: Override dispute status
    Sui->>Sui: Execute settlement
    Sui->>Sui: Emit DisputeResolved event
    Sui-->>Backend: Transaction confirmed
    Backend-->>AdminUI: Resolution complete
    AdminUI->>Admin: Show success notification
    
    Note over Admin,DB: Scenario 3: System Health Check
    Admin->>AdminUI: Navigate to "System Status"
    AdminUI->>Backend: GET /api/admin/health
    
    Backend->>Sui: Check RPC connection
    Backend->>DB: Check database connection
    Backend->>Backend: Check oracle key availability
    Backend->>Backend: Check IPFS availability
    
    Backend-->>AdminUI: Return health status:<br/>{ sui: "OK", db: "OK", oracle: "OK", ipfs: "WARNING" }
    AdminUI->>Admin: Display system dashboard
```

---

## Summary of Key Patterns

### 1. **Two-Phase Commitment**
- Oracle signing (off-chain) + blockchain execution (on-chain)
- Ensures cryptographic proof before state mutation

### 2. **Event-Driven Architecture**
- Smart contracts emit events
- Indexer consumes and stores for fast queries
- UI subscribes for real-time updates

### 3. **Atomic State Transitions**
- Single transaction updates all related state
- Prevents partial states (e.g., payment taken but invoice not updated)

### 4. **Defense in Depth**
- Multiple validation layers: UI, backend, smart contract
- Signature verification at multiple points

### 5. **Graceful Degradation**
- Fallback mechanisms for network issues
- User-friendly error messages with recovery paths

---

**Document Owner:** Engineering Team  
**Last Updated:** November 14, 2025  
**Next Review:** Post-integration testing

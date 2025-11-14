# C4 Model Architecture Documentation
## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Date:** November 14, 2025

---

## Introduction to C4 Model

The C4 model provides a hierarchical approach to software architecture documentation:
- **Level 1: System Context** - How the system fits into the world
- **Level 2: Containers** - High-level technology choices and communication patterns
- **Level 3: Components** - Decomposition of containers into components
- **Level 4: Code** - Implementation details (not included in this doc)

---

## Level 1: System Context Diagram

### Overview
Shows how the On-Chain Invoice Financing Platform fits into its environment, including all external actors and systems.

### Diagram

```mermaid
C4Context
    title System Context Diagram - On-Chain Invoice Financing Platform

    Person(supplier, "Supplier", "SME business owner needing liquidity")
    Person(financier, "Financier", "Investor seeking yield opportunities")
    Person(buyer, "Buyer", "Invoice debtor (customer)")
    Person(admin, "Platform Admin", "System operator")

    System(platform, "Invoice Financing Platform", "Enables transparent, verifiable invoice financing and settlement on Sui blockchain")

    System_Ext(suiBlockchain, "Sui Blockchain", "Distributed ledger for immutable invoice lifecycle management")
    System_Ext(wallet, "Sui Wallet", "Wallet providers (Sui Wallet, Martian, etc.)")
    System_Ext(ipfs, "IPFS / Storage", "Decentralized document storage")
    System_Ext(bank, "Banking System", "Traditional payment infrastructure (mocked in MVP)")
    System_Ext(kyc, "KYC/AML Provider", "Identity verification service (mocked in MVP)")

    Rel(supplier, platform, "Issues invoices, requests financing")
    Rel(financier, platform, "Browses invoices, provides liquidity")
    Rel(buyer, platform, "Views payment status (future)")
    Rel(admin, platform, "Manages oracles, resolves disputes")

    Rel(platform, suiBlockchain, "Writes invoice objects, reads state")
    Rel(platform, wallet, "Authenticates users, signs transactions")
    Rel(platform, ipfs, "Stores/retrieves invoice documents")
    Rel(platform, bank, "Observes payment events")
    Rel(platform, kyc, "Verifies user identities")

    UpdateRelStyle(supplier, platform, $offsetX="-50", $offsetY="-20")
    UpdateRelStyle(financier, platform, $offsetX="50", $offsetY="-20")
```

### Key Relationships

| Actor/System | Interaction | Description |
|--------------|-------------|-------------|
| **Supplier → Platform** | Issues invoices | Creates on-chain invoice objects, uploads documents, requests financing |
| **Financier → Platform** | Finances invoices | Browses marketplace, purchases invoices at discount, receives settlement |
| **Buyer → Platform** | Payment obligation | (Passive in MVP) Pays invoice off-chain, triggering settlement |
| **Platform → Sui Blockchain** | State management | Deploys smart contracts, mints invoice objects, executes state transitions |
| **Platform → Wallet Providers** | Authentication | Users connect wallets to sign transactions and prove identity |
| **Platform → IPFS** | Document storage | Stores invoice PDFs, retrieves via hash for verification |
| **Platform → Banking System** | Payment verification | Oracle observes real-world payments (mocked in MVP) |
| **Platform → KYC Provider** | Compliance | Verifies user identities before allowing platform participation |

### External Dependencies
- **Sui Blockchain:** Core infrastructure for immutable state and transactions
- **Wallet Ecosystem:** User identity and transaction signing
- **Storage Networks:** Document persistence and retrieval
- **Financial Infrastructure:** Real-world payment observation (future integration)
- **Compliance Services:** Regulatory compliance (planned integration)

---

## Level 2: Container Diagram

### Overview
Shows the high-level shape of the architecture and how responsibilities are distributed across containers.

### Diagram

```mermaid
C4Container
    title Container Diagram - Invoice Financing Platform

    Person(supplier, "Supplier", "Issues invoices")
    Person(financier, "Financier", "Finances invoices")

    Container_Boundary(platform, "Invoice Financing Platform") {
        Container(webapp, "Web Application", "Next.js, React, TypeScript", "Provides user interface for all platform interactions")
        Container(backend, "Oracle Backend", "Node.js, Express", "Signs payment attestations, manages off-chain data")
        Container(indexer, "Event Indexer", "TypeScript", "Indexes blockchain events for fast queries")
    }

    ContainerDb(database, "Application Database", "PostgreSQL", "Stores user sessions, KYC status, invoice metadata")
    
    System_Ext(suiNetwork, "Sui Blockchain Network", "Distributed ledger")
    ContainerDb(smartContracts, "Smart Contracts", "Move", "Invoice lifecycle logic on Sui")
    
    System_Ext(ipfsNetwork, "IPFS Network", "Document storage")
    System_Ext(walletProvider, "Wallet Provider", "Authentication")

    Rel(supplier, webapp, "Uses", "HTTPS")
    Rel(financier, webapp, "Uses", "HTTPS")
    
    Rel(webapp, walletProvider, "Connects wallet", "JSON/RPC")
    Rel(webapp, suiNetwork, "Queries state, submits transactions", "JSON-RPC")
    Rel(webapp, backend, "Requests attestations", "REST API")
    Rel(webapp, indexer, "Queries invoice list", "REST API")
    
    Rel(backend, database, "Reads/writes", "SQL")
    Rel(backend, suiNetwork, "Monitors events, submits oracle txs", "JSON-RPC")
    Rel(backend, ipfsNetwork, "Pins documents", "HTTP API")
    
    Rel(indexer, suiNetwork, "Subscribes to events", "WebSocket")
    Rel(indexer, database, "Stores indexed data", "SQL")
    
    Rel(smartContracts, suiNetwork, "Deployed on", "")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Container Details

#### 1. Web Application (Frontend)
**Technology:** Next.js 14, React, TypeScript, TailwindCSS  
**Responsibilities:**
- Render user interface for all user types
- Connect to Sui wallets (Sui Wallet, Martian)
- Display invoice marketplace
- Submit transactions to blockchain
- Show transaction status and confirmations
- Display audit trails and analytics

**Key Features:**
- Responsive design (mobile/desktop)
- Real-time updates via event subscription
- Wallet connection management
- Transaction signing flow
- Error handling and recovery

**Communication:**
- **Inbound:** HTTPS from users' browsers
- **Outbound:** 
  - JSON-RPC to Sui network (read state, submit transactions)
  - REST API to Oracle Backend (request attestations)
  - REST API to Event Indexer (query invoice lists)
  - WebSocket to Event Indexer (real-time updates)

#### 2. Oracle Backend
**Technology:** Node.js, Express, TypeScript  
**Responsibilities:**
- Sign payment attestations with authority private key
- Store and manage oracle signing keys
- Provide REST endpoints for attestation requests
- Monitor off-chain payment events (mocked)
- Handle IPFS document pinning
- Manage mock KYC status

**Key APIs:**
- `POST /api/oracle/sign-issuance` - Sign invoice issuance attestation
- `POST /api/oracle/sign-payment` - Sign payment confirmation
- `POST /api/documents/upload` - Upload and pin invoice document to IPFS
- `GET /api/kyc/status/:address` - Get KYC status (mocked)

**Security:**
- Private key stored in environment variables (MVP) / KMS (production)
- Rate limiting on attestation endpoints
- Request validation and signature verification

**Communication:**
- **Inbound:** REST API calls from Web Application
- **Outbound:**
  - JSON-RPC to Sui network (monitor events, submit transactions)
  - HTTP to IPFS (pin documents)
  - SQL to Application Database

#### 3. Event Indexer
**Technology:** TypeScript, Node.js  
**Responsibilities:**
- Subscribe to Sui blockchain events
- Index InvoiceIssued, InvoiceFinanced, PaymentConfirmed events
- Provide fast query API for invoice lists and history
- Aggregate analytics data

**Key APIs:**
- `GET /api/invoices` - List invoices with filtering
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/history` - Get invoice lifecycle events
- `GET /api/analytics/summary` - Get platform statistics

**Communication:**
- **Inbound:** REST API calls from Web Application
- **Outbound:**
  - WebSocket to Sui network (subscribe to events)
  - SQL to Application Database (store indexed data)

#### 4. Smart Contracts (Move Modules)
**Technology:** Move language on Sui  
**Responsibilities:**
- Define Invoice object structure and lifecycle
- Enforce state transition rules
- Verify oracle signatures
- Handle token transfers (financing, settlement)
- Emit events for all state changes
- Manage access control via OracleRegistry

**Key Modules:**
- `invoice_finance.move` - Core invoice lifecycle logic
- `test_token.move` - MockUSD stablecoin for demo (or use SUI)

**Key Structs:**
- `Invoice<CoinType>` - Core invoice object
- `OracleRegistry` - Stores oracle authority addresses
- `SettlementEscrow<CoinType>` - Holds settlement funds
- `FinanceDeal<CoinType>` - Records financing transaction (optional)

**Key Functions:**
- `issue_invoice<CoinType>(...)` - Mint new invoice
- `accept_finance<CoinType>(...)` - Finance an invoice
- `confirm_payment<CoinType>(...)` - Settle invoice after payment
- `raise_dispute<CoinType>(...)` - Flag invoice as disputed

#### 5. Application Database
**Technology:** PostgreSQL  
**Schema:**
- `users` - User profiles, KYC status
- `indexed_invoices` - Cached invoice data for fast queries
- `events` - Blockchain events log
- `sessions` - User authentication sessions
- `kyc_records` - KYC verification data (mocked)

**Communication:**
- **Inbound:** SQL queries from Oracle Backend and Event Indexer
- **Outbound:** None (data store)

### Data Flow Patterns

#### Invoice Issuance Flow
```
Supplier (Web App) 
  → Upload Document (Backend → IPFS)
  → Request Issuance Signature (Backend signs)
  → Submit Transaction (Web App → Sui Network)
  → Event Emitted (Sui Network)
  → Event Indexed (Indexer → Database)
  → UI Updated (Web App subscribes to updates)
```

#### Invoice Financing Flow
```
Financier (Web App)
  → Browse Invoices (Query Indexer)
  → Select Invoice
  → Submit Finance Transaction (Web App → Sui Network)
  → Tokens Transferred (Smart Contract execution)
  → Event Emitted
  → UI Updated
```

#### Settlement Flow
```
Buyer Pays Off-Chain
  → Oracle Observes Payment (Backend)
  → Oracle Signs Attestation (Backend)
  → Settlement Transaction Submitted (Web App → Sui Network)
  → Smart Contract Verifies Signature
  → Tokens Transferred to Financier
  → Event Emitted
  → UI Updated
```

---

## Level 3: Component Diagram - Web Application

### Overview
Detailed breakdown of the Web Application container.

### Diagram

```mermaid
C4Component
    title Component Diagram - Web Application

    Container_Boundary(webapp, "Web Application") {
        Component(pages, "Page Components", "Next.js Pages", "Route handlers and page layouts")
        Component(components, "UI Components", "React", "Reusable UI elements")
        Component(hooks, "Custom Hooks", "React Hooks", "Business logic and state management")
        Component(suiClient, "Sui Client", "TypeScript", "Blockchain interaction layer")
        Component(apiClient, "API Client", "TypeScript", "Backend communication")
        Component(walletAdapter, "Wallet Adapter", "@mysten/dapp-kit", "Wallet connection management")
        Component(stateManager, "State Manager", "React Context", "Global application state")
    }

    System_Ext(sui, "Sui Network")
    System_Ext(backend, "Oracle Backend")
    System_Ext(indexer, "Event Indexer")
    System_Ext(wallet, "Wallet Provider")

    Rel(pages, components, "Uses")
    Rel(pages, hooks, "Uses")
    Rel(hooks, suiClient, "Calls")
    Rel(hooks, apiClient, "Calls")
    Rel(hooks, stateManager, "Updates/reads")
    
    Rel(suiClient, sui, "JSON-RPC")
    Rel(suiClient, walletAdapter, "Uses")
    Rel(apiClient, backend, "REST API")
    Rel(apiClient, indexer, "REST API")
    Rel(walletAdapter, wallet, "Connects")
```

### Component Details

#### Pages (Next.js Routes)
- `/` - Landing page
- `/dashboard` - User dashboard
- `/marketplace` - Invoice marketplace listing
- `/invoice/[id]` - Invoice detail view
- `/issue` - Issue new invoice form
- `/how-it-works` - Platform information

#### UI Components
- `Navigation.tsx` - Top navigation bar with wallet connection
- `Footer.tsx` - Footer component
- `InvoiceCard.tsx` - Invoice summary card for marketplace
- `InvoiceDetail.tsx` - Detailed invoice view
- `IssueForm.tsx` - Invoice creation form
- `FinanceButton.tsx` - Purchase invoice action
- `DisputeButton.tsx` - Raise dispute action
- `TransactionStatus.tsx` - Transaction progress indicator
- `AuditTrail.tsx` - Invoice history viewer

#### Custom Hooks
- `useWallet.ts` - Wallet connection state
- `useInvoices.ts` - Invoice querying and management
- `useTransaction.ts` - Transaction submission and tracking
- `useOracle.ts` - Oracle API interactions
- `useInvoiceForm.ts` - Form state and validation

#### Sui Client
**Responsibilities:**
- Connect to Sui RPC nodes
- Query on-chain objects and state
- Build and submit transactions
- Subscribe to events
- Parse transaction results

**Key Methods:**
- `queryInvoices(status)` - Get invoices by status
- `getInvoice(id)` - Get specific invoice object
- `issueInvoice(params)` - Submit invoice creation transaction
- `financeInvoice(invoiceId, payment)` - Submit financing transaction
- `confirmPayment(invoiceId, signature)` - Submit settlement transaction

---

## Level 3: Component Diagram - Oracle Backend

### Diagram

```mermaid
C4Component
    title Component Diagram - Oracle Backend

    Container_Boundary(backend, "Oracle Backend") {
        Component(routes, "API Routes", "Express Router", "HTTP endpoint handlers")
        Component(oracleService, "Oracle Service", "TypeScript", "Signing and attestation logic")
        Component(ipfsService, "IPFS Service", "TypeScript", "Document upload and pinning")
        Component(kycService, "KYC Service", "TypeScript", "Mock KYC management")
        Component(keyManager, "Key Manager", "TypeScript", "Private key handling")
        Component(eventMonitor, "Event Monitor", "TypeScript", "Blockchain event watcher")
    }

    ContainerDb(db, "Database", "PostgreSQL")
    System_Ext(sui, "Sui Network")
    System_Ext(ipfs, "IPFS Network")

    Rel(routes, oracleService, "Calls")
    Rel(routes, ipfsService, "Calls")
    Rel(routes, kycService, "Calls")
    
    Rel(oracleService, keyManager, "Uses")
    Rel(oracleService, db, "Logs attestations")
    
    Rel(eventMonitor, sui, "Subscribes")
    Rel(eventMonitor, oracleService, "Triggers")
    
    Rel(ipfsService, ipfs, "Pins files")
    Rel(kycService, db, "Reads/writes")
```

### Component Details

#### API Routes
**Endpoints:**
- `POST /api/oracle/sign-issuance` 
  - Input: { issuer, buyer_hash, amount, due_date, doc_hash }
  - Output: { signature, timestamp, nonce }
  
- `POST /api/oracle/sign-payment`
  - Input: { invoice_id, amount, payment_proof }
  - Output: { signature, timestamp }

- `POST /api/documents/upload`
  - Input: FormData with PDF file
  - Output: { ipfs_hash, cid }

- `GET /api/kyc/status/:address`
  - Output: { address, status: "approved" | "pending" | "rejected", timestamp }

#### Oracle Service
**Responsibilities:**
- Generate and sign attestations using Ed25519/ECDSA
- Implement nonce-based replay protection
- Validate request parameters
- Log all attestations to database

**Signature Format:**
```typescript
{
  message: {
    invoice_id: string,
    action: "issue" | "payment",
    timestamp: number,
    nonce: string,
    ...additionalData
  },
  signature: string, // hex-encoded
  publicKey: string  // oracle public key
}
```

#### Key Manager
**Responsibilities:**
- Load private keys from secure storage (env vars for MVP, KMS for production)
- Provide signing interface
- Implement key rotation logic (future)

---

## Level 3: Component Diagram - Smart Contracts

### Diagram

```mermaid
C4Component
    title Component Diagram - Move Smart Contracts

    Container_Boundary(contracts, "Smart Contracts") {
        Component(invoiceModule, "Invoice Module", "Move", "Core invoice lifecycle logic")
        Component(oracleRegistry, "Oracle Registry", "Move", "Authority management")
        Component(tokenModule, "Test Token Module", "Move", "MockUSD implementation")
    }

    Component_Ext(suiFramework, "Sui Framework", "Move stdlib")
    Component_Ext(clock, "Sui Clock", "System object")

    Rel(invoiceModule, oracleRegistry, "Validates authorities")
    Rel(invoiceModule, tokenModule, "Transfers tokens")
    Rel(invoiceModule, suiFramework, "Uses")
    Rel(invoiceModule, clock, "Reads timestamp")
```

### Key Structs and Functions

#### Invoice Module
**Structs:**
- `Invoice<CoinType>` - Core invoice object with lifecycle state
- `SettlementEscrow<CoinType>` - Temporary escrow for settlement funds
- `FinanceDeal<CoinType>` - Optional record of financing transaction

**Entry Functions:**
- `issue_invoice<CoinType>()` - Create new invoice (with signature validation)
- `accept_finance<CoinType>()` - Finance an invoice (atomic token transfer)
- `deposit_payment<CoinType>()` - Oracle deposits settlement funds
- `confirm_payment<CoinType>()` - Complete settlement (with signature check)
- `raise_dispute<CoinType>()` - Flag invoice as disputed
- `cancel_invoice<CoinType>()` - Cancel unfunded invoice

**Events:**
- `InvoiceIssued<CoinType>` - Emitted on invoice creation
- `InvoiceFinanced<CoinType>` - Emitted on financing
- `PaymentDeposited<CoinType>` - Emitted when oracle deposits funds
- `PaymentConfirmed` - Emitted on settlement
- `SettlementExecuted<CoinType>` - Emitted when financier receives payout
- `DisputeRaised` - Emitted on dispute
- `InvoiceCanceled` - Emitted on cancellation

---

## Technology Stack Summary

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Blockchain SDK:** @mysten/sui.js, @mysten/dapp-kit
- **State Management:** React Context + hooks
- **HTTP Client:** fetch API

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database Client:** pg (PostgreSQL)
- **Cryptography:** @noble/ed25519 or similar
- **IPFS Client:** ipfs-http-client or Pinata SDK

### Smart Contracts
- **Language:** Move
- **Platform:** Sui blockchain
- **Development:** Sui CLI, Move Prover (optional)

### Infrastructure
- **Blockchain:** Sui Testnet/Devnet
- **Database:** PostgreSQL 15+
- **Document Storage:** IPFS (Pinata, Web3.Storage, or self-hosted)
- **Hosting:** Vercel (frontend), AWS/Railway (backend)

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "User Devices"
        Browser[Web Browser]
        Wallet[Sui Wallet Extension]
    end

    subgraph "Frontend Hosting - Vercel"
        NextJS[Next.js Application]
    end

    subgraph "Backend Hosting - AWS/Railway"
        Backend[Oracle Backend Service]
        Indexer[Event Indexer Service]
        DB[(PostgreSQL)]
    end

    subgraph "Blockchain Network"
        SuiTestnet[Sui Testnet RPC Nodes]
        Contracts[Deployed Smart Contracts]
    end

    subgraph "External Services"
        IPFS[IPFS/Pinata]
    end

    Browser --> NextJS
    Browser --> Wallet
    NextJS --> Backend
    NextJS --> Indexer
    NextJS --> SuiTestnet
    Wallet --> SuiTestnet
    Backend --> DB
    Backend --> SuiTestnet
    Backend --> IPFS
    Indexer --> DB
    Indexer --> SuiTestnet
    Contracts -.deployed on.-> SuiTestnet
```

---

## Security Architecture

### Authentication & Authorization
- **User Authentication:** Wallet-based (signature verification)
- **Oracle Authentication:** Private key signing (controlled by platform)
- **API Authentication:** Bearer tokens for backend APIs (future)

### Data Protection
- **In Transit:** HTTPS for all web traffic, TLS for database connections
- **At Rest:** Encrypted database, private keys in KMS (production)
- **On-Chain:** Only hashed identifiers and attestations (no PII)

### Access Control Layers
1. **Smart Contract:** OracleRegistry enforces oracle authority
2. **Backend API:** Rate limiting, request validation
3. **Frontend:** UI-level restrictions (not security boundary)

### Threat Mitigations
- **Replay Attacks:** Nonce-based signature scheme
- **Double Financing:** Invoice object ownership prevents duplication
- **Oracle Compromise:** Timelock for disputes, multi-sig planned
- **Smart Contract Bugs:** Testing, audit roadmap
- **Frontend Attacks:** Content Security Policy, CORS

---

## Scalability Considerations

### Current Capacity (MVP)
- **Users:** 100-1000 concurrent
- **Invoices:** 10,000+ objects
- **Transactions:** 10-100 per minute

### Scaling Strategies

#### Horizontal Scaling
- Frontend: CDN distribution via Vercel
- Backend: Stateless services, load balancer
- Indexer: Multiple instances with partitioned event streams

#### Database Optimization
- Indexed queries on invoice status, timestamps
- Materialized views for analytics
- Read replicas for query load

#### Blockchain Optimization
- Parallel transaction submission for independent invoices
- Batch event processing in indexer
- Optimized Move code (minimal gas)

---

## Monitoring & Observability

### Metrics
- **Transaction Success Rate**
- **API Response Times (p50, p95, p99)**
- **Blockchain Event Processing Lag**
- **Error Rates by Component**
- **User Journey Completion Rates**

### Logging
- Structured logging (JSON format)
- Correlation IDs across services
- Separate logs for: application, security, transactions

### Alerting
- Transaction failures spike
- Oracle signing errors
- Database connection issues
- High latency warnings

---

## Future Architecture Evolution

### Phase 1: Enhanced Reliability
- Multi-region backend deployment
- Hot standby oracle service
- Automated failover

### Phase 2: Decentralization
- Multi-sig oracle (threshold signatures)
- Federated identity (DID integration)
- Governance module for protocol upgrades

### Phase 3: Advanced Features
- Layer-2 indexing solution (The Graph equivalent)
- Real-time analytics engine
- Mobile native apps

### Phase 4: Enterprise Integration
- ERP connectors (SAP, Oracle, NetSuite)
- Bank API integrations
- Regulatory reporting automation

---

**Document Owner:** Architecture Team  
**Last Updated:** November 14, 2025  
**Next Review:** Post-MVP deployment

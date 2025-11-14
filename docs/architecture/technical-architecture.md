# Technical Architecture Document

## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Date:** November 14, 2025  
**Status:** MVP Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Smart Contract Architecture](#smart-contract-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Data Architecture](#data-architecture)
9. [Security Architecture](#security-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Deployment Architecture](#deployment-architecture)
12. [Development Workflow](#development-workflow)
13. [Testing Strategy](#testing-strategy)
14. [Monitoring & Observability](#monitoring--observability)
15. [Disaster Recovery](#disaster-recovery)

---

## 1. Executive Summary

This document defines the technical architecture for the On-Chain Invoice Financing & Settlement platform built on Sui blockchain. The system enables transparent, verifiable invoice financing with automated settlement through oracle-verified payment confirmations.

### Key Architectural Characteristics

- **Blockchain-Native:** Core logic implemented as Sui Move smart contracts
- **Event-Driven:** Real-time synchronization via blockchain events
- **Hybrid Architecture:** On-chain immutable state + off-chain indexing for performance
- **Oracle-Mediated:** Trusted attestation bridge between traditional finance and blockchain
- **Privacy-Preserving:** Only hashed identifiers and proofs stored on-chain

---

## 2. Architectural Principles

### 2.1 Core Principles

#### Separation of Concerns

- **On-Chain:** Immutable state, ownership, value transfer, lifecycle enforcement
- **Off-Chain:** User interface, indexing, document storage, KYC, oracle signing
- **Rationale:** Optimize for blockchain strengths (trust, immutability) while keeping complex business logic and PII off-chain

#### Eventual Consistency

- Blockchain state is source of truth
- Indexer provides eventually consistent read-optimized views
- UI reflects latest indexed state with real-time updates via events

#### Fail-Safe Defaults

- Smart contracts reject invalid state transitions
- Oracle signatures expire after time window
- Dispute mechanisms provide safety valves

#### Progressive Decentralization

- **Phase 1 (MVP):** Centralized oracle, managed deployment
- **Phase 2:** Multi-sig oracle, community governance proposals
- **Phase 3:** Fully decentralized oracle network, DAO governance

### 2.2 Design Patterns

#### 1. Object-Centric State Management

Each invoice is a first-class Sui object with:

- Unique identifier (UID)
- Owner address (supplier, then financier)
- Mutable state fields (status, timestamps)
- Immutable economic terms (face_value, due_date)

**Benefits:**

- Natural ownership model
- Atomic state transitions
- Parallel processing of independent invoices

#### 2. Capability-Based Access Control

Authority managed via capability objects:

```move
struct OracleRegistry has key {
    id: UID,
    oracle: address,  // authorized signer
    ...
}
```

**Benefits:**

- Explicit authorization model
- Revocable permissions
- Auditable access control changes

#### 3. Event Sourcing

All state changes emit structured events:

```move
struct InvoiceFinanced<CoinType> has copy, drop {
    invoice_id: ID,
    financier: address,
    purchase_price: u64,
    ...
}
```

**Benefits:**

- Complete audit trail
- Efficient off-chain indexing
- Real-time UI updates

#### 4. Two-Phase Settlement

1. **Deposit Phase:** Oracle deposits settlement funds to escrow
2. **Confirmation Phase:** Contract verifies and distributes to financier

**Benefits:**

- Separates oracle authority from fund distribution
- Enables additional validation checks
- Supports dispute windows

---

## 3. Technology Stack

### 3.1 Smart Contracts

| Component   | Technology          | Version         | Rationale                                                       |
| ----------- | ------------------- | --------------- | --------------------------------------------------------------- |
| Language    | Move                | Sui Move        | Resource-oriented programming, linear types prevent duplication |
| Platform    | Sui Blockchain      | Testnet/Mainnet | Object-centric model, parallel execution, low latency           |
| Development | Sui CLI             | Latest          | Official tooling for compilation, testing, deployment           |
| Testing     | Move Test Framework | Built-in        | Unit testing for Move modules                                   |

### 3.2 Backend Services

| Component      | Technology                     | Version | Rationale                                             |
| -------------- | ------------------------------ | ------- | ----------------------------------------------------- |
| Runtime        | Node.js                        | 20 LTS  | JavaScript ecosystem, async I/O for blockchain events |
| Framework      | Express.js                     | 4.x     | Lightweight, flexible REST API framework              |
| Language       | TypeScript                     | 5.x     | Type safety, better developer experience              |
| Blockchain SDK | @mysten/sui.js                 | Latest  | Official Sui SDK for JavaScript                       |
| Database       | PostgreSQL                     | 15+     | Relational data, ACID compliance, JSON support        |
| ORM            | Prisma                         | 5.x     | Type-safe database client, migrations                 |
| Cryptography   | @noble/ed25519                 | Latest  | Pure TypeScript Ed25519 implementation                |
| IPFS Client    | Pinata SDK or ipfs-http-client | Latest  | Document storage integration                          |

### 3.3 Frontend

| Component          | Technology            | Version         | Rationale                                       |
| ------------------ | --------------------- | --------------- | ----------------------------------------------- |
| Framework          | Next.js               | 14 (App Router) | SSR, routing, optimized builds, React ecosystem |
| UI Library         | React                 | 18              | Component-based, large ecosystem                |
| Language           | TypeScript            | 5.x             | Type safety across stack                        |
| Styling            | TailwindCSS           | 3.x             | Utility-first, rapid development                |
| Blockchain SDK     | @mysten/sui.js        | Latest          | Query state, build transactions                 |
| Wallet Integration | @mysten/dapp-kit      | Latest          | Official Sui wallet adapter                     |
| State Management   | React Context + Hooks | Built-in        | Sufficient for MVP, can scale to Zustand/Redux  |
| HTTP Client        | Fetch API             | Native          | Modern, promise-based                           |

### 3.4 Infrastructure

| Component          | Technology                                                    | Rationale                                         |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| Blockchain Network | Sui Testnet/Devnet (MVP), Mainnet (Production)                | Official networks                                 |
| Frontend Hosting   | Vercel                                                        | Optimized for Next.js, CDN, automatic deployments |
| Backend Hosting    | Railway or AWS                                                | Container support, easy scaling                   |
| Database Hosting   | Railway PostgreSQL or AWS RDS                                 | Managed PostgreSQL                                |
| Document Storage   | IPFS (Pinata or Web3.Storage)                                 | Decentralized, content-addressed                  |
| Secret Management  | Environment Variables (MVP), AWS Secrets Manager (Production) | Secure credential storage                         |
| CI/CD              | GitHub Actions                                                | Automated testing, deployment                     |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Supplier   │  │  Financier   │  │    Admin     │          │
│  │   Browser    │  │   Browser    │  │   Browser    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                  Application Layer (Vercel)                      │
│                  ┌─────────┴─────────┐                           │
│                  │  Next.js Web App  │                           │
│                  │  - React UI       │                           │
│                  │  - Sui SDK        │                           │
│                  │  - Wallet Adapter │                           │
│                  └────┬──────────┬───┘                           │
└───────────────────────┼──────────┼───────────────────────────────┘
                        │          │
        ┌───────────────┘          └───────────────┐
        │                                           │
┌───────┼───────────────────────────────────────────┼──────────────┐
│       │           Backend Services Layer          │              │
│  ┌────▼───────────┐                    ┌─────────▼─────────┐    │
│  │ Oracle Backend │                    │  Event Indexer    │    │
│  │ - Attestations │                    │  - Event Stream   │    │
│  │ - IPFS Upload  │                    │  - Data Transform │    │
│  │ - KYC Mock     │                    │  - API Server     │    │
│  └────┬───────────┘                    └─────────┬─────────┘    │
│       │                                           │              │
│       └────────────────┬──────────────────────────┘              │
│                        │                                         │
│                ┌───────▼──────────┐                              │
│                │   PostgreSQL     │                              │
│                │   - Indexed Data │                              │
│                │   - KYC Records  │                              │
│                │   - Audit Logs   │                              │
│                └──────────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
                        │
                        │
┌───────────────────────┼──────────────────────────────────────────┐
│                       │   External Services Layer                │
│  ┌────────────────────┼──────────────────┐                       │
│  │                    │                  │                       │
│  │  ┌─────────────────▼────────┐  ┌──────▼────────┐             │
│  │  │   Sui Blockchain Network │  │ IPFS Network  │             │
│  │  │   - Smart Contracts      │  │ - Documents   │             │
│  │  │   - Invoice Objects      │  │ - CIDs        │             │
│  │  │   - Events Stream        │  └───────────────┘             │
│  │  └──────────────────────────┘                                │
│  └────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Overview

#### Write Path (State Mutation)

```
User Action → Frontend → Sui Wallet (Sign) → Sui RPC (Submit)
→ Smart Contract (Validate & Execute) → Event Emitted
→ Indexer (Consume & Store) → Database Updated
```

#### Read Path (Query)

```
User Request → Frontend → Indexer API (Fast Query) → Database
Alternative: Frontend → Sui RPC (Direct Query) → Blockchain State
```

---

## 5. Smart Contract Architecture

### 5.1 Module Structure

```
invoice_financing/
├── Move.toml                 # Package manifest
├── sources/
│   ├── invoice_finance.move  # Core invoice lifecycle logic
│   └── test_token.move       # MockUSD stablecoin (optional)
└── tests/
    └── invoice_tests.move    # Unit tests
```

### 5.2 Core Data Structures

#### Invoice Object

```move
struct Invoice<CoinType> has key {
    id: UID,
    issuer: address,              // Supplier
    buyer_hash: vector<u8>,       // Hashed buyer identifier (no PII)
    face_value: u64,              // Nominal amount (in smallest unit)
    due_ts: u64,                  // Due date (unix timestamp)
    status: u8,                   // 0=ISSUED, 1=FINANCED, 2=PAID, 3=DISPUTED, 4=CANCELED
    financier: Option<address>,   // Financier address (if financed)
    discount_bps: u64,            // Discount rate in basis points (e.g., 320 = 3.2%)
    doc_hash: vector<u8>,         // IPFS CID of invoice document
    issued_at: u64,               // Creation timestamp
    financed_at: Option<u64>,     // Financing timestamp
    paid_at: Option<u64>,         // Settlement timestamp
    dispute_until: Option<u64>,   // Dispute window expiration
    issuance_note_hash: vector<u8>, // Hash of issuance attestation (for audit)
}
```

#### OracleRegistry (Shared Object)

```move
struct OracleRegistry has key {
    id: UID,
    oracle: address,                      // Authorized oracle address
    issuer_authority: Option<address>,    // Optional issuer attestor
    default_dispute_window_secs: u64,     // Default dispute timelock
}
```

#### SettlementEscrow

```move
struct SettlementEscrow<CoinType> has key {
    id: UID,
    invoice_id: ID,                  // Reference to Invoice
    funds: Balance<CoinType>,        // Escrowed settlement funds
    depositor: address,              // Oracle address
    created_at: u64,                 // Deposit timestamp
}
```

### 5.3 State Machine

```
         issue_invoice()
              │
              ▼
         ┌─────────┐
         │ ISSUED  │◄─────── Initial state after creation
         └────┬────┘
              │ accept_finance()
              ▼
         ┌──────────┐
    ┌───►│ FINANCED │
    │    └────┬─────┘
    │         │ confirm_payment()
    │         ▼
    │    ┌────────┐
    │    │  PAID  │◄─────── Terminal state (successful)
    │    └────────┘
    │
    │    raise_dispute()
    │         ▼
    │    ┌──────────┐
    └────│ DISPUTED │◄─────── Blocks settlement, requires resolution
         └──────────┘
              │
         cancel_invoice()
              ▼
         ┌──────────┐
         │ CANCELED │◄─────── Terminal state (aborted)
         └──────────┘
```

### 5.4 Entry Functions

#### issue_invoice<CoinType>()

**Purpose:** Create new invoice object  
**Authorization:** Any user (supplier)  
**Parameters:**

- `registry: &OracleRegistry` - Access to oracle config
- `buyer_hash: vector<u8>` - Hashed buyer identifier
- `face_value: u64` - Invoice amount
- `due_ts: u64` - Payment due date
- `discount_bps: u64` - Discount rate
- `doc_hash: vector<u8>` - IPFS document hash
- `issuance_note_hash: vector<u8>` - Attestation hash
- `clock: &Clock` - System clock
- `ctx: &mut TxContext` - Transaction context

**Validation:**

- `face_value > 0`
- `due_ts > current_timestamp` (optionally)
- Signature verification (if implemented)

**Effects:**

- Create `Invoice` object with status=ISSUED
- Transfer to sender (issuer)
- Emit `InvoiceIssued` event

#### accept_finance<CoinType>()

**Purpose:** Finance an invoice (atomic purchase)  
**Authorization:** Any user (financier)  
**Parameters:**

- `invoice: &mut Invoice<CoinType>` - Invoice to finance
- `payment: Coin<CoinType>` - Payment from financier
- `clock: &Clock`
- `registry: &OracleRegistry`
- `ctx: &mut TxContext`

**Validation:**

- `invoice.status == ISSUED`
- `payment.value >= required_purchase_price`
- `sender != invoice.issuer` (prevent self-financing)

**Effects:**

- Transfer `purchase_price` to issuer
- Return excess to financier
- Update invoice: `status=FINANCED`, `financier=sender`, `financed_at=now`
- Set `dispute_until` (if configured)
- Emit `InvoiceFinanced` event

#### confirm_payment<CoinType>()

**Purpose:** Complete settlement after payment verification  
**Authorization:** Oracle only  
**Parameters:**

- `registry: &OracleRegistry` - Oracle authority
- `invoice: &mut Invoice<CoinType>` - Invoice to settle
- `escrow: SettlementEscrow<CoinType>` - Settlement funds
- `clock: &Clock`

**Validation:**

- `sender == registry.oracle`
- `invoice.status == FINANCED`
- `invoice.status != DISPUTED`
- `escrow.invoice_id == invoice.id`

**Effects:**

- Transfer `face_value` from escrow to financier
- Update invoice: `status=PAID`, `paid_at=now`
- Delete `SettlementEscrow` object
- Emit `PaymentConfirmed` and `SettlementExecuted` events

#### raise_dispute<CoinType>()

**Purpose:** Flag invoice as disputed (blocks settlement)  
**Authorization:** Issuer, Financier, or Oracle  
**Parameters:**

- `invoice: &mut Invoice<CoinType>`
- `reason_hash: vector<u8>` - Hashed reason text
- `clock: &Clock`

**Validation:**

- Sender is authorized party
- Within dispute window (if set)
- Invoice not already PAID or CANCELED

**Effects:**

- Update invoice: `status=DISPUTED`
- Emit `DisputeRaised` event

### 5.5 Event Definitions

```move
// Emitted when invoice is created
struct InvoiceIssued<CoinType> has copy, drop {
    invoice_id: ID,
    issuer: address,
    face_value: u64,
    due_ts: u64,
    doc_hash: vector<u8>,
}

// Emitted when invoice is financed
struct InvoiceFinanced<CoinType> has copy, drop {
    invoice_id: ID,
    financier: address,
    purchase_price: u64,
    discount_bps: u64,
    financed_at: u64,
}

// Emitted when payment is confirmed
struct PaymentConfirmed has copy, drop {
    invoice_id: ID,
    paid_at: u64,
}

// Emitted when settlement executes
struct SettlementExecuted<CoinType> has copy, drop {
    invoice_id: ID,
    to: address,  // Financier
    amount: u64,
}

// Emitted when dispute is raised
struct DisputeRaised has copy, drop {
    invoice_id: ID,
    by: address,
    at: u64,
    reason_hash: vector<u8>,
}
```

### 5.6 Gas Optimization Strategies

1. **Minimal On-Chain Data:** Store only essential fields, keep metadata off-chain
2. **Efficient Data Types:** Use fixed-size types (u64) instead of arbitrary-precision
3. **Batch Operations:** (Future) Support batch issuance/financing in single transaction
4. **Event Consolidation:** Single event per state change (avoid redundant emissions)
5. **Object Recycling:** Delete temporary objects (escrow) after use

---

## 6. Backend Architecture

### 6.1 Oracle Backend Service

#### Responsibilities

- Sign issuance and payment attestations
- Manage oracle private keys securely
- Upload documents to IPFS
- Mock KYC status management
- Monitor blockchain events (optional automation)

#### API Endpoints

```typescript
// Sign invoice issuance attestation
POST /api/oracle/sign-issuance
Request: {
  issuer: string,          // Supplier address
  buyer_hash: string,      // Hex-encoded hash
  amount: number,          // Face value
  due_date: number,        // Unix timestamp
  doc_hash: string,        // IPFS CID
  discount_bps: number     // Discount rate
}
Response: {
  signature: string,       // Hex-encoded Ed25519 signature
  nonce: string,           // Unique nonce (replay protection)
  timestamp: number,       // Signature timestamp
  oracle_pubkey: string    // Oracle public key
}

// Sign payment confirmation attestation
POST /api/oracle/sign-payment
Request: {
  invoice_id: string,      // Invoice object ID
  amount: number,          // Payment amount
  payment_proof?: string   // Optional external reference
}
Response: {
  signature: string,
  timestamp: number,
  nonce: string
}

// Upload invoice document to IPFS
POST /api/documents/upload
Request: multipart/form-data (PDF file)
Response: {
  ipfs_hash: string,       // CID
  url: string              // Gateway URL
}

// Get KYC status (mocked)
GET /api/kyc/status/:address
Response: {
  address: string,
  status: "approved" | "pending" | "rejected",
  timestamp: number
}
```

#### Signature Generation Logic

```typescript
interface SignatureMessage {
  action: "issue" | "payment";
  invoice_id?: string;
  issuer?: string;
  buyer_hash?: string;
  amount: number;
  due_date?: number;
  doc_hash?: string;
  nonce: string;
  timestamp: number;
}

function generateAttestation(message: SignatureMessage): string {
  // 1. Serialize message to canonical JSON (sorted keys)
  const canonical = JSON.stringify(message, Object.keys(message).sort());

  // 2. Hash with SHA256
  const messageHash = sha256(canonical);

  // 3. Sign hash with oracle private key (Ed25519)
  const signature = ed25519.sign(messageHash, oraclePrivateKey);

  // 4. Return hex-encoded signature
  return Buffer.from(signature).toString("hex");
}
```

#### Security Measures

- **Rate Limiting:** Max 10 requests/minute per IP
- **Request Validation:** Schema validation with Zod or Joi
- **Nonce Management:** Store used nonces in database to prevent replay
- **Key Storage:** Environment variables for MVP, AWS KMS for production
- **Audit Logging:** Log all signature requests with timestamp and requester

### 6.2 Event Indexer Service

#### Responsibilities

- Subscribe to Sui blockchain events via WebSocket
- Parse and transform event data
- Store in PostgreSQL for fast queries
- Provide REST API for frontend

#### Event Processing Pipeline

```typescript
// 1. Connect to Sui WebSocket
const provider = new SuiClient({ url: SUI_RPC_URL });
const subscription = provider.subscribeEvent({
  filter: {
    MoveModule: {
      package: PACKAGE_ID,
      module: "invoice_finance",
    },
  },
});

// 2. Handle incoming events
subscription.on("message", async (event) => {
  const eventType = event.type;

  switch (eventType) {
    case "InvoiceIssued":
      await handleInvoiceIssued(event);
      break;
    case "InvoiceFinanced":
      await handleInvoiceFinanced(event);
      break;
    case "PaymentConfirmed":
      await handlePaymentConfirmed(event);
      break;
    // ... other event types
  }
});

// 3. Transform and store
async function handleInvoiceIssued(event: Event) {
  const { invoice_id, issuer, face_value, due_ts } = event.parsedJson;

  await db.invoice.create({
    data: {
      invoice_id: invoice_id,
      issuer: issuer,
      face_value: BigInt(face_value),
      due_date: new Date(due_ts * 1000),
      status: "ISSUED",
      created_at: new Date(),
    },
  });

  // Emit WebSocket update to connected clients
  wss.broadcast({ type: "invoice_created", invoice_id });
}
```

#### API Endpoints

```typescript
// List invoices with filtering
GET /api/invoices?status=ISSUED&sort=due_date&order=asc&limit=50&offset=0
Response: {
  invoices: Invoice[],
  total: number,
  page: number
}

// Get specific invoice
GET /api/invoices/:id
Response: Invoice

// Get invoice history (all events)
GET /api/invoices/:id/history
Response: {
  events: Event[],
  transitions: StateTransition[]
}

// Get analytics summary
GET /api/analytics/summary
Response: {
  total_invoices: number,
  total_financed: number,
  total_settled: number,
  total_volume: string,
  avg_time_to_finance: number,
  avg_time_to_settlement: number
}
```

---

## 7. Frontend Architecture

### 7.1 Next.js Application Structure

```
dapp/
├── app/                          # App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   ├── providers.tsx             # Context providers
│   ├── globals.css               # Global styles
│   ├── dashboard/
│   │   └── page.tsx              # User dashboard
│   ├── marketplace/
│   │   ├── page.tsx              # Invoice marketplace
│   │   └── [id]/
│   │       └── page.tsx          # Invoice detail
│   └── issue/
│       └── page.tsx              # Issue invoice form
├── components/
│   ├── Navigation.tsx            # Top nav with wallet connect
│   ├── Footer.tsx
│   ├── InvoiceCard.tsx           # Marketplace invoice card
│   ├── InvoiceDetail.tsx         # Detailed invoice view
│   ├── IssueForm.tsx             # Invoice creation form
│   ├── FinanceButton.tsx         # Purchase action
│   ├── DisputeButton.tsx         # Dispute action
│   ├── TransactionStatus.tsx    # TX progress indicator
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
├── hooks/
│   ├── useWallet.ts              # Wallet connection state
│   ├── useInvoices.ts            # Invoice data fetching
│   ├── useTransaction.ts         # TX submission & tracking
│   ├── useOracle.ts              # Oracle API calls
│   └── useWebSocket.ts           # Real-time updates
├── lib/
│   ├── suiClient.ts              # Sui RPC client
│   ├── apiClient.ts              # Backend API client
│   ├── constants.ts              # Contract addresses, config
│   └── utils.ts                  # Helper functions
└── public/
    └── assets/                   # Static images, icons
```

### 7.2 Key Custom Hooks

#### useWallet

```typescript
export function useWallet() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  return {
    address: currentAccount?.address,
    connected: !!currentAccount,
    signTransaction: signAndExecute,
  };
}
```

#### useInvoices

```typescript
export function useInvoices(filters?: InvoiceFilters) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      const response = await apiClient.get("/api/invoices", {
        params: filters,
      });
      setInvoices(response.data.invoices);
      setLoading(false);
    }
    fetchInvoices();
  }, [filters]);

  return { invoices, loading };
}
```

#### useTransaction

```typescript
export function useTransaction() {
  const { signTransaction } = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");

  const submitTransaction = async (txBlock: TransactionBlock) => {
    setStatus("signing");
    try {
      const result = await signTransaction({ transactionBlock: txBlock });
      setStatus("submitted");

      // Poll for confirmation
      await waitForTransaction(result.digest);
      setStatus("confirmed");

      return result;
    } catch (error) {
      setStatus("error");
      throw error;
    }
  };

  return { submitTransaction, status };
}
```

### 7.3 State Management Strategy

#### Global State (React Context)

- Wallet connection state
- User preferences (theme, language)
- Network configuration (RPC endpoints, contract addresses)

#### Server State (React Query / SWR)

- Invoice data (cached, auto-refreshed)
- Transaction history
- Analytics data

#### Local Component State

- Form inputs
- UI toggles (modals, dropdowns)
- Transient status messages

### 7.4 Styling Architecture

#### TailwindCSS Utility-First

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900">Invoice #{id}</h3>
  <Badge className="bg-green-100 text-green-800">{status}</Badge>
</div>
```

#### Component Variants (CVA - class-variance-authority)

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-input hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## 8. Data Architecture

### 8.1 On-Chain Data (Sui Blockchain)

**Invoice Objects:**

- Stored as owned Sui objects
- Indexed by object ID (UID)
- Queried via `suiClient.getObject(id)` or event subscriptions

**Storage Characteristics:**

- **Durability:** Permanent, replicated across validators
- **Availability:** High (blockchain consensus)
- **Query Performance:** Slower than traditional DB (requires RPC calls)
- **Cost:** Gas fees for writes, free for reads

### 8.2 Off-Chain Data (PostgreSQL)

#### Schema Design

```sql
-- Indexed invoice data for fast queries
CREATE TABLE indexed_invoices (
    invoice_id VARCHAR(66) PRIMARY KEY,
    issuer VARCHAR(66) NOT NULL,
    buyer_hash VARCHAR(64) NOT NULL,
    face_value BIGINT NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    financier VARCHAR(66),
    discount_bps INTEGER NOT NULL,
    doc_hash VARCHAR(128),
    issued_at TIMESTAMP NOT NULL,
    financed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_status ON indexed_invoices(status);
CREATE INDEX idx_invoices_issuer ON indexed_invoices(issuer);
CREATE INDEX idx_invoices_financier ON indexed_invoices(financier);
CREATE INDEX idx_invoices_due_date ON indexed_invoices(due_date);

-- Event log for audit trail
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    invoice_id VARCHAR(66),
    transaction_digest VARCHAR(66) NOT NULL,
    sender VARCHAR(66),
    data JSONB,
    timestamp TIMESTAMP NOT NULL,
    block_height BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_invoice ON events(invoice_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- KYC records (mocked)
CREATE TABLE kyc_records (
    address VARCHAR(66) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    verified_at TIMESTAMP,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Oracle signature log (replay protection)
CREATE TABLE oracle_signatures (
    id SERIAL PRIMARY KEY,
    nonce VARCHAR(64) UNIQUE NOT NULL,
    action VARCHAR(20) NOT NULL,
    invoice_id VARCHAR(66),
    signature VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signatures_nonce ON oracle_signatures(nonce);
```

#### Data Consistency Model

**Eventually Consistent:**

- Blockchain is source of truth
- Database reflects latest indexed state (small lag: 1-5 seconds typical)
- Conflicts resolved by re-querying blockchain

**Reconciliation:**

- Periodic background job compares DB state with blockchain
- Flags discrepancies for investigation
- Automatic re-indexing on detected gaps

### 8.3 Document Storage (IPFS)

**Structure:**

```
IPFS Network
├── Invoice PDFs
│   ├── QmXxx... (Invoice 1)
│   ├── QmYyy... (Invoice 2)
│   └── QmZzz... (Invoice 3)
└── Supporting Documents
    ├── QmAaa... (Purchase Order)
    └── QmBbb... (Delivery Receipt)
```

**Metadata Stored On-Chain:**

- Only IPFS CID (content hash)
- No document contents

**Access Control:**

- Documents are publicly accessible via IPFS gateways (MVP)
- Future: Encrypted documents with selective disclosure

---

## 9. Security Architecture

### 9.1 Threat Model

#### Assets to Protect

1. **Funds:** Stablecoins in escrow, settlement funds
2. **Data:** Private keys, KYC information, business secrets
3. **Availability:** Service uptime, data integrity
4. **Reputation:** Platform trust, oracle credibility

#### Threat Actors

- **Malicious Supplier:** Creates fake invoices
- **Malicious Financier:** Exploits pricing, wash trading
- **Oracle Compromise:** Unauthorized payment confirmations
- **External Attacker:** DDoS, smart contract exploits
- **Insider Threat:** Admin abuse, key theft

### 9.2 Security Controls

#### Smart Contract Layer

| Threat                      | Control                | Implementation                                     |
| --------------------------- | ---------------------- | -------------------------------------------------- |
| Unauthorized state mutation | Access control checks  | `assert!(tx_context::sender() == registry.oracle)` |
| Replay attacks              | Nonce-based signatures | Store consumed nonces, reject duplicates           |
| Double financing            | Object ownership       | Invoice object transfer prevents duplication       |
| Integer overflow            | Safe math              | Sui Move prevents overflow by default              |
| Reentrancy                  | Single-entry mutations | Move resource model prevents reentrancy            |

#### Oracle Backend

| Threat               | Control                    | Implementation                              |
| -------------------- | -------------------------- | ------------------------------------------- |
| Key compromise       | Secure storage             | Environment variables (MVP), AWS KMS (prod) |
| Unauthorized signing | API authentication         | Bearer tokens, rate limiting                |
| Signature forgery    | Cryptographic verification | Ed25519 signature scheme                    |
| Replay attacks       | Nonce management           | Database-backed nonce tracking              |
| DoS                  | Rate limiting              | 10 req/min per IP, 100 req/hour per address |

#### Frontend

| Threat            | Control                  | Implementation                  |
| ----------------- | ------------------------ | ------------------------------- |
| XSS attacks       | Content Security Policy  | CSP headers, input sanitization |
| CSRF              | Same-origin policy       | CORS configuration, token-based |
| Wallet phishing   | Official wallet adapters | @mysten/dapp-kit only           |
| Man-in-the-middle | HTTPS only               | TLS certificates, HSTS headers  |

### 9.3 Key Management

#### Oracle Private Key (MVP)

```bash
# Generate Ed25519 keypair
openssl genpkey -algorithm ED25519 -out oracle_private.pem

# Store in environment variable
export ORACLE_PRIVATE_KEY="base64_encoded_key"
```

**Storage:**

- Development: `.env` file (never committed)
- Production: AWS Secrets Manager or HashiCorp Vault

**Rotation Plan:**

- Quarterly rotation schedule
- Emergency rotation procedure documented
- Old keys retained for signature verification

#### User Private Keys

- **Never touched by platform**
- Managed by Sui Wallet extensions
- Platform only receives signed transactions

### 9.4 Privacy Protection

#### On-Chain Data Minimization

```typescript
// ❌ Bad: PII on-chain
invoice.buyer_name = "Acme Corp";

// ✅ Good: Hashed identifier
invoice.buyer_hash = sha3_256("ACME_CORP_TAX_ID_12345678");
```

#### Off-Chain Encryption

```typescript
// Encrypt sensitive document before IPFS upload (future)
const encrypted = await encrypt(pdfBuffer, userPublicKey);
const cid = await ipfs.add(encrypted);
```

#### Access Patterns

- Invoice details visible only to: issuer, financier, admin
- Marketplace shows aggregated/anonymized data
- Personal data never logged to public systems

---

## 10. Performance & Scalability

### 10.1 Performance Targets

| Metric                   | Target      | Measured At           |
| ------------------------ | ----------- | --------------------- |
| Transaction Confirmation | < 5 seconds | Sui finality          |
| API Response Time (p95)  | < 500ms     | Backend REST API      |
| Page Load Time           | < 2 seconds | Frontend (Lighthouse) |
| Event Indexing Lag       | < 5 seconds | Indexer delay         |
| Concurrent Users         | 1,000+      | Load testing          |

### 10.2 Optimization Strategies

#### Smart Contract

- **Parallel Execution:** Independent invoices process concurrently
- **Minimal Storage:** Use events for audit trail, not on-chain storage
- **Gas Optimization:** Efficient data types, minimal computations

#### Backend

- **Database Indexing:** Indexes on frequently queried fields (status, dates)
- **Connection Pooling:** Reuse database connections
- **Caching:** Redis for frequently accessed data (future)
- **Async Processing:** Non-blocking I/O for blockchain interactions

#### Frontend

- **Code Splitting:** Load only necessary JavaScript per route
- **Image Optimization:** Next.js Image component with WebP
- **Lazy Loading:** Components load on-demand
- **CDN Delivery:** Static assets served from Vercel Edge Network

### 10.3 Scalability Considerations

#### Horizontal Scaling

- **Stateless Backend:** Multiple backend instances behind load balancer
- **Indexer Sharding:** Partition event streams by object ID range
- **Database Read Replicas:** Scale read queries independently

#### Vertical Scaling

- **Database Upgrade:** Increase PostgreSQL resources as needed
- **RPC Provider:** Use dedicated Sui RPC nodes or paid providers

#### Bottleneck Analysis

- **Likely Bottleneck:** Database queries under high read load
- **Mitigation:** Implement Redis caching layer, read replicas
- **Monitoring:** Track query execution time, slow query log

---

## 11. Deployment Architecture

### 11.1 Environment Strategy

| Environment     | Purpose             | Blockchain                  | Access          |
| --------------- | ------------------- | --------------------------- | --------------- |
| **Development** | Local development   | Sui localnet                | Developers only |
| **Staging**     | Integration testing | Sui devnet                  | Internal team   |
| **Production**  | Live platform       | Sui testnet (MVP) → mainnet | Public          |

### 11.2 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         DNS (Route 53)                       │
│                    invoice-finance.sui                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    CDN (Vercel Edge)                         │
│                  - Static Assets                             │
│                  - Frontend Caching                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│               Frontend (Vercel)                              │
│            Next.js App (Serverless)                          │
│            - Auto-scaling                                    │
│            - Global distribution                             │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
┌───────────▼──────────┐   ┌──────────▼────────────┐
│ Backend Services     │   │  Sui RPC Providers    │
│ (Railway/AWS)        │   │  - Mainnet            │
│ ┌──────────────────┐ │   │  - Testnet            │
│ │ Oracle Service   │ │   │  - Devnet             │
│ │ - Node.js        │ │   └───────────────────────┘
│ │ - Express API    │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ Event Indexer    │ │
│ │ - WebSocket      │ │
│ │ - Event Stream   │ │
│ └──────────────────┘ │
└───────────┬──────────┘
            │
┌───────────▼──────────┐
│ PostgreSQL Database  │
│ (Railway/AWS RDS)    │
│ - Indexed data       │
│ - Audit logs         │
│ - KYC records        │
└──────────────────────┘

External Services:
┌──────────────────────┐
│ IPFS/Pinata          │
│ - Document storage   │
└──────────────────────┘

┌──────────────────────┐
│ AWS Secrets Manager  │
│ - Oracle private key │
│ - API keys           │
└──────────────────────┘
```

### 11.3 Deployment Process

#### Smart Contracts

```bash
# 1. Build Move modules
sui move build

# 2. Run tests
sui move test

# 3. Deploy to network
sui client publish --gas-budget 100000000

# 4. Record package ID and object IDs
echo "PACKAGE_ID=0x..." >> .env
echo "ORACLE_REGISTRY_ID=0x..." >> .env
```

#### Backend Services

```bash
# 1. Build Docker image
docker build -t invoice-backend:latest .

# 2. Push to registry
docker push registry.railway.app/invoice-backend:latest

# 3. Deploy (automatic via Railway)
# Or manual: railway up
```

#### Frontend

```bash
# 1. Set environment variables in Vercel dashboard
# 2. Push to main branch
git push origin main

# 3. Vercel auto-deploys
# 4. Verify deployment
curl https://invoice-finance.sui
```

### 11.4 CI/CD Pipeline (GitHub Actions)

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Sui CLI
        run: cargo install --git https://github.com/MystenLabs/sui.git sui
      - name: Build contracts
        run: cd contract/invoice_financing && sui move build
      - name: Run tests
        run: cd contract/invoice_financing && sui move test

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run tests
        run: cd backend && npm test
      - name: Lint
        run: cd backend && npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - name: Install dependencies
        run: cd dapp && npm ci
      - name: Build
        run: cd dapp && npm run build
      - name: Run tests
        run: cd dapp && npm test

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [test-contracts, test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Deploy Backend
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 12. Development Workflow

### 12.1 Development Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/org/invoice-financing.git
cd invoice-financing

# 2. Install dependencies
npm install  # Root workspace
cd contract/invoice_financing && sui move build
cd ../../backend && npm install
cd ../dapp && npm install

# 3. Start local Sui network
sui start

# 4. Deploy contracts locally
sui client publish --gas-budget 100000000

# 5. Start backend services
cd backend && npm run dev  # Port 3001

# 6. Start frontend
cd dapp && npm run dev  # Port 3000

# 7. Access application
open http://localhost:3000
```

### 12.2 Development Tools

- **Sui CLI:** Contract compilation, testing, deployment
- **Sui Explorer:** Transaction and object inspection
- **VSCode Extensions:** Move syntax highlighting
- **Postman/Thunder Client:** API testing
- **Sui DevTools:** Wallet interaction in browser

### 12.3 Code Quality Standards

#### Linting

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

#### Formatting

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

#### Pre-commit Hooks (Husky)

```bash
# .husky/pre-commit
npm run lint
npm run format:check
npm run test
```

---

## 13. Testing Strategy

### 13.1 Testing Pyramid

```
      /\
     /  \    E2E Tests (10%)
    /────\   - Full workflow tests
   /      \
  /────────\ Integration Tests (30%)
 /          \ - API tests, contract interactions
/────────────\ Unit Tests (60%)
                - Pure functions, components
```

### 13.2 Smart Contract Testing

#### Unit Tests (Move Test Framework)

```move
#[test]
fun test_issue_invoice() {
    let scenario = test_scenario::begin(@0x1);
    // ... test logic
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = EWrongStatus)]
fun test_finance_already_financed_invoice() {
    // ... test that financing twice fails
}
```

#### Integration Tests (TypeScript)

```typescript
describe("Invoice Lifecycle", () => {
  it("should complete full lifecycle: issue -> finance -> settle", async () => {
    // 1. Issue invoice
    const { invoiceId } = await issueInvoice({
      amount: 10000,
      dueDate: Date.now() + 86400000,
    });

    // 2. Finance invoice
    await financeInvoice(invoiceId, { financier: financierAddress });

    // 3. Confirm payment
    const signature = await oracleService.signPayment(invoiceId);
    await confirmPayment(invoiceId, signature);

    // 4. Verify final state
    const invoice = await getInvoice(invoiceId);
    expect(invoice.status).toBe("PAID");
  });
});
```

### 13.3 Backend Testing

```typescript
// API endpoint test (Jest + Supertest)
describe("POST /api/oracle/sign-issuance", () => {
  it("should return valid signature", async () => {
    const response = await request(app).post("/api/oracle/sign-issuance").send({
      issuer: "0x123...",
      amount: 10000,
      due_date: 1700000000,
      // ...
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("signature");
    expect(response.body).toHaveProperty("nonce");

    // Verify signature is valid
    const isValid = verifySignature(response.body.signature, expectedMessage);
    expect(isValid).toBe(true);
  });

  it("should reject duplicate nonce", async () => {
    // First request succeeds
    await request(app).post("/api/oracle/sign-issuance").send(payload);

    // Second request with same nonce fails
    const response = await request(app)
      .post("/api/oracle/sign-issuance")
      .send(payload);
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("nonce");
  });
});
```

### 13.4 Frontend Testing

#### Component Tests (React Testing Library)

```typescript
describe("InvoiceCard", () => {
  it("should render invoice details", () => {
    const invoice = {
      id: "0x123",
      face_value: 10000,
      status: "ISSUED",
      due_date: "2025-12-31",
    };

    render(<InvoiceCard invoice={invoice} />);

    expect(screen.getByText("$10,000")).toBeInTheDocument();
    expect(screen.getByText("ISSUED")).toBeInTheDocument();
  });

  it("should call onFinance when button clicked", async () => {
    const onFinance = jest.fn();
    render(<InvoiceCard invoice={invoice} onFinance={onFinance} />);

    await userEvent.click(screen.getByRole("button", { name: /finance/i }));
    expect(onFinance).toHaveBeenCalledWith("0x123");
  });
});
```

#### E2E Tests (Playwright)

```typescript
test("complete invoice financing flow", async ({ page }) => {
  // 1. Connect wallet
  await page.goto("http://localhost:3000");
  await page.click("text=Connect Wallet");
  await page.click("text=Sui Wallet");

  // 2. Issue invoice
  await page.goto("/issue");
  await page.fill('input[name="amount"]', "10000");
  await page.fill('input[name="dueDate"]', "2025-12-31");
  await page.click('button:has-text("Issue Invoice")');
  await page.waitForSelector("text=Invoice created successfully");

  // 3. Finance invoice (as different user)
  // ... switch wallet, navigate to marketplace, etc.
});
```

### 13.5 Performance Testing

#### Load Testing (k6)

```javascript
import http from "k6/http";
import { check } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 100 }, // Ramp up to 100 users
    { duration: "3m", target: 100 }, // Stay at 100 users
    { duration: "1m", target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.get("https://api.invoice-finance.sui/api/invoices");
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
}
```

---

## 14. Monitoring & Observability

### 14.1 Metrics Collection

#### Application Metrics (Prometheus)

```typescript
// Backend metrics
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
});

const invoicesCreated = new promClient.Counter({
  name: "invoices_created_total",
  help: "Total number of invoices created",
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route.path, res.statusCode)
      .observe(duration);
  });
  next();
});
```

#### Blockchain Metrics

- Transaction success rate
- Average gas cost per transaction type
- Event indexing lag (time from block to database)
- RPC call latency

#### Business Metrics

- Total invoices issued
- Total value financed (daily, monthly)
- Average time to finance
- Average time to settlement
- Dispute rate

### 14.2 Logging Strategy

#### Structured Logging (Winston)

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "oracle-backend" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Example usage
logger.info("Invoice issued", {
  invoiceId: "0x123",
  issuer: "0xabc",
  amount: 10000,
  correlationId: req.id,
});
```

#### Log Levels

- **ERROR:** System failures, exceptions
- **WARN:** Recoverable issues, deprecated usage
- **INFO:** Key business events (invoice issued, financed, settled)
- **DEBUG:** Detailed execution flow (development only)

### 14.3 Alerting Rules

#### Critical Alerts (PagerDuty/Opsgenie)

- RPC connection down for > 1 minute
- Database connection lost
- Transaction failure rate > 5%
- Oracle service down

#### Warning Alerts (Slack)

- API response time p95 > 1s
- Event indexing lag > 30 seconds
- Disk space > 80%

### 14.4 Dashboards (Grafana)

#### System Health Dashboard

- RPC uptime
- API response times (p50, p95, p99)
- Database query performance
- Error rates by endpoint

#### Business Metrics Dashboard

- Invoices by status (pie chart)
- Daily financing volume (time series)
- Average yields (gauge)
- Geographic distribution (map)

---

## 15. Disaster Recovery

### 15.1 Backup Strategy

#### Database Backups

- **Frequency:** Hourly snapshots, daily full backups
- **Retention:** 7 days hourly, 30 days daily
- **Storage:** AWS S3 with versioning enabled
- **Restoration Time:** < 1 hour for recent snapshot

#### Smart Contract State

- **Immutable:** Blockchain state is automatically replicated
- **Contract Code:** Version controlled in Git
- **Deployment Scripts:** Documented and tested

#### Application Code

- **Version Control:** Git with tagged releases
- **Artifacts:** Docker images tagged and stored in registry
- **Configuration:** Infrastructure-as-code (Terraform/Pulumi)

### 15.2 Recovery Procedures

#### Database Corruption

```bash
# 1. Stop application servers
railway down backend

# 2. Restore from latest backup
pg_restore -d invoice_finance latest_backup.dump

# 3. Verify data integrity
psql -d invoice_finance -c "SELECT COUNT(*) FROM indexed_invoices;"

# 4. Re-index missing events
npm run reindex --from-block=LAST_GOOD_BLOCK

# 5. Restart services
railway up backend
```

#### Oracle Key Compromise

```bash
# 1. Immediately revoke old key
sui client call --function update_oracle \
  --module invoice_finance \
  --package $PACKAGE_ID \
  --args $NEW_ORACLE_ADDRESS

# 2. Update backend environment
export ORACLE_PRIVATE_KEY=$NEW_KEY

# 3. Restart backend services

# 4. Audit all signatures issued with old key
npm run audit-signatures --from-date=INCIDENT_DATE
```

#### Complete Service Outage

```bash
# 1. Deploy to backup region
railway deploy --region us-west

# 2. Update DNS to point to backup
aws route53 change-resource-record-sets ...

# 3. Verify service health
curl https://backup.invoice-finance.sui/health

# 4. Monitor for stability
```

### 15.3 Business Continuity

#### RTO (Recovery Time Objective): 1 hour

- Time to restore service from major failure

#### RPO (Recovery Point Objective): 5 minutes

- Maximum acceptable data loss

#### Redundancy

- **Multi-region deployment** (Phase 2)
- **Hot standby database** (Phase 2)
- **Oracle failover** (manual trigger available)

---

## Appendix A: Configuration Management

### Environment Variables

```bash
# .env.example

# Blockchain
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=0x...
ORACLE_REGISTRY_ID=0x...

# Oracle
ORACLE_PRIVATE_KEY=base64_encoded_key
ORACLE_PUBLIC_KEY=0x...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/invoice_finance

# IPFS
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=...
IPFS_API_SECRET=...

# Backend
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Frontend
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_INDEXER_API_URL=https://api.invoice-finance.sui
```

---

## Appendix B: API Reference

See separate `API.md` document for full REST API specification.

---

## Appendix C: Glossary

- **APY:** Annual Percentage Yield
- **Attestation:** Cryptographically signed proof of an off-chain event
- **CID:** Content Identifier (IPFS)
- **Escrow:** Temporary holding of funds until conditions are met
- **Factoring:** Selling invoices for immediate cash
- **Gas:** Transaction fee on blockchain
- **KYC:** Know Your Customer (identity verification)
- **Move:** Programming language for Sui smart contracts
- **Oracle:** Service that bridges off-chain data to blockchain
- **RPC:** Remote Procedure Call (blockchain API)
- **Settlement:** Final distribution of funds after invoice payment
- **UID:** Unique Identifier (Sui object ID)

---

**Document Owner:** Technical Architecture Team  
**Contributors:** Smart Contract Team, Backend Team, Frontend Team  
**Last Updated:** November 14, 2025  
**Next Review:** Post-MVP launch

**Approval:**

- [ ] Lead Architect
- [ ] Security Lead
- [ ] DevOps Lead
- [ ] Product Owner

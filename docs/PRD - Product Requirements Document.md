# Product Requirements Document (PRD)

## On-Chain Invoice Financing & Settlement Platform

**Version:** 1.0  
**Date:** November 14, 2025  
**Status:** MVP Development

---

## 1. Executive Summary

### 1.1 Product Vision

Transform traditional invoice financing by creating a transparent, verifiable, and automated on-chain platform that converts supplier invoices into tradeable, lifecycle-managed digital assets. Enable instant liquidity for suppliers while providing financiers with transparent, yield-generating opportunities backed by cryptographic proof systems.

### 1.2 Problem Statement

Traditional invoice financing suffers from:

- **Long settlement times** (3-5 days typical)
- **Opaque processes** and pricing
- **High friction** due to paperwork
- **Trust deficits** between parties
- **Double-financing risks** from paper-based systems
- **Slow dispute resolution**

### 1.3 Solution Overview

A Sui blockchain-based platform that:

- Mints invoices as first-class on-chain objects with verifiable lifecycle states
- Enables instant marketplace financing with transparent discount rates
- Automates settlement via oracle-verified payment confirmations
- Provides immutable audit trails for all transactions
- Reduces trust requirements through cryptographic attestations

---

## 2. Target Users & Personas

### 2.1 Primary Users

#### Supplier (Seller/Originator)

**Profile:** SME business owner or finance manager  
**Goals:**

- Convert receivables to immediate working capital
- Minimize financing costs
- Maintain business reputation

**Pain Points:**

- Cash flow gaps waiting for invoice payment
- Complex, slow traditional factoring processes
- Opaque discount rates

**Success Metrics:**

- Time to funding < 60 seconds
- Discount rates 10-30% better than traditional
- Zero paperwork overhead

#### Financier (Investor/LP)

**Profile:** Individual or institutional investor seeking yield  
**Goals:**

- Generate predictable returns on short-duration assets
- Access transparent risk indicators
- Diversify portfolio with real-world assets

**Pain Points:**

- Lack of visibility into invoice authenticity
- Settlement delays
- Unclear counterparty risk

**Success Metrics:**

- APY visibility and accuracy
- Settlement success rate > 98%
- Portfolio analytics access

### 2.2 Secondary Users

#### Oracle/Verifier

**Role:** Trusted authority confirming payment events  
**Responsibilities:** Sign payment attestations, maintain key security

#### Platform Administrator

**Role:** System operator and governance  
**Responsibilities:** Module deployment, oracle management, dispute resolution

---

## 3. Core Features & Requirements

### 3.1 MVP Features (Priority: MUST HAVE)

#### F1: Invoice Issuance

**User Story:** As a Supplier, I want to create an on-chain invoice so that I can request financing.

**Acceptance Criteria:**

- [ ] Supplier can input invoice details (amount, due date, buyer identifier)
- [ ] System generates SHA3 hash of invoice document
- [ ] Authority signature validates invoice authenticity
- [ ] Invoice minted as Sui object with status=ISSUED
- [ ] Invoice ID and metadata displayed in UI
- [ ] Transaction completes in < 5 seconds
- [ ] No PII stored on-chain (only hashed identifiers)

**Technical Requirements:**

- Move struct: `Invoice<CoinType>` with fields: issuer, buyer_hash, face_value, due_ts, status, doc_hash
- IPFS integration for document storage (or mocked)
- Signature verification for issuance authority

#### F2: Invoice Financing (Purchase)

**User Story:** As a Financier, I want to purchase an invoice at a discount so that I can earn yield upon settlement.

**Acceptance Criteria:**

- [ ] Financier can browse available invoices (status=ISSUED)
- [ ] Discount rate clearly displayed (in bps and APY)
- [ ] Purchase price calculation shown: `face_value * (10000 - discount_bps) / 10000`
- [ ] Financier transfers payment to supplier
- [ ] Invoice status updates to FINANCED
- [ ] Ownership or financing rights recorded
- [ ] Transaction completes atomically

**Technical Requirements:**

- Move function: `accept_finance<CoinType>`
- Stablecoin or test token transfers
- Event emission: `InvoiceFinanced`

#### F3: Payment Confirmation & Settlement

**User Story:** As the system, I want to verify buyer payment and automatically settle with the financier.

**Acceptance Criteria:**

- [ ] Oracle signs payment confirmation with invoice ID and timestamp
- [ ] Smart contract verifies oracle signature
- [ ] Face value transferred to financier
- [ ] Invoice status updates to PAID
- [ ] Settlement completes in < 10 seconds after confirmation
- [ ] All parties notified via events

**Technical Requirements:**

- Move functions: `deposit_payment<CoinType>`, `confirm_payment<CoinType>`
- Signature verification against OracleRegistry
- Balance transfers and escrow management
- Event emission: `PaymentConfirmed`, `SettlementExecuted`

#### F4: Dispute Handling

**User Story:** As a Supplier or Financier, I want to raise a dispute if there's an issue with the invoice or payment.

**Acceptance Criteria:**

- [ ] Authorized parties can raise disputes within timelock window
- [ ] Invoice status updates to DISPUTED
- [ ] Settlement blocked while disputed
- [ ] Dispute reason (hashed) recorded on-chain
- [ ] Timestamp and initiator logged

**Technical Requirements:**

- Move function: `raise_dispute<CoinType>`
- Timelock validation using Sui Clock
- Access control (only issuer, financier, or oracle)

#### F5: Marketplace View

**User Story:** As a Financier, I want to see all available invoices so that I can select investment opportunities.

**Acceptance Criteria:**

- [ ] List all invoices with status=ISSUED
- [ ] Display: face value, due date, discount rate, risk indicators
- [ ] Filter by amount range, due date, risk tier
- [ ] Real-time updates from blockchain events
- [ ] Click to view invoice details and purchase

**Technical Requirements:**

- Event indexing (InvoiceIssued events)
- Frontend query to Sui RPC
- UI components: InvoiceList, InvoiceCard

### 3.2 Priority Enhancers (Priority: SHOULD HAVE)

#### F6: Timelock for Settlement

- Require minimum time after financing before settlement
- Provides window for dispute raising
- Uses Sui Clock for validation

#### F7: Discount Economics Display

- Show annualized yield calculation
- Display time to maturity
- Compare with market rates

#### F8: Risk Indicators

- Visual coding (green/yellow/red) based on risk factors
- Factors: days to due date, invoice amount, historical supplier data
- Mock risk scoring for MVP

#### F9: Audit Trail UI

- Display complete invoice lifecycle
- Show all state transitions with timestamps
- Link to Sui Explorer for transaction verification
- Export audit logs

### 3.3 Stretch Features (Priority: COULD HAVE)

#### F10: Secondary Market Transfer

- Financier can sell financing position to another party
- Invoice ownership transfer logic

#### F11: Batch Operations

- Issue multiple invoices simultaneously
- Bulk financing for portfolio investors

#### F12: Advanced Analytics Dashboard

- Portfolio performance metrics
- Yield analysis
- Risk distribution charts

---

## 4. Non-Functional Requirements

### 4.1 Performance

- Transaction finality: < 5 seconds
- UI response time: < 500ms for queries
- Support 100+ concurrent users (demo scale)
- Scale to 10,000+ invoices (indexed efficiently)

### 4.2 Security

- No PII stored on-chain (GDPR-conscious)
- Multi-layer signature verification
- Replay attack prevention (nonce-based)
- Access control via OracleRegistry
- Timelock for dispute windows

### 4.3 Usability

- One-click wallet connection
- Clear transaction status indicators
- Helpful error messages
- Mobile-responsive design
- Minimal crypto knowledge required

### 4.4 Reliability

- Graceful fallback if oracle temporarily unavailable
- Transaction retry logic
- Clear error states and recovery paths

### 4.5 Compliance

- KYC/AML hooks (mocked for MVP)
- Audit trail export capability
- Legal disclaimers prominent
- Privacy-preserving design

---

## 5. User Flows

### 5.1 Happy Path: Invoice Issuance to Settlement

```
Supplier → Issue Invoice → Invoice Created (ISSUED)
    ↓
Financier → Browse Marketplace → Select Invoice
    ↓
Financier → Purchase Invoice → Transfer Payment → Invoice FINANCED
    ↓
Buyer → Pays Invoice (off-chain)
    ↓
Oracle → Observes Payment → Signs Attestation
    ↓
System → Verify Signature → Transfer Face Value to Financier
    ↓
Invoice Status = PAID → Settlement Complete
```

### 5.2 Dispute Path

```
Invoice FINANCED → Issue Detected
    ↓
Authorized Party → Raise Dispute
    ↓
Invoice Status = DISPUTED
    ↓
Settlement Blocked
    ↓
Off-Chain Resolution
    ↓
Manual Override or Cancellation
```

---

## 6. Success Metrics (KPIs)

### 6.1 Product Metrics

- **Time to Funding:** Average time from invoice issuance to financing < 60s
- **Settlement Success Rate:** > 98% of financed invoices settle successfully
- **Dispute Rate:** < 2% of invoices disputed
- **Platform Utilization:** Number of active invoices, total value financed

### 6.2 Business Metrics

- **Supplier Acquisition Cost:** Target < $50 per supplier
- **Financier APY:** Average effective yield 8-15% annualized
- **Transaction Volume:** Monthly value financed
- **Revenue per Transaction:** Platform fees collected

### 6.3 Technical Metrics

- **Transaction Success Rate:** > 99.5%
- **Average Gas Cost:** < $0.10 per transaction
- **System Uptime:** > 99.9%
- **API Response Time:** p95 < 500ms

---

## 7. Technical Constraints & Assumptions

### 7.1 MVP Scope Constraints

- **Single Oracle:** Centralized trust for hackathon MVP
- **Mocked KYC:** Off-chain flag, no real verification
- **Test Currency:** MockUSD token or SUI for demo
- **Simulated Buyer Payment:** Oracle endpoint controlled by platform

### 7.2 Assumptions

- Users have Sui-compatible wallets
- Users understand basic blockchain interactions
- Internet connectivity available
- Sui testnet available and stable

### 7.3 Out of Scope (MVP)

- Real bank integration
- Multi-signature oracles
- Dynamic risk scoring engine
- Insurance/guarantee products
- Secondary market trading
- Multi-currency support
- Advanced dispute arbitration
- Regulatory-grade KYC/AML

---

## 8. Dependencies

### 8.1 External Dependencies

- Sui blockchain testnet/devnet
- IPFS or document storage service
- Sui wallet providers (Sui Wallet, Martian, etc.)
- Oracle backend service (self-hosted for MVP)

### 8.2 Internal Dependencies

- Move smart contracts deployed
- Frontend application
- Backend oracle service
- Test token contracts

---

## 9. Risks & Mitigations

| Risk                  | Impact | Likelihood | Mitigation                                   |
| --------------------- | ------ | ---------- | -------------------------------------------- |
| Oracle key compromise | High   | Medium     | Multi-sig plan for production, monitoring    |
| Fake invoice issuance | High   | Medium     | Require buyer attestation, reputation system |
| Sui testnet downtime  | High   | Low        | Local devnet fallback, demo video backup     |
| Smart contract bugs   | High   | Medium     | Thorough testing, audit plan                 |
| Poor user adoption    | Medium | Medium     | Clear UX, onboarding flow                    |
| Regulatory scrutiny   | Medium | Low        | Compliance-aware design, disclaimers         |

---

## 10. Release Plan

### 10.1 MVP (3-Day Hackathon)

**Deliverables:**

- Core smart contracts deployed to Sui testnet
- Functional UI with all core flows
- Oracle backend operational
- 3-5 demo invoices pre-seeded
- Live demonstration capability

**Success Criteria:**

- Complete issuance → financing → settlement demo
- All core features functional
- <3 minute demo execution time

### 10.2 Post-MVP Roadmap

**Phase 1 (Weeks 1-4):**

- Multi-sig oracle implementation
- Enhanced risk indicators
- Real KYC integration exploration

**Phase 2 (Months 2-3):**

- Pilot with 5-10 real suppliers
- Licensed financier partnerships
- Insurance product integration

**Phase 3 (Months 4-6):**

- Secondary market features
- Advanced analytics
- Mobile app

---

## 11. Open Questions

1. **Oracle Redundancy:** When to implement multi-sig? What threshold (M-of-N)?
2. **Fee Structure:** Optimal balance between supplier and financier fees?
3. **Dispute Resolution:** Off-chain arbitration process and timeline?
4. **Buyer Involvement:** Should buyers actively participate in issuance?
5. **Risk Scoring:** What data sources for credit risk assessment?
6. **Regulatory Strategy:** Which jurisdiction to target first?

---

## 12. Appendix

### 12.1 Glossary

- **Invoice:** A bill for goods/services with payment terms
- **Factoring:** Selling invoices at a discount for immediate cash
- **Oracle:** Trusted service that bridges off-chain data to on-chain
- **Attestation:** Cryptographically signed proof of an event
- **Discount Rate:** Percentage reduction from face value
- **Settlement:** Final payment distribution after invoice is paid

### 12.2 References

- Traditional invoice factoring process documentation
- Sui Move programming guide
- GDPR compliance guidelines
- Invoice financing market research

---

**Document Owner:** SUInergy Product Team  
**Last Updated:** November 14, 2025  
**Next Review:** Post-MVP completion

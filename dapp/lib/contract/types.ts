/**
 * Smart Contract Type Definitions
 * Based on the actual Move contract structure
 */

// ============================================================================
// Core Invoice Types (from invoice.move)
// ============================================================================

export interface Invoice {
  id: string; // UID
  buyer: string; // address
  supplier: string; // address
  amount: bigint; // u64 (in MIST)
  due_date: number; // u64 (Unix timestamp in seconds)
  companies_info: string; // vector<u8> decoded to string
  status: number; // u8 (0=Created, 1=Ready, 2=Financed, 3=Paid, 4=Defaulted)
  escrow_bps: number; // u64
  discount_bps: number; // u64
  fee_bps: number; // u64
  investor?: string; // Option<address>
  investor_paid?: bigint; // Option<u64>
  supplier_received?: bigint; // Option<u64>
  origination_fee?: bigint; // Option<u64>
}

// ============================================================================
// Escrow Types (from escrow.move)
// ============================================================================

export interface BuyerEscrow {
  id: string;
  invoice_id: string;
  buyer: string;
  escrow_amount: bigint; // u64 in MIST
  paid: boolean;
}

// ============================================================================
// Funding Types (from invoice_financing.move)
// ============================================================================

export interface Funding {
  id: string;
  invoice_id: string;
  funder: string; // address
}

// ============================================================================
// Treasury Types (from treasury.move)
// ============================================================================

export interface Treasury {
  id: string; // UID
  owner: string; // address
  fee_bps: number; // u64
  // balance: Balance<SUI> - internal
}

// ============================================================================
// Supplier Capability (from registry.move)
// ============================================================================

export interface SupplierCap {
  id: string; // UID
}

// ============================================================================
// Invoice Factory (from invoice_factory.move)
// ============================================================================

export interface InvoiceFactory {
  id: string; // UID
}

// ============================================================================
// Event Types
// ============================================================================

export interface InvoiceCreatedEvent {
  invoice_id: string;
  supplier: string;
  buyer: string;
  amount: string; // u64 as string
}

export interface InvoiceFinancedEvent {
  invoice_id: string;
  financier: string;
  purchase_price: string; // u64 as string
  discount_bps: string; // u64 as string
  financed_at: string; // u64 as string
}

export interface PaymentConfirmedEvent {
  invoice_id: string;
  paid_at: string; // u64 as string
}

export interface SettlementExecutedEvent {
  invoice_id: string;
  to: string; // address
  amount: string; // u64 as string
}

export interface DisputeRaisedEvent {
  invoice_id: string;
  by: string; // address
  at: string; // u64 as string
  reason_hash: string; // vector<u8> as hex
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateInvoiceParams {
  buyer: string; // Sui address
  amount: number; // in SUI (will be converted to MIST)
  due_date: Date; // JavaScript Date (will be converted to Unix timestamp)
  companies_info: string; // JSON metadata or IPFS CID
  escrow_bps?: number; // Default: 1000 (10%)
  discount_bps?: number; // Default: 320 (3.2%)
  fee_bps?: number; // Default: 50 (0.5%)
}

export interface PayEscrowParams {
  invoice_id: string;
  escrow_id: string;
  amount: bigint; // in MIST
}

export interface FundInvoiceParams {
  invoice_id: string;
  escrow_id: string;
  purchase_price: bigint; // in MIST
}

export interface PayInvoiceParams {
  invoice_id: string;
  escrow_id: string;
  total_amount: bigint; // in MIST (invoice amount + discount)
}

// ============================================================================
// Financial Calculation Types
// ============================================================================

export interface InvoiceFinancials {
  face_value: bigint; // Invoice amount
  discount_amount: bigint; // Discount in MIST
  escrow_amount: bigint; // Escrow/collateral in MIST
  fee_amount: bigint; // Protocol fee in MIST
  purchase_price: bigint; // Amount investor pays
  investor_payout: bigint; // Amount investor receives on repayment
  investor_profit: bigint; // Net profit for investor
  total_repayment: bigint; // Total buyer must repay
  days_to_maturity: number; // Days until due date
  apy: number; // Annualized percentage yield
}

// ============================================================================
// Display/UI Types
// ============================================================================

export interface InvoiceDisplay extends Invoice {
  // Converted amounts
  amount_sui: number; // amount in SUI
  escrow_amount_sui: number; // escrow in SUI
  investor_paid_sui?: number;
  supplier_received_sui?: number;
  origination_fee_sui?: number;
  
  // Status display
  status_label: string;
  status_color: string;
  
  // Date formatting
  due_date_formatted: string;
  days_until_due: number;
  
  // Calculated fields
  financials?: InvoiceFinancials;
}

// ============================================================================
// Query Types
// ============================================================================

export interface InvoiceFilters {
  status?: number | number[]; // Filter by status
  issuer?: string; // Filter by supplier
  buyer?: string; // Filter by buyer
  financier?: string; // Filter by investor
  min_amount?: bigint; // Minimum amount in MIST
  max_amount?: bigint; // Maximum amount in MIST
  due_before?: number; // Unix timestamp
  due_after?: number; // Unix timestamp
}

export interface InvoiceSortOptions {
  field: 'amount' | 'due_date' | 'created_at' | 'status';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

// ============================================================================
// Transaction Result Types
// ============================================================================

export interface TransactionResult {
  success: boolean;
  digest: string;
  objectId?: string; // For created objects
  error?: string;
  effects?: any;
  events?: any[];
}

export interface InvoiceCreationResult extends TransactionResult {
  invoice_id?: string;
  escrow_id?: string;
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface WalletState {
  connected: boolean;
  address?: string;
  balance?: bigint;
  network?: string;
}

// ============================================================================
// Contract State Types
// ============================================================================

export interface ContractState {
  package_id: string;
  treasury_id?: string;
  invoice_factory_id?: string;
  total_invoices: number;
  total_financed: number;
  total_settled: number;
  total_volume: bigint;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface InvoiceAnalytics {
  total_invoices: number;
  by_status: Record<number, number>;
  total_volume: bigint;
  avg_amount: bigint;
  avg_discount_bps: number;
  avg_days_to_finance: number;
  avg_days_to_settlement: number;
}

export interface SupplierAnalytics {
  total_issued: number;
  total_financed: number;
  total_volume: bigint;
  avg_discount_bps: number;
  avg_time_to_finance: number; // in days
}

export interface InvestorAnalytics {
  total_invested: bigint;
  total_returned: bigint;
  active_investments: number;
  completed_investments: number;
  avg_apy: number;
  success_rate: number; // percentage
}

// ============================================================================
// Error Types
// ============================================================================

export interface ContractError {
  code: string;
  message: string;
  details?: any;
}

export enum ErrorCode {
  // Configuration
  E_PACKAGE_NOT_CONFIGURED = 'E_PACKAGE_NOT_CONFIGURED',
  E_WALLET_NOT_CONNECTED = 'E_WALLET_NOT_CONNECTED',
  
  // Supplier
  E_SUPPLIER_CAP_NOT_FOUND = 'E_SUPPLIER_CAP_NOT_FOUND',
  
  // Validation
  E_INVALID_AMOUNT = 'E_INVALID_AMOUNT',
  E_INVALID_ADDRESS = 'E_INVALID_ADDRESS',
  E_INVALID_DATE = 'E_INVALID_DATE',
  
  // Transaction
  E_TRANSACTION_FAILED = 'E_TRANSACTION_FAILED',
  E_INSUFFICIENT_BALANCE = 'E_INSUFFICIENT_BALANCE',
  
  // Invoice
  E_INVOICE_NOT_FOUND = 'E_INVOICE_NOT_FOUND',
  E_INVOICE_ALREADY_FINANCED = 'E_INVOICE_ALREADY_FINANCED',
  E_ESCROW_NOT_PAID = 'E_ESCROW_NOT_PAID',
  E_WRONG_STATUS = 'E_WRONG_STATUS',
}

// ============================================================================
// Type Guards
// ============================================================================

export function isInvoice(obj: any): obj is Invoice {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.buyer === 'string' &&
    typeof obj.supplier === 'string' &&
    typeof obj.status === 'number'
  );
}

export function isBuyerEscrow(obj: any): obj is BuyerEscrow {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.invoice_id === 'string' &&
    typeof obj.buyer === 'string' &&
    typeof obj.paid === 'boolean'
  );
}

export function isFunding(obj: any): obj is Funding {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.invoice_id === 'string' &&
    typeof obj.funder === 'string'
  );
}

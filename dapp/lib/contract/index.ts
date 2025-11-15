/**
 * Smart Contract Integration - Main Export
 * Centralized exports for all contract-related functionality
 */

// Constants
export * from './constants';

// Types
export * from './types';

// Utils
export * from './utils';

// Re-export commonly used items for convenience
export {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIG,
  InvoiceStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  CONVERSION,
  DEFAULTS,
} from './constants';

export type {
  Invoice,
  BuyerEscrow,
  Funding,
  Treasury,
  SupplierCap,
  InvoiceDisplay,
  InvoiceFinancials,
  CreateInvoiceParams,
  PayEscrowParams,
  FundInvoiceParams,
  PayInvoiceParams,
  TransactionResult,
  InvoiceCreationResult,
} from './types';

export {
  suiToMist,
  mistToSui,
  formatSuiAmount,
  calculateInvoiceFinancials,
  toInvoiceDisplay,
  isValidSuiAddress,
  normalizeSuiAddress,
  truncateAddress,
  formatBpsAsPercent,
  bpsToPercent,
  percentToBps,
} from './utils';

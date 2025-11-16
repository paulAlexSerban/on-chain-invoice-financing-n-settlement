/**
 * Smart Contract Constants
 * Based on deployed contract and documentation
 */

// ============================================================================
// Contract Addresses (from DEPLOYMENT_INFO.md)
// ============================================================================

export const CONTRACT_ADDRESSES = {
  // Package ID from deployment
  PACKAGE_ID: process.env.NEXT_PUBLIC_CONTRACT_ID || '0x2317bdda09d8e73272f3dc2f96245f2b854eb3fa246099edb6cacd84d757aba4',
  
  // Treasury ID (shared object)
  TREASURY_ID: process.env.NEXT_PUBLIC_TREASURY_ID || '',
  
  // InvoiceFactory ID (shared object created at init)
  INVOICE_FACTORY_ID: process.env.NEXT_PUBLIC_FACTORY_OBJECT_ID || process.env.NEXT_PUBLIC_INVOICE_FACTORY_ID || '',
} as const;

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK_CONFIG = {
  NETWORK: (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet',
  
  RPC_URLS: {
    testnet: 'https://fullnode.testnet.sui.io:443',
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
  },
  
  EXPLORER_URLS: {
    testnet: 'https://testnet.suivision.xyz',
    mainnet: 'https://suivision.xyz',
    devnet: 'https://devnet.suivision.xyz',
  },
} as const;

// ============================================================================
// Invoice Status Constants
// ============================================================================

export enum InvoiceStatus {
  CREATED = 0,    // Issued, awaiting escrow
  READY = 1,      // Escrow paid, available for financing
  FINANCED = 2,   // Investor funded
  PAID = 3,       // Fully settled
  DEFAULTED = 4,  // Payment overdue (future feature)
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.CREATED]: 'Created',
  [InvoiceStatus.READY]: 'Available',
  [InvoiceStatus.FINANCED]: 'Funded',
  [InvoiceStatus.PAID]: 'Paid',
  [InvoiceStatus.DEFAULTED]: 'Defaulted',
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.CREATED]: 'bg-gray-500',
  [InvoiceStatus.READY]: 'bg-blue-500',
  [InvoiceStatus.FINANCED]: 'bg-green-500',
  [InvoiceStatus.PAID]: 'bg-gray-600',
  [InvoiceStatus.DEFAULTED]: 'bg-red-500',
};

// ============================================================================
// Conversion Constants
// ============================================================================

export const CONVERSION = {
  MIST_PER_SUI: 1_000_000_000,
  SECONDS_PER_DAY: 86400,
  MS_PER_SECOND: 1000,
  BPS_DIVISOR: 10_000,
  DAYS_PER_YEAR: 365,
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  // Basis points (100 BPS = 1%)
  DISCOUNT_BPS: 320,    // 3.2% default discount
  FEE_BPS: 50,          // 0.5% default fee
  ESCROW_BPS: 1000,     // 10% default escrow
  
  // Limits
  MAX_DISCOUNT_BPS: 10000,  // 100% max
  MIN_INVOICE_AMOUNT: 100,  // Minimum SUI
  MAX_INVOICE_AMOUNT: 1_000_000,  // Maximum SUI
  
  // Pagination
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// Module Names
// ============================================================================

export const MODULES = {
  INVOICE_FACTORY: 'invoice_factory',
  INVOICE: 'invoice',
  INVOICE_FINANCING: 'invoice_financing',
  ESCROW: 'escrow',
  PAY_INVOICE: 'pay_invoice',
  REGISTRY: 'registry',
  TREASURY: 'treasury',
} as const;

// ============================================================================
// Function Names
// ============================================================================

export const FUNCTIONS = {
  // Registry
  REGISTER_SUPPLIER: 'register_supplier',
  
  // Invoice Factory
  ISSUE_INVOICE: 'issue_invoice',
  
  // Escrow
  PAY_ESCROW: 'pay_escrow',
  
  // Invoice Financing
  FUND_INVOICE: 'fund_invoice',
  COLLECT_ESCROW: 'collect_escrow',
  
  // Pay Invoice
  PAY_INVOICE: 'pay_invoice',
  
  // Treasury
  WITHDRAW: 'withdraw',
  SET_FEE_BPS: 'set_fee_bps',
} as const;

// ============================================================================
// Event Types
// ============================================================================

export const EVENTS = {
  INVOICE_CREATED: 'InvoiceCreated',
  INVOICE_FINANCED: 'InvoiceFinanced',
  PAYMENT_CONFIRMED: 'PaymentConfirmed',
  SETTLEMENT_EXECUTED: 'SettlementExecuted',
  DISPUTE_RAISED: 'DisputeRaised',
} as const;

// ============================================================================
// Shared Object Constants
// ============================================================================

export const SHARED_OBJECTS = {
  // Sui Clock (always at 0x6)
  CLOCK: '0x6',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  // Configuration
  PACKAGE_NOT_CONFIGURED: 'Package ID not configured. Please check .env',
  WALLET_NOT_CONNECTED: 'Wallet not connected. Please connect your wallet first.',
  NETWORK_MISMATCH: 'Wrong network. Please switch to ',
  
  // Supplier
  SUPPLIER_CAP_NOT_FOUND: 'Supplier capability not found. Please register as a supplier first.',
  SUPPLIER_CAP_FETCH_ERROR: 'Failed to fetch supplier capability.',
  
  // Validation
  INVALID_AMOUNT: 'Invalid amount. Must be greater than 0.',
  INVALID_ADDRESS: 'Invalid Sui address format.',
  INVALID_DATE: 'Invalid due date. Must be in the future.',
  INVALID_BPS: 'Invalid basis points. Must be between 0 and 10000.',
  
  // Transaction
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction.',
  
  // Invoice
  INVOICE_NOT_FOUND: 'Invoice not found.',
  INVOICE_ALREADY_FINANCED: 'Invoice already financed.',
  INVOICE_NOT_READY: 'Invoice not ready for financing.',
  ESCROW_NOT_PAID: 'Buyer escrow not paid yet.',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get RPC URL for current network
 */
export function getRpcUrl(): string {
  return NETWORK_CONFIG.RPC_URLS[NETWORK_CONFIG.NETWORK];
}

/**
 * Get explorer URL for current network
 */
export function getExplorerUrl(): string {
  return NETWORK_CONFIG.EXPLORER_URLS[NETWORK_CONFIG.NETWORK];
}

/**
 * Get transaction explorer link
 */
export function getTransactionUrl(digest: string): string {
  return `${getExplorerUrl()}/txblock/${digest}`;
}

/**
 * Get object explorer link
 */
export function getObjectUrl(objectId: string): string {
  return `${getExplorerUrl()}/object/${objectId}`;
}

/**
 * Get address explorer link
 */
export function getAddressUrl(address: string): string {
  return `${getExplorerUrl()}/account/${address}`;
}

/**
 * Build Move call target
 */
export function buildMoveCallTarget(module: string, function_name: string): string {
  return `${CONTRACT_ADDRESSES.PACKAGE_ID}::${module}::${function_name}`;
}

/**
 * Get struct type
 */
export function getStructType(module: string, struct_name: string): string {
  return `${CONTRACT_ADDRESSES.PACKAGE_ID}::${module}::${struct_name}`;
}

/**
 * Check if package is configured
 */
export function isPackageConfigured(): boolean {
  return !!CONTRACT_ADDRESSES.PACKAGE_ID && CONTRACT_ADDRESSES.PACKAGE_ID !== '0x0';
}

/**
 * Validate configuration
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!CONTRACT_ADDRESSES.PACKAGE_ID || CONTRACT_ADDRESSES.PACKAGE_ID === '0x0') {
    errors.push('NEXT_PUBLIC_CONTRACT_ID not configured');
  }
  
  // Invoice factory is optional for now (created at deployment)
  // if (!CONTRACT_ADDRESSES.INVOICE_FACTORY_ID) {
  //   errors.push('NEXT_PUBLIC_INVOICE_FACTORY_ID not configured');
  // }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

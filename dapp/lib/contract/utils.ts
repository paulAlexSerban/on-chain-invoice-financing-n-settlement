/**
 * Smart Contract Utility Functions
 * Calculations, conversions, and helpers for invoice financing
 */

import { CONVERSION, DEFAULTS } from './constants';
import type {
  Invoice,
  InvoiceFinancials,
  InvoiceDisplay,
} from './types';
import { InvoiceStatus, STATUS_LABELS, STATUS_COLORS } from './constants';

// ============================================================================
// Amount Conversions
// ============================================================================

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * CONVERSION.MIST_PER_SUI));
}

/**
 * Convert MIST to SUI
 */
export function mistToSui(mist: bigint | string | number): number {
  const mistBigInt = typeof mist === 'bigint' ? mist : BigInt(mist);
  return Number(mistBigInt) / CONVERSION.MIST_PER_SUI;
}

/**
 * Format MIST amount to SUI string with decimals
 */
export function formatSuiAmount(mist: bigint | string | number, decimals: number = 4): string {
  const sui = mistToSui(mist);
  return sui.toFixed(decimals);
}

/**
 * Format SUI amount with proper thousands separators
 */
export function formatSuiDisplay(sui: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(sui);
}

// ============================================================================
// Date/Time Conversions
// ============================================================================

/**
 * Convert JavaScript Date to Unix timestamp (seconds)
 */
export function dateToUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / CONVERSION.MS_PER_SECOND);
}

/**
 * Convert Unix timestamp (seconds) to JavaScript Date
 */
export function unixSecondsToDate(timestamp: number): Date {
  return new Date(timestamp * CONVERSION.MS_PER_SECOND);
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | number): string {
  const dateObj = typeof date === 'number' ? unixSecondsToDate(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | number): string {
  const dateObj = typeof date === 'number' ? unixSecondsToDate(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDateTimestamp: number): number {
  const now = Math.floor(Date.now() / CONVERSION.MS_PER_SECOND);
  const diff = dueDateTimestamp - now;
  return Math.ceil(diff / CONVERSION.SECONDS_PER_DAY);
}

/**
 * Calculate days between two timestamps
 */
export function getDaysBetween(startTimestamp: number, endTimestamp: number): number {
  const diff = Math.abs(endTimestamp - startTimestamp);
  return Math.ceil(diff / CONVERSION.SECONDS_PER_DAY);
}

// ============================================================================
// Financial Calculations
// ============================================================================

/**
 * Calculate discount amount from face value and BPS
 */
export function calculateDiscountAmount(faceValue: bigint, discountBps: number): bigint {
  return (faceValue * BigInt(discountBps)) / BigInt(CONVERSION.BPS_DIVISOR);
}

/**
 * Calculate escrow amount from face value and BPS
 */
export function calculateEscrowAmount(faceValue: bigint, escrowBps: number): bigint {
  return (faceValue * BigInt(escrowBps)) / BigInt(CONVERSION.BPS_DIVISOR);
}

/**
 * Calculate fee amount from discount and fee BPS
 */
export function calculateFeeAmount(discountAmount: bigint, feeBps: number): bigint {
  return (discountAmount * BigInt(feeBps)) / BigInt(CONVERSION.BPS_DIVISOR);
}

/**
 * Calculate purchase price (amount investor pays)
 */
export function calculatePurchasePrice(faceValue: bigint, discountBps: number): bigint {
  const discountAmount = calculateDiscountAmount(faceValue, discountBps);
  return faceValue - discountAmount;
}

/**
 * Calculate total repayment amount (what buyer must pay)
 */
export function calculateTotalRepayment(faceValue: bigint, discountBps: number): bigint {
  const discountAmount = calculateDiscountAmount(faceValue, discountBps);
  return faceValue + discountAmount;
}

/**
 * Calculate investor profit
 */
export function calculateInvestorProfit(
  faceValue: bigint,
  discountBps: number,
  feeBps: number
): bigint {
  const discountAmount = calculateDiscountAmount(faceValue, discountBps);
  const feeAmount = calculateFeeAmount(discountAmount, feeBps);
  return discountAmount - feeAmount;
}

/**
 * Calculate APY (Annual Percentage Yield)
 */
export function calculateAPY(
  investedAmount: bigint,
  returnAmount: bigint,
  daysHeld: number
): number {
  if (daysHeld <= 0 || investedAmount <= BigInt(0)) return 0;
  
  const profit = returnAmount - investedAmount;
  const roi = Number(profit) / Number(investedAmount);
  const annualized = roi * (CONVERSION.DAYS_PER_YEAR / daysHeld);
  
  return annualized * 100; // Return as percentage
}

/**
 * Calculate comprehensive invoice financials
 */
export function calculateInvoiceFinancials(
  invoice: Invoice,
  currentTimestamp?: number
): InvoiceFinancials {
  const faceValue = invoice.amount;
  const discountBps = invoice.discount_bps;
  const escrowBps = invoice.escrow_bps;
  const feeBps = invoice.fee_bps;
  
  const discountAmount = calculateDiscountAmount(faceValue, discountBps);
  const escrowAmount = calculateEscrowAmount(faceValue, escrowBps);
  const feeAmount = calculateFeeAmount(discountAmount, feeBps);
  const purchasePrice = faceValue - discountAmount;
  const investorPayout = faceValue;
  const investorProfit = discountAmount - feeAmount;
  const totalRepayment = faceValue + discountAmount;
  
  const now = currentTimestamp || Math.floor(Date.now() / CONVERSION.MS_PER_SECOND);
  const daysToMaturity = Math.max(0, Math.ceil((invoice.due_date - now) / CONVERSION.SECONDS_PER_DAY));
  
  const apy = daysToMaturity > 0
    ? calculateAPY(purchasePrice, investorPayout, daysToMaturity)
    : 0;
  
  return {
    face_value: faceValue,
    discount_amount: discountAmount,
    escrow_amount: escrowAmount,
    fee_amount: feeAmount,
    purchase_price: purchasePrice,
    investor_payout: investorPayout,
    investor_profit: investorProfit,
    total_repayment: totalRepayment,
    days_to_maturity: daysToMaturity,
    apy,
  };
}

// ============================================================================
// Invoice Display Helpers
// ============================================================================

/**
 * Convert Invoice to InvoiceDisplay with all computed fields
 */
export function toInvoiceDisplay(invoice: Invoice): InvoiceDisplay {
  const financials = calculateInvoiceFinancials(invoice);
  
  return {
    ...invoice,
    amount_sui: mistToSui(invoice.amount),
    escrow_amount_sui: mistToSui(financials.escrow_amount),
    investor_paid_sui: invoice.investor_paid ? mistToSui(invoice.investor_paid) : undefined,
    supplier_received_sui: invoice.supplier_received ? mistToSui(invoice.supplier_received) : undefined,
    origination_fee_sui: invoice.origination_fee ? mistToSui(invoice.origination_fee) : undefined,
    status_label: STATUS_LABELS[invoice.status as InvoiceStatus] || 'Unknown',
    status_color: STATUS_COLORS[invoice.status as InvoiceStatus] || 'bg-gray-500',
    due_date_formatted: formatDate(invoice.due_date),
    days_until_due: getDaysUntilDue(invoice.due_date),
    financials,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
  if (!address) return false;
  
  // Sui addresses are 0x followed by 64 hex characters
  const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
  return suiAddressRegex.test(address);
}

/**
 * Normalize Sui address (ensure proper format)
 */
export function normalizeSuiAddress(address: string): string {
  if (!address) return '';
  
  // Remove whitespace
  let normalized = address.trim();
  
  // Add 0x prefix if missing
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  
  // Pad to 66 characters (0x + 64 hex chars)
  if (normalized.length < 66) {
    const padding = '0'.repeat(66 - normalized.length);
    normalized = '0x' + padding + normalized.slice(2);
  }
  
  return normalized.toLowerCase();
}

/**
 * Validate invoice amount
 */
export function isValidInvoiceAmount(amountInSui: number): boolean {
  return (
    amountInSui >= DEFAULTS.MIN_INVOICE_AMOUNT &&
    amountInSui <= DEFAULTS.MAX_INVOICE_AMOUNT
  );
}

/**
 * Validate basis points
 */
export function isValidBps(bps: number): boolean {
  return bps >= 0 && bps <= DEFAULTS.MAX_DISCOUNT_BPS;
}

/**
 * Validate due date
 */
export function isValidDueDate(dueDate: Date): boolean {
  const now = new Date();
  return dueDate > now;
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, prefixLength: number = 6, suffixLength: number = 4): string {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength + 3) return address;
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

// ============================================================================
// String/Byte Conversions
// ============================================================================

/**
 * Convert string to byte array
 */
export function stringToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

/**
 * Convert byte array to string
 */
export function bytesToString(bytes: number[] | Uint8Array): string {
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Convert hex string to byte array
 */
export function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];
  
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  
  return bytes;
}

/**
 * Convert byte array to hex string
 */
export function bytesToHex(bytes: number[] | Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Sorting Helpers
// ============================================================================

/**
 * Sort invoices by field
 */
export function sortInvoices<T extends Invoice>(
  invoices: T[],
  field: 'amount' | 'due_date' | 'status',
  order: 'asc' | 'desc' = 'desc'
): T[] {
  const sorted = [...invoices].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'amount':
        comparison = Number(a.amount - b.amount);
        break;
      case 'due_date':
        comparison = a.due_date - b.due_date;
        break;
      case 'status':
        comparison = a.status - b.status;
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Filter invoices by status
 */
export function filterByStatus<T extends Invoice>(invoices: T[], status: number | number[]): T[] {
  const statuses = Array.isArray(status) ? status : [status];
  return invoices.filter(inv => statuses.includes(inv.status));
}

/**
 * Filter invoices by address (buyer or supplier)
 */
export function filterByAddress<T extends Invoice>(
  invoices: T[],
  address: string,
  role: 'buyer' | 'supplier' | 'investor'
): T[] {
  const normalizedAddress = normalizeSuiAddress(address);
  
  return invoices.filter(inv => {
    switch (role) {
      case 'buyer':
        return normalizeSuiAddress(inv.buyer) === normalizedAddress;
      case 'supplier':
        return normalizeSuiAddress(inv.supplier) === normalizedAddress;
      case 'investor':
        return inv.investor && normalizeSuiAddress(inv.investor) === normalizedAddress;
      default:
        return false;
    }
  });
}

// ============================================================================
// Percentage Helpers
// ============================================================================

/**
 * Convert BPS to percentage
 */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to BPS
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Format BPS as percentage string
 */
export function formatBpsAsPercent(bps: number, decimals: number = 2): string {
  return `${bpsToPercent(bps).toFixed(decimals)}%`;
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Extract error message from transaction error
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.toString) return error.toString();
  return 'Unknown error occurred';
}

/**
 * Check if error is due to insufficient funds
 */
export function isInsufficientFundsError(error: any): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return message.includes('insufficient') || message.includes('balance');
}

/**
 * Check if error is due to wallet not connected
 */
export function isWalletNotConnectedError(error: any): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return message.includes('wallet') && message.includes('connect');
}

export interface OnChainInvoice {
  id: string;
  invoiceNumber: string;
  issuer: string;
  buyer: string;
  amount: string; // in MIST
  amountInSui: number; // converted to SUI
  dueDate: number; // timestamp in ms
  description: string;
  createdAt: number; // timestamp in ms
  status: number; // 0=pending, 1=funded, 2=repaid, 3=defaulted
  financedBy?: string;
  financedAmount?: string; // in MIST (deprecated, use investorPaid)
  financedAmountInSui?: number; // converted to SUI (deprecated)
  // New fields from updated contract
  investorPaid?: string; // Amount investor paid (in MIST)
  investorPaidInSui?: number; // Amount investor paid (in SUI)
  supplierReceived?: string; // Amount supplier received (in MIST)
  supplierReceivedInSui?: number; // Amount supplier received (in SUI)
  originationFeeCollected?: string; // Origination fee collected (in MIST)
  originationFeeCollectedInSui?: number; // Origination fee collected (in SUI)
  discountRateBps?: string; // Discount rate in basis points
}

export interface InvoiceFilters {
  status?: 'all' | 'created' | 'ready' | 'funded' | 'paid';
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'amount' | 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export const InvoiceStatus = {
  CREATED: 0,  // Created (not ready)
  READY: 1,    // Ready for financing
  FINANCED: 2, // Financed
  PAID: 3,     // Paid/Repaid
} as const;

export const getStatusLabel = (status: number): string => {
  switch (status) {
    case InvoiceStatus.CREATED:
      return 'Created';
    case InvoiceStatus.READY:
      return 'Available';
    case InvoiceStatus.FINANCED:
      return 'Funded';
    case InvoiceStatus.PAID:
      return 'Paid';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status: number): string => {
  switch (status) {
    case InvoiceStatus.CREATED:
      return 'bg-gray-500';
    case InvoiceStatus.READY:
      return 'bg-blue-500';
    case InvoiceStatus.FINANCED:
      return 'bg-green-500';
    case InvoiceStatus.PAID:
      return 'bg-gray-600';
    default:
      return 'bg-gray-500';
  }
};

export const formatSuiAmount = (amountInMist: string | number): number => {
  const mist = typeof amountInMist === 'string' ? BigInt(amountInMist) : BigInt(amountInMist);
  return Number(mist) / 1_000_000_000;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getDaysUntilDue = (dueDate: number): number => {
  const now = Date.now();
  const diff = dueDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};


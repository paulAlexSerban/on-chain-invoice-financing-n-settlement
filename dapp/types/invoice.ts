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
  status?: 'all' | 'pending' | 'funded' | 'repaid';
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'amount' | 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export const InvoiceStatus = {
  PENDING: 0,
  FUNDED: 1,
  REPAID: 2,
  DEFAULTED: 3,
} as const;

export const getStatusLabel = (status: number): string => {
  switch (status) {
    case InvoiceStatus.PENDING:
      return 'Available';
    case InvoiceStatus.FUNDED:
      return 'Funded';
    case InvoiceStatus.REPAID:
      return 'Repaid';
    case InvoiceStatus.DEFAULTED:
      return 'Defaulted';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status: number): string => {
  switch (status) {
    case InvoiceStatus.PENDING:
      return 'bg-blue-500';
    case InvoiceStatus.FUNDED:
      return 'bg-green-500';
    case InvoiceStatus.REPAID:
      return 'bg-gray-500';
    case InvoiceStatus.DEFAULTED:
      return 'bg-red-500';
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


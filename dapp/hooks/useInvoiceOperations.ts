/**
 * Complete Invoice Contract Hook
 * Comprehensive hook for all invoice-related smart contract operations
 */

'use client';

import { useState, useCallback } from 'react';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient } from '@mysten/sui.js/client';
import { useWalletKit } from '@mysten/wallet-kit';
import { toast } from '@/hooks/use-toast';

import {
  CONTRACT_ADDRESSES,
  MODULES,
  FUNCTIONS,
  buildMoveCallTarget,
  getStructType,
  getRpcUrl,
  ERROR_MESSAGES,
  SHARED_OBJECTS,
  suiToMist,
  dateToUnixSeconds,
  stringToBytes,
  isValidSuiAddress,
  normalizeSuiAddress,
  isPackageConfigured,
} from '@/lib/contract';

import type {
  CreateInvoiceParams,
  PayEscrowParams,
  FundInvoiceParams,
  PayInvoiceParams,
  InvoiceCreationResult,
  TransactionResult,
} from '@/lib/contract/types';

export function useInvoiceOperations() {
  const { currentAccount, signAndExecuteTransactionBlock } = useWalletKit();
  const [isLoading, setIsLoading] = useState(false);

  const suiClient = new SuiClient({ url: getRpcUrl() });

  // ============================================================================
  // Helper: Fetch SupplierCap
  // ============================================================================

  const fetchSupplierCap = useCallback(async (ownerAddress: string): Promise<string | null> => {
    if (!isPackageConfigured()) return null;

    try {
      console.log('🔍 Fetching SupplierCap for:', ownerAddress);

      const supplierCapType = getStructType(MODULES.REGISTRY, 'SupplierCap');

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: ownerAddress,
        filter: { StructType: supplierCapType },
        options: { showType: true, showContent: true },
      });

      if (ownedObjects.data.length > 0) {
        const capId = ownedObjects.data[0].data?.objectId;
        console.log('✅ SupplierCap found:', capId);
        
        if (capId) {
          localStorage.setItem('supplier_cap_id', capId);
        }
        
        return capId || null;
      }

      console.log('❌ No SupplierCap found');
      return null;
    } catch (error) {
      console.error('Error fetching SupplierCap:', error);
      return null;
    }
  }, [suiClient]);

  // ============================================================================
  // 1. Register Supplier
  // ============================================================================

  const registerSupplier = useCallback(async (): Promise<TransactionResult | null> => {
    if (!currentAccount) {
      toast({
        title: 'Wallet Not Connected',
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: 'destructive',
      });
      return null;
    }

    if (!isPackageConfigured()) {
      toast({
        title: 'Configuration Error',
        description: ERROR_MESSAGES.PACKAGE_NOT_CONFIGURED,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🔷 Registering Supplier...');

      const txb = new TransactionBlock();
      
      txb.moveCall({
        target: buildMoveCallTarget(MODULES.REGISTRY, FUNCTIONS.REGISTER_SUPPLIER) as `${string}::${string}::${string}`,
        arguments: [],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log('✅ Supplier registered:', result.digest);

      // Extract SupplierCap ID
      const supplierCapChange = result.objectChanges?.find(
        (change: any) => change.type === 'created' && change.objectType?.includes('SupplierCap')
      );
      
      let supplierCapId: string | undefined;
      if (supplierCapChange && 'objectId' in supplierCapChange) {
        supplierCapId = (supplierCapChange as any).objectId;
      }

      if (supplierCapId) {
        localStorage.setItem('supplier_cap_id', supplierCapId);
      }

      toast({
        title: 'Registration Successful',
        description: 'You are now registered as a supplier!',
      });

      setIsLoading(false);

      return {
        success: true,
        digest: result.digest,
        objectId: supplierCapId,
      };
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register as supplier.',
        variant: 'destructive',
      });

      setIsLoading(false);
      return null;
    }
  }, [currentAccount, signAndExecuteTransactionBlock]);

  // ============================================================================
  // 2. Issue Invoice
  // ============================================================================

  const issueInvoice = useCallback(async (
    params: CreateInvoiceParams
  ): Promise<InvoiceCreationResult | null> => {
    if (!currentAccount) {
      toast({
        title: 'Wallet Not Connected',
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: 'destructive',
      });
      return null;
    }

    if (!isPackageConfigured()) {
      toast({
        title: 'Configuration Error',
        description: ERROR_MESSAGES.PACKAGE_NOT_CONFIGURED,
        variant: 'destructive',
      });
      return null;
    }

    // Validate inputs
    if (!isValidSuiAddress(params.buyer)) {
      toast({
        title: 'Invalid Buyer Address',
        description: ERROR_MESSAGES.INVALID_ADDRESS,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🔷 Issuing Invoice...');
      console.log('Parameters:', params);

      // Fetch SupplierCap
      const supplierCapId = await fetchSupplierCap(currentAccount.address);

      if (!supplierCapId) {
        toast({
          title: 'Supplier Registration Required',
          description: ERROR_MESSAGES.SUPPLIER_CAP_NOT_FOUND,
          variant: 'destructive',
        });
        setIsLoading(false);
        return null;
      }

      const txb = new TransactionBlock();

      // Convert parameters
      const amountInMist = suiToMist(params.amount);
      const dueDateTimestamp = dateToUnixSeconds(params.due_date);
      const buyerAddress = normalizeSuiAddress(params.buyer);
      const companiesInfoBytes = stringToBytes(params.companies_info);

      // Default BPS values
      const escrowBps = params.escrow_bps || 1000;
      const discountBps = params.discount_bps || 320;
      const feeBps = params.fee_bps || 50;

      console.log('💰 Amount:', params.amount, 'SUI →', amountInMist.toString(), 'MIST');
      console.log('📅 Due date:', params.due_date, '→', dueDateTimestamp, 'seconds');
      console.log('👤 Buyer:', buyerAddress);
      console.log('📊 BPS: escrow=', escrowBps, 'discount=', discountBps, 'fee=', feeBps);

      txb.moveCall({
        target: buildMoveCallTarget(MODULES.INVOICE_FACTORY, FUNCTIONS.ISSUE_INVOICE) as `${string}::${string}::${string}`,
        arguments: [
          txb.pure(buyerAddress, 'address'),
          txb.pure(amountInMist.toString(), 'u64'),
          txb.pure(dueDateTimestamp, 'u64'),
          txb.pure(companiesInfoBytes, 'vector<u8>'),
          txb.pure(escrowBps, 'u64'),
          txb.pure(discountBps, 'u64'),
          txb.pure(feeBps, 'u64'),
          txb.object(supplierCapId),
        ],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      });

      console.log('✅ Invoice issued:', result.digest);

      // Extract invoice ID and escrow ID
      const invoiceChange = result.objectChanges?.find(
        (change: any) =>
          change.type === 'created' &&
          change.objectType?.includes('Invoice') &&
          !change.objectType?.includes('Factory')
      );
      
      let invoiceId: string | undefined;
      if (invoiceChange && 'objectId' in invoiceChange) {
        invoiceId = (invoiceChange as any).objectId;
      }

      const escrowChange = result.objectChanges?.find(
        (change: any) => change.type === 'created' && change.objectType?.includes('BuyerEscrow')
      );
      
      let escrowId: string | undefined;
      if (escrowChange && 'objectId' in escrowChange) {
        escrowId = (escrowChange as any).objectId;
      }

      console.log('📦 Invoice ID:', invoiceId);
      console.log('📦 Escrow ID:', escrowId);

      if (invoiceId) {
        // Track invoice IDs
        const stored = localStorage.getItem('invoice_ids')
          ? JSON.parse(localStorage.getItem('invoice_ids') || '[]')
          : [];
        if (!stored.includes(invoiceId)) {
          stored.push(invoiceId);
          localStorage.setItem('invoice_ids', JSON.stringify(stored));
        }
      }

      toast({
        title: 'Invoice Created Successfully',
        description: `Invoice has been tokenized on-chain.`,
      });

      setIsLoading(false);

      return {
        success: true,
        digest: result.digest,
        invoice_id: invoiceId,
        escrow_id: escrowId,
      };
    } catch (error: any) {
      console.error('❌ Issue invoice failed:', error);
      
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to create invoice.',
        variant: 'destructive',
      });

      setIsLoading(false);
      return null;
    }
  }, [currentAccount, signAndExecuteTransactionBlock, fetchSupplierCap]);

  // ============================================================================
  // 3. Pay Escrow
  // ============================================================================

  const payEscrow = useCallback(async (
    params: PayEscrowParams
  ): Promise<TransactionResult | null> => {
    if (!currentAccount) {
      toast({
        title: 'Wallet Not Connected',
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🔷 Paying Escrow...');

      const txb = new TransactionBlock();
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(params.amount.toString())]);

      txb.moveCall({
        target: buildMoveCallTarget(MODULES.ESCROW, FUNCTIONS.PAY_ESCROW) as `${string}::${string}::${string}`,
        arguments: [
          txb.object(params.invoice_id),
          txb.object(params.escrow_id),
          coin,
        ],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: { showEffects: true },
      });

      console.log('✅ Escrow paid:', result.digest);

      toast({
        title: 'Escrow Paid Successfully',
        description: 'Your collateral has been deposited.',
      });

      setIsLoading(false);

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error: any) {
      console.error('❌ Pay escrow failed:', error);
      
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to pay escrow.',
        variant: 'destructive',
      });

      setIsLoading(false);
      return null;
    }
  }, [currentAccount, signAndExecuteTransactionBlock]);

  // ============================================================================
  // 4. Fund Invoice
  // ============================================================================

  const fundInvoice = useCallback(async (
    params: FundInvoiceParams
  ): Promise<TransactionResult | null> => {
    if (!currentAccount) {
      toast({
        title: 'Wallet Not Connected',
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🔷 Funding Invoice...');

      const txb = new TransactionBlock();
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(params.purchase_price.toString())]);

      txb.moveCall({
        target: buildMoveCallTarget(MODULES.INVOICE_FINANCING, FUNCTIONS.FUND_INVOICE) as `${string}::${string}::${string}`,
        arguments: [
          txb.object(params.invoice_id),
          txb.object(params.escrow_id),
          coin,
        ],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: { showEffects: true },
      });

      console.log('✅ Invoice funded:', result.digest);

      toast({
        title: 'Invoice Funded Successfully',
        description: 'You have successfully financed this invoice.',
      });

      setIsLoading(false);

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error: any) {
      console.error('❌ Fund invoice failed:', error);
      
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to fund invoice.',
        variant: 'destructive',
      });

      setIsLoading(false);
      return null;
    }
  }, [currentAccount, signAndExecuteTransactionBlock]);

  // ============================================================================
  // 5. Pay Invoice
  // ============================================================================

  const payInvoice = useCallback(async (
    params: PayInvoiceParams
  ): Promise<TransactionResult | null> => {
    if (!currentAccount) {
      toast({
        title: 'Wallet Not Connected',
        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);

    try {
      console.log('🔷 Paying Invoice...');

      const txb = new TransactionBlock();
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(params.total_amount.toString())]);

      txb.moveCall({
        target: buildMoveCallTarget(MODULES.PAY_INVOICE, FUNCTIONS.PAY_INVOICE) as `${string}::${string}::${string}`,
        arguments: [
          txb.object(params.invoice_id),
          txb.object(params.escrow_id),
          coin,
        ],
      });

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
        options: { showEffects: true },
      });

      console.log('✅ Invoice paid:', result.digest);

      toast({
        title: 'Invoice Paid Successfully',
        description: 'Payment has been settled.',
      });

      setIsLoading(false);

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error: any) {
      console.error('❌ Pay invoice failed:', error);
      
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to pay invoice.',
        variant: 'destructive',
      });

      setIsLoading(false);
      return null;
    }
  }, [currentAccount, signAndExecuteTransactionBlock]);

  // ============================================================================
  // Return all operations
  // ============================================================================

  return {
    // Operations
    registerSupplier,
    issueInvoice,
    payEscrow,
    fundInvoice,
    payInvoice,
    
    // State
    isLoading,
    isConnected: !!currentAccount,
    address: currentAccount?.address,
    
    // Helpers
    fetchSupplierCap,
  };
}

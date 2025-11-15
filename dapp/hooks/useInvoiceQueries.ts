/**
 * Invoice Query Hook
 * Fetch and monitor invoice data from the blockchain
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuiClient } from '@mysten/sui.js/client';
import { useWalletKit } from '@mysten/wallet-kit';

import {
  getRpcUrl,
  getStructType,
  MODULES,
  CONTRACT_ADDRESSES,
  InvoiceStatus,
  isPackageConfigured,
} from '@/lib/contract';

import type {
  Invoice,
  BuyerEscrow,
  Funding,
  InvoiceDisplay,
} from '@/lib/contract/types';

import {
  toInvoiceDisplay,
  calculateInvoiceFinancials,
  mistToSui,
} from '@/lib/contract/utils';

export function useInvoiceQueries() {
  const { currentAccount } = useWalletKit();
  const [isLoading, setIsLoading] = useState(false);
  const suiClient = new SuiClient({ url: getRpcUrl() });

  // ============================================================================
  // Fetch Single Invoice by ID
  // ============================================================================

  const fetchInvoice = useCallback(async (invoiceId: string): Promise<Invoice | null> => {
    if (!isPackageConfigured()) return null;

    try {
      console.log('🔍 Fetching invoice:', invoiceId);

      const invoiceObject = await suiClient.getObject({
        id: invoiceId,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      if (!invoiceObject.data) {
        console.warn('Invoice not found:', invoiceId);
        return null;
      }

      const content = invoiceObject.data.content;
      if (content?.dataType !== 'moveObject') {
        console.warn('Invoice data is not a Move object');
        return null;
      }

      const fields = (content as any).fields;

      const invoice: Invoice = {
        id: invoiceObject.data.objectId,
        buyer: fields.buyer,
        supplier: fields.supplier,
        amount: BigInt(fields.amount),
        due_date: Number(fields.due_date),
        companies_info: fields.companies_info || '',
        status: Number(fields.status),
        escrow_bps: Number(fields.escrow_bps),
        discount_bps: Number(fields.discount_bps),
        fee_bps: Number(fields.fee_bps),
        investor: fields.investor || undefined,
        investor_paid: fields.investor_paid ? BigInt(fields.investor_paid) : undefined,
        supplier_received: fields.supplier_received ? BigInt(fields.supplier_received) : undefined,
      };

      console.log('✅ Invoice fetched:', invoice);
      return invoice;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }, [suiClient]);

  // ============================================================================
  // Fetch Invoice with Display Format
  // ============================================================================

  const fetchInvoiceDisplay = useCallback(async (
    invoiceId: string
  ): Promise<InvoiceDisplay | null> => {
    const invoice = await fetchInvoice(invoiceId);
    if (!invoice) return null;

    return toInvoiceDisplay(invoice);
  }, [fetchInvoice]);

  // ============================================================================
  // Fetch Multiple Invoices
  // ============================================================================

  const fetchInvoices = useCallback(async (
    invoiceIds: string[]
  ): Promise<Invoice[]> => {
    if (!isPackageConfigured()) return [];

    try {
      const promises = invoiceIds.map((id) => fetchInvoice(id));
      const results = await Promise.all(promises);
      return results.filter((inv): inv is Invoice => inv !== null);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }, [fetchInvoice]);

  // ============================================================================
  // Fetch Invoices by Supplier
  // ============================================================================

  const fetchInvoicesBySupplier = useCallback(async (
    supplierAddress: string
  ): Promise<Invoice[]> => {
    if (!isPackageConfigured()) return [];

    try {
      setIsLoading(true);
      console.log('🔍 Fetching invoices for supplier:', supplierAddress);

      const invoiceType = getStructType(MODULES.INVOICE, 'Invoice');

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: supplierAddress,
        filter: { StructType: invoiceType },
        options: {
          showType: true,
          showContent: true,
        },
      });

      const invoices: Invoice[] = [];

      for (const obj of ownedObjects.data) {
        if (!obj.data) continue;

        const content = obj.data.content;
        if (content?.dataType !== 'moveObject') continue;

        const fields = (content as any).fields;

        invoices.push({
          id: obj.data.objectId,
          buyer: fields.buyer,
          supplier: fields.supplier,
          amount: BigInt(fields.amount),
          due_date: Number(fields.due_date),
          status: Number(fields.status),
          escrow_bps: Number(fields.escrow_bps),
          discount_bps: Number(fields.discount_bps),
          fee_bps: Number(fields.fee_bps),
          investor: fields.investor || undefined,
          investor_paid: fields.investor_paid ? BigInt(fields.investor_paid) : undefined,
          supplier_received: fields.supplier_received ? BigInt(fields.supplier_received) : undefined,
        });
      }

      console.log(`✅ Found ${invoices.length} invoices for supplier`);
      setIsLoading(false);
      return invoices;
    } catch (error) {
      console.error('Error fetching invoices by supplier:', error);
      setIsLoading(false);
      return [];
    }
  }, [suiClient]);

  // ============================================================================
  // Fetch Invoices by Buyer
  // ============================================================================

  const fetchInvoicesByBuyer = useCallback(async (
    buyerAddress: string
  ): Promise<Invoice[]> => {
    if (!isPackageConfigured()) return [];

    try {
      setIsLoading(true);
      console.log('🔍 Fetching invoices for buyer:', buyerAddress);

      const invoiceType = getStructType(MODULES.INVOICE, 'Invoice');

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: buyerAddress,
        filter: { StructType: invoiceType },
        options: {
          showType: true,
          showContent: true,
        },
      });

      const invoices: Invoice[] = [];

      for (const obj of ownedObjects.data) {
        if (!obj.data) continue;

        const content = obj.data.content;
        if (content?.dataType !== 'moveObject') continue;

        const fields = (content as any).fields;

        invoices.push({
          id: obj.data.objectId,
          buyer: fields.buyer,
          supplier: fields.supplier,
          amount: BigInt(fields.amount),
          due_date: Number(fields.due_date),
          companies_info: fields.companies_info || '',
          status: Number(fields.status),
          escrow_bps: Number(fields.escrow_bps),
          discount_bps: Number(fields.discount_bps),
          fee_bps: Number(fields.fee_bps),
          investor: fields.investor || undefined,
          investor_paid: fields.investor_paid ? BigInt(fields.investor_paid) : undefined,
          supplier_received: fields.supplier_received ? BigInt(fields.supplier_received) : undefined,
        });
      }

      console.log(`✅ Found ${invoices.length} invoices for buyer`);
      setIsLoading(false);
      return invoices;
    } catch (error) {
      console.error('Error fetching invoices by buyer:', error);
      setIsLoading(false);
      return [];
    }
  }, [suiClient]);

  // ============================================================================
  // Fetch BuyerEscrow
  // ============================================================================

  const fetchEscrow = useCallback(async (escrowId: string): Promise<BuyerEscrow | null> => {
    if (!isPackageConfigured()) return null;

    try {
      console.log('🔍 Fetching escrow:', escrowId);

      const escrowObject = await suiClient.getObject({
        id: escrowId,
        options: {
          showType: true,
          showContent: true,
        },
      });

      if (!escrowObject.data) return null;

      const content = escrowObject.data.content;
      if (content?.dataType !== 'moveObject') return null;

      const fields = (content as any).fields;

      const escrow: BuyerEscrow = {
        id: escrowObject.data.objectId,
        invoice_id: fields.invoice_id,
        buyer: fields.buyer,
        escrow_amount: BigInt(fields.escrow_amount),
        paid: fields.paid,
      };

      console.log('✅ Escrow fetched:', escrow);
      return escrow;
    } catch (error) {
      console.error('Error fetching escrow:', error);
      return null;
    }
  }, [suiClient]);

  // ============================================================================
  // Fetch Funding
  // ============================================================================

  const fetchFunding = useCallback(async (fundingId: string): Promise<Funding | null> => {
    if (!isPackageConfigured()) return null;

    try {
      console.log('🔍 Fetching funding:', fundingId);

      const fundingObject = await suiClient.getObject({
        id: fundingId,
        options: {
          showType: true,
          showContent: true,
        },
      });

      if (!fundingObject.data) return null;

      const content = fundingObject.data.content;
      if (content?.dataType !== 'moveObject') return null;

      const fields = (content as any).fields;

      const funding: Funding = {
        id: fundingObject.data.objectId,
        invoice_id: fields.invoice_id,
        funder: fields.funder,
      };

      console.log('✅ Funding fetched:', funding);
      return funding;
    } catch (error) {
      console.error('Error fetching funding:', error);
      return null;
    }
  }, [suiClient]);

  // ============================================================================
  // Check if user has SupplierCap
  // ============================================================================

  const checkSupplierRegistration = useCallback(async (
    address?: string
  ): Promise<boolean> => {
    if (!isPackageConfigured()) return false;

    const checkAddress = address || currentAccount?.address;
    if (!checkAddress) return false;

    try {
      const supplierCapType = getStructType(MODULES.REGISTRY, 'SupplierCap');

      const ownedObjects = await suiClient.getOwnedObjects({
        owner: checkAddress,
        filter: { StructType: supplierCapType },
        options: { showType: true },
      });

      return ownedObjects.data.length > 0;
    } catch (error) {
      console.error('Error checking supplier registration:', error);
      return false;
    }
  }, [suiClient, currentAccount]);

  // ============================================================================
  // Get Invoice Statistics
  // ============================================================================

  const getInvoiceStats = useCallback((invoices: Invoice[]) => {
    const stats = {
      total: invoices.length,
      created: 0,
      ready: 0,
      financed: 0,
      paid: 0,
      defaulted: 0,
      totalAmount: BigInt(0),
      financedAmount: BigInt(0),
      paidAmount: BigInt(0),
    };

    invoices.forEach((inv) => {
      stats.totalAmount += inv.amount;

      switch (inv.status) {
        case InvoiceStatus.CREATED:
          stats.created++;
          break;
        case InvoiceStatus.READY:
          stats.ready++;
          break;
        case InvoiceStatus.FINANCED:
          stats.financed++;
          stats.financedAmount += inv.investor_paid || BigInt(0);
          break;
        case InvoiceStatus.PAID:
          stats.paid++;
          stats.paidAmount += inv.amount;
          break;
        case InvoiceStatus.DEFAULTED:
          stats.defaulted++;
          break;
      }
    });

    return {
      ...stats,
      totalAmountSui: mistToSui(stats.totalAmount),
      financedAmountSui: mistToSui(stats.financedAmount),
      paidAmountSui: mistToSui(stats.paidAmount),
    };
  }, []);

  return {
    // Single invoice queries
    fetchInvoice,
    fetchInvoiceDisplay,
    
    // Batch queries
    fetchInvoices,
    fetchInvoicesBySupplier,
    fetchInvoicesByBuyer,
    
    // Related objects
    fetchEscrow,
    fetchFunding,
    
    // Utilities
    checkSupplierRegistration,
    getInvoiceStats,
    
    // State
    isLoading,
    isConnected: !!currentAccount,
  };
}

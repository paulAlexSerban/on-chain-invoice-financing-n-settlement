"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import { DebugPanel } from "@/components/DebugPanel";
import { useInvoices } from "@/hooks/useInvoices";
import { BlockchainInvoiceCard } from "@/components/BlockchainInvoiceCard";
import { FinanceInvoiceModal } from "@/components/FinanceInvoiceModal";
import { OnChainInvoice, InvoiceFilters, InvoiceStatus } from "@/types/invoice";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, FileText, DollarSign, RefreshCw, AlertCircle } from "lucide-react";

const Marketplace = () => {
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'pending', // Show only available invoices by default
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [selectedInvoice, setSelectedInvoice] = useState<OnChainInvoice | null>(null);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);

  const { data: invoices, isLoading, error, refetch } = useInvoices(filters);

  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFinance = (invoice: OnChainInvoice) => {
    console.log("Opening finance modal for invoice:", invoice);
    setSelectedInvoice(invoice);
    setFinanceModalOpen(true);
  };

  const handleFinanceSuccess = () => {
    console.log("Invoice financed successfully, refreshing list...");
    refetch();
  };

  const handleViewDetails = (invoice: OnChainInvoice) => {
    console.log("Viewing invoice details:", invoice);
    const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
    const url = network === "mainnet"
      ? `https://suivision.xyz/object/${invoice.id}`
      : `https://testnet.suivision.xyz/object/${invoice.id}`;
    window.open(url, '_blank');
  };

  // Calculate stats
  const totalInvoices = invoices?.length || 0;
  const totalValue = invoices?.reduce((sum, inv) => sum + inv.amountInSui, 0) || 0;
  const availableInvoices = invoices?.filter(inv => inv.status === InvoiceStatus.PENDING).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Invoice Marketplace</h1>
            <p className="text-muted-foreground">
              Browse and invest in tokenized invoices from verified businesses
            </p>
          </div>

          {/* Debug Panel */}
          <div className="mb-6">
            <DebugPanel />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{totalInvoices}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold text-green-500">{availableInvoices}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">{totalValue.toFixed(2)} SUI</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Available</SelectItem>
                      <SelectItem value="funded">Funded</SelectItem>
                      <SelectItem value="repaid">Repaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select
                    value={filters.sortBy || 'createdAt'}
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Newest First</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Order</label>
                  <Select
                    value={filters.sortOrder || 'desc'}
                    onValueChange={(value) => handleFilterChange('sortOrder', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading invoices from blockchain...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Error loading invoices</p>
                    <p className="text-sm">{error.message}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Invoice List */}
          {!isLoading && !error && invoices && (
            <>
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Invoices Found</h3>
                      <p className="text-muted-foreground mb-4">
                        {filters.status === 'pending' 
                          ? "No invoices available for financing at the moment."
                          : "Try adjusting your filters to see more results."}
                      </p>
                      <Button onClick={() => setFilters({ status: 'all', sortBy: 'createdAt', sortOrder: 'desc' })}>
                        Reset Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {invoices.map((invoice) => (
                      <BlockchainInvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        onFinance={invoice.status === InvoiceStatus.PENDING ? handleFinance : undefined}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Finance Invoice Modal */}
      <FinanceInvoiceModal
        invoice={selectedInvoice}
        open={financeModalOpen}
        onOpenChange={setFinanceModalOpen}
        onSuccess={handleFinanceSuccess}
      />
    </div>
  );
};

export default Marketplace;

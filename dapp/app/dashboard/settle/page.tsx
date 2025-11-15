"use client";

import { useState } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import Navigation from "@/components/Navigation";
import { SettleInvoiceModal } from "@/components/SettleInvoiceModal";
import { useMyPayableInvoices } from "@/hooks/useInvoices";
import {
  OnChainInvoice,
  InvoiceStatus,
  formatDate,
  getDaysUntilDue,
} from "@/types/invoice";
import {
  Loader2,
  AlertCircle,
  Wallet,
  Receipt,
  Clock,
} from "lucide-react";
import SUILogo from "@/components/ui/sui-logo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DebugPanel } from "@/components/DebugPanel";

const SettleDashboard = () => {
  const { currentAccount } = useWalletKit();
  const { data: invoices, isLoading, error, refetch } = useMyPayableInvoices();
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OnChainInvoice | null>(
    null
  );

  const handleSettleClick = (invoice: OnChainInvoice) => {
    setSelectedInvoice(invoice);
    setSettleModalOpen(true);
  };

  const handleSettleSuccess = () => {
    refetch();
    console.log("Invoice settled successfully!");
  };

  // Filter invoices by status
  const fundedInvoices =
    invoices?.filter((inv) => inv.status === InvoiceStatus.FINANCED) || [];
  const repaidInvoices =
    invoices?.filter((inv) => inv.status === InvoiceStatus.PAID) || [];
  const pendingInvoices =
    invoices?.filter((inv) => inv.status === InvoiceStatus.CREATED) || [];
  // Calculate total amounts
  const totalPayable = fundedInvoices.reduce(
    (sum, inv) => sum + inv.amountInSui,
    0
  );
  const totalPaid = repaidInvoices.reduce(
    (sum, inv) => sum + inv.amountInSui,
    0
  );

  // Show wallet connection prompt if no wallet
  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-7xl">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Wallet className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Please connect your wallet to view and settle your invoices
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  You need to connect a Sui wallet to access the settlement
                  dashboard
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          {/* Debug Panel */}
          <div className="mb-6">
            <DebugPanel />
          </div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Buyer Dashboard (Settle Invoices)</h1>
            <p className="text-muted-foreground">
              View and settle invoices where you are the buyer/debtor
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Invoices to Settle
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fundedInvoices.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Funded and awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Payable
                </CardTitle>
                <SUILogo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalPayable.toFixed(2)} SUI
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount to be settled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Settled Total
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalPaid.toFixed(2)} SUI
                </div>
                <p className="text-xs text-muted-foreground">
                  {repaidInvoices.length} invoices paid
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    Loading your invoices...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive font-semibold mb-2">
                    Failed to load invoices
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error
                      ? error.message
                      : "Please try again later"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info Alert */}
              {fundedInvoices.length > 0 && (
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have {fundedInvoices.length} invoice
                    {fundedInvoices.length > 1 ? "s" : ""} ready to settle. Pay
                    the full invoice amount to complete the transaction and
                    release funds to the investor.
                  </AlertDescription>
                </Alert>
              )}

              {/* Funded Invoices - Need Settlement */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">
                  Awaiting Settlement ({fundedInvoices.length})
                </h2>
                {fundedInvoices.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-muted-foreground">
                        No invoices awaiting settlement
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {fundedInvoices.map((invoice) => {
                      const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                      const isOverdue = daysUntilDue < 0;

                      return (
                        <Card
                          key={invoice.id}
                          className={isOverdue ? "border-destructive" : ""}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  Invoice #{invoice.invoiceNumber}
                                </CardTitle>
                                <CardDescription>
                                  Issued by: {invoice.issuer.slice(0, 6)}...
                                  {invoice.issuer.slice(-4)}
                                </CardDescription>
                              </div>
                              <Badge
                                variant={isOverdue ? "destructive" : "default"}
                              >
                                {isOverdue ? "OVERDUE" : "Active"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Amount Due
                                </p>
                                <p className="font-semibold text-lg">
                                  {invoice.amountInSui.toFixed(2)} SUI
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Due Date
                                </p>
                                <p className="font-semibold">
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Days Until Due
                                </p>
                                <p
                                  className={`font-semibold ${
                                    isOverdue ? "text-destructive" : ""
                                  }`}
                                >
                                  {isOverdue
                                    ? `${Math.abs(daysUntilDue)} days overdue`
                                    : `${daysUntilDue} days`}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Financed By
                                </p>
                                <p className="font-semibold text-sm">
                                  {invoice.financedBy
                                    ? `${invoice.financedBy.slice(
                                        0,
                                        6
                                      )}...${invoice.financedBy.slice(-4)}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            {invoice.description && (
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground">
                                  Description
                                </p>
                                <p className="text-sm">{invoice.description}</p>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="border-t pt-4">
                            <Button
                              className="w-full"
                              onClick={() => handleSettleClick(invoice)}
                            >
                              Settle Invoice - Pay{" "}
                              {invoice.amountInSui.toFixed(2)} SUI
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Settled Invoices */}
              {repaidInvoices.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">
                    Settled Invoices ({repaidInvoices.length})
                  </h2>
                  <div className="space-y-4">
                    {repaidInvoices.map((invoice) => (
                      <Card key={invoice.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                Invoice #{invoice.invoiceNumber}
                              </CardTitle>
                              <CardDescription>
                                Issued by: {invoice.issuer.slice(0, 6)}...
                                {invoice.issuer.slice(-4)}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary">Paid</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Amount Paid
                              </p>
                              <p className="font-semibold">
                                {invoice.amountInSui.toFixed(2)} SUI
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Due Date
                              </p>
                              <p className="font-semibold">
                                {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Status
                              </p>
                              <Badge variant="outline">Completed</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Settlement Modal */}
          {selectedInvoice && (
            <SettleInvoiceModal
              open={settleModalOpen}
              onOpenChange={setSettleModalOpen}
              invoice={{
                id: selectedInvoice.id,
                invoiceNumber: selectedInvoice.invoiceNumber,
                amount: selectedInvoice.amountInSui,
                dueDate: formatDate(selectedInvoice.dueDate),
              }}
              onSuccess={handleSettleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettleDashboard;

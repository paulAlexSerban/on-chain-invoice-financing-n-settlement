"use client";

import Navigation from "@/components/Navigation";
import InvestorDashboardHeader from "@/components/InvestorDashboardHeader";
import PortfolioStatsCards from "@/components/PortfolioStatsCards";
import InvestmentList from "@/components/InvestmentList";
import PortfolioDistribution from "@/components/PortfolioDistribution";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { Investment } from "@/components/InvestmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyInvestments } from "@/hooks/useInvoices";
import { OnChainInvoice, InvoiceStatus, formatDate } from "@/types/invoice";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const InvestorDashboard = () => {
  const { data: investments, isLoading, error } = useMyInvestments();

  // Convert OnChainInvoice to Investment format
  const convertToInvestment = (invoice: OnChainInvoice): Investment => {
    const investorPaid = invoice.investorPaidInSui || 0;
    const invoiceAmount = invoice.amountInSui;
    const discountRateBps = parseInt(invoice.discountRateBps || "0");

    // Calculate expected return (simplified - doesn't include platform fees)
    // In reality, this should be: invoiceAmount - takeRateFee - settlementFee
    const expectedReturn = invoiceAmount * 0.998; // Approximate after 10% take-rate on discount + settlement fee

    const returnRate = investorPaid > 0
      ? ((expectedReturn - investorPaid) / investorPaid) * 100
      : 0;

    return {
      id: invoice.id,
      business: invoice.issuer.slice(0, 6) + "..." + invoice.issuer.slice(-4), // Short address
      invoiceId: invoice.invoiceNumber,
      invested: investorPaid,
      expectedReturn: invoice.status === InvoiceStatus.FUNDED ? expectedReturn : undefined,
      actualReturn: invoice.status === InvoiceStatus.REPAID ? expectedReturn : undefined,
      returnRate,
      dueDate: invoice.status === InvoiceStatus.FUNDED ? formatDate(invoice.dueDate) : undefined,
      settledDate: invoice.status === InvoiceStatus.REPAID ? formatDate(invoice.dueDate) : undefined,
      rating: "A", // TODO: Implement rating system
      status: invoice.status === InvoiceStatus.FUNDED ? "active" : "settled",
    };
  };

  const activeInvestments: Investment[] = investments
    ?.filter((inv) => inv.status === InvoiceStatus.FUNDED)
    .map(convertToInvestment) || [];

  const settledInvestments: Investment[] = investments
    ?.filter((inv) => inv.status === InvoiceStatus.REPAID)
    .map(convertToInvestment) || [];

  const handleInvestmentClick = (investment: Investment) => {
    console.log("Viewing investment:", investment);
    const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
    const url = network === "mainnet"
      ? `https://suivision.xyz/object/${investment.id}`
      : `https://testnet.suivision.xyz/object/${investment.id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <InvestorDashboardHeader />

          <PortfolioStatsCards />

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading your investments...</p>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
                  <p className="text-destructive font-semibold mb-2">Failed to load investments</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "Please try again later"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList>
                <TabsTrigger value="active">
                  Active Investments ({activeInvestments.length})
                </TabsTrigger>
                <TabsTrigger value="settled">
                  Settled ({settledInvestments.length})
                </TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <InvestmentList
                  investments={activeInvestments}
                  emptyMessage="No active investments found. Visit the marketplace to finance invoices!"
                  onInvestmentClick={handleInvestmentClick}
                />
              </TabsContent>

              <TabsContent value="settled">
                <InvestmentList
                  investments={settledInvestments}
                  emptyMessage="No settled investments yet."
                  onInvestmentClick={handleInvestmentClick}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PortfolioDistribution />
                  <PerformanceMetrics />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;

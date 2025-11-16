"use client";

import { useEffect, useState, useMemo } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import Navigation from "@/components/Navigation";
import InvestorDashboardHeader from "@/components/InvestorDashboardHeader";
import PortfolioStatsCards, {
  PortfolioStats,
} from "@/components/PortfolioStatsCards";
import InvestmentList from "@/components/InvestmentList";
import PortfolioDistribution from "@/components/PortfolioDistribution";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { Investment } from "@/components/InvestmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSharedInvoices } from "@/hooks/useSharedInvoices";
import { OnChainInvoice, InvoiceStatus, formatDate } from "@/types/invoice";
import { Loader2, AlertCircle, Wallet, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DebugPanel } from "@/components/DebugPanel";

const InvestorDashboard = () => {
  const { currentAccount } = useWalletKit();
  // Use useSharedInvoices (same as marketplace) to get ALL invoices from localStorage
  const { data: allInvoices, isLoading, error } = useSharedInvoices();
  
  // Filter to show only invoices financed by the current user (investor)
  const investments = useMemo(() => {
    if (!allInvoices || !currentAccount?.address) {
      console.log("⚠️ Investor Dashboard: No data", { 
        hasInvoices: !!allInvoices, 
        hasAccount: !!currentAccount?.address 
      });
      return [];
    }
    
    console.log("🔍 Filtering Investor Dashboard Invoices");
    console.log("Current investor address:", currentAccount.address);
    console.log("Total invoices loaded:", allInvoices.length);
    
    // Log all invoices to see their financedBy field
    console.log("📊 All invoices with financing status:");
    allInvoices.forEach((inv, idx) => {
      console.log(`Invoice ${idx + 1}:`, {
        id: inv.id.slice(0, 8),
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        statusLabel: inv.status === 0 ? "Created" : inv.status === 1 ? "Ready" : inv.status === 2 ? "Financed" : inv.status === 3 ? "Paid" : "Unknown",
        financedBy: inv.financedBy || "NOT SET",
        investorPaid: inv.investorPaidInSui,
        supplier: inv.supplier?.slice(0, 8),
      });
    });
    
    const filtered = allInvoices.filter((inv) => {
      // Check if this invoice was financed by the current user
      // The financedBy field (from investor Option field) should match current wallet address
      const isMyInvestment = inv.financedBy?.toLowerCase() === currentAccount.address.toLowerCase();
      
      if (isMyInvestment) {
        console.log("✅ MY INVESTMENT FOUND:", {
          id: inv.id.slice(0, 8),
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          investorPaid: inv.investorPaidInSui,
          supplier: inv.supplier?.slice(0, 8),
        });
      }
      
      return isMyInvestment;
    });
    
    console.log("My investments (as investor):", filtered.length);
    console.log("Status breakdown:", {
      financed: filtered.filter(i => i.status === InvoiceStatus.FINANCED).length,
      paid: filtered.filter(i => i.status === InvoiceStatus.PAID).length,
    });
    
    if (filtered.length === 0) {
      console.log("❌ NO INVESTMENTS FOUND - Possible reasons:");
      console.log("1. Check if any invoices have status = 2 (Financed)");
      console.log("2. Check if financedBy field matches your wallet:", currentAccount.address);
      console.log("3. Make sure you financed an invoice in the marketplace");
    }
    
    return filtered;
  }, [allInvoices, currentAccount?.address]);
  
  const [kycStatus, setKycStatus] = useState<
    "approved" | "pending" | "rejected" | "loading"
  >("loading");

  // Fetch KYC status when wallet connects
  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!currentAccount?.address) {
        setKycStatus("loading");
        return;
      }

      try {
        const response = await fetch(
          `/api/kyc/status/${currentAccount.address}`
        );
        if (response.ok) {
          const data = await response.json();
          setKycStatus(data.status);
        } else {
          // Auto-submit KYC if not found (MVP behavior)
          const submitResponse = await fetch("/api/kyc/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: currentAccount.address }),
          });
          if (submitResponse.ok) {
            const data = await submitResponse.json();
            setKycStatus(data.status);
          }
        }
      } catch (error) {
        console.error("Error fetching KYC status:", error);
        setKycStatus("pending");
      }
    };

    fetchKYCStatus();
  }, [currentAccount?.address]);

  // Convert OnChainInvoice to Investment format
  const convertToInvestment = (invoice: OnChainInvoice): Investment => {
    const investorPaid = invoice.investorPaidInSui || 0;
    const invoiceAmount = invoice.amountInSui;
    const discountRateBps = parseInt(invoice.discountRateBps || "0");

    // Calculate expected return (simplified - doesn't include platform fees)
    // In reality, this should be: invoiceAmount - takeRateFee - settlementFee
    const expectedReturn = invoiceAmount * 0.998; // Approximate after 10% take-rate on discount + settlement fee

    const returnRate =
      investorPaid > 0
        ? ((expectedReturn - investorPaid) / investorPaid) * 100
        : 0;

    return {
      id: invoice.id,
      business: invoice.issuer.slice(0, 6) + "..." + invoice.issuer.slice(-4), // Short address
      invoiceId: invoice.invoiceNumber,
      invested: investorPaid,
      expectedReturn:
        invoice.status === InvoiceStatus.FINANCED ? expectedReturn : undefined,
      actualReturn:
        invoice.status === InvoiceStatus.PAID ? expectedReturn : undefined,
      returnRate,
      dueDate:
        invoice.status === InvoiceStatus.FINANCED
          ? formatDate(invoice.dueDate)
          : undefined,
      settledDate:
        invoice.status === InvoiceStatus.PAID
          ? formatDate(invoice.dueDate)
          : undefined,
      rating: "A", // TODO: Implement rating system
      status: invoice.status === InvoiceStatus.FINANCED ? "active" : "settled",
    };
  };

  const activeInvestments: Investment[] =
    investments
      ?.filter((inv) => inv.status === InvoiceStatus.FINANCED)
      .map(convertToInvestment) || [];

  const settledInvestments: Investment[] =
    investments
      ?.filter((inv) => inv.status === InvoiceStatus.PAID)
      .map(convertToInvestment) || [];

  const handleInvestmentClick = (investment: Investment) => {
    console.log("Viewing investment:", investment);
    const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
    const url =
      network === "mainnet"
        ? `https://suivision.xyz/object/${investment.id}`
        : `https://testnet.suivision.xyz/object/${investment.id}`;
    window.open(url, "_blank");
  };

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
                  Please connect your wallet to view your investment portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  You need to connect a Sui wallet to access the investor
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
          <InvestorDashboardHeader />

          {/* Debug Panel */}
          <div className="mb-6">
            <DebugPanel />
          </div>

          {/* KYC Status Banner */}
          {kycStatus === "approved" && (
            <Card className="mb-6 border-green-500/50 bg-green-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      KYC Verified
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your account is verified and ready to invest
                    </p>
                  </div>
                  <Badge className="ml-auto" variant="outline">
                    Verified
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    Loading your investments...
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
                    Failed to load investments
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
                  showSettleButton={false}
                />
              </TabsContent>

              <TabsContent value="settled">
                <InvestmentList
                  investments={settledInvestments}
                  emptyMessage="No settled investments yet."
                  onInvestmentClick={handleInvestmentClick}
                  showSettleButton={false}
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

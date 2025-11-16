"use client";
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import SUILogo from "@/components/ui/sui-logo";
import { useWalletKit } from "@mysten/wallet-kit";
import Navigation from "@/components/Navigation";
import StatsOverview, { StatsOverviewProps } from "@/components/StatsOverview";
import DashboardHeader from "@/components/DashboardHeader";
import InvoiceList from "@/components/InvoiceList";
import CreateInvoiceForm, {
  InvoiceFormData,
} from "@/components/CreateInvoiceForm";
import { InvoiceData } from "@/components/InvoiceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DebugPanel } from "@/components/DebugPanel";
import { useMyInvoices } from "@/hooks/useInvoices";
import {
  OnChainInvoice,
  InvoiceStatus,
  formatDate,
  getDaysUntilDue,
} from "@/types/invoice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BusinessDashboard = () => {
  const { currentAccount } = useWalletKit();
  const { data: myInvoices, isLoading, error, refetch } = useMyInvoices();
  const [kycStatus, setKycStatus] = useState<
    "approved" | "pending" | "rejected" | "loading"
  >("loading");
  const [activeTab, setActiveTab] = useState<string>("active");

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

  // Calculate statistics from blockchain invoices
  const stats = useMemo(() => {
    if (!myInvoices || myInvoices.length === 0) {
      return {
        total: 0,
        active: 0,
        settled: 0,
        totalFinanced: 0,
        pendingAmount: 0,
        avgDiscount: 0,
      };
    }

    const active = myInvoices.filter(
      (inv) =>
        inv.status === InvoiceStatus.CREATED ||
        inv.status === InvoiceStatus.FINANCED
    );
    const settled = myInvoices.filter(
      (inv) => inv.status === InvoiceStatus.PAID
    );
    const financed = myInvoices.filter(
      (inv) =>
        inv.status === InvoiceStatus.FINANCED ||
        inv.status === InvoiceStatus.PAID
    );

    const totalFinanced = financed.reduce(
      (sum, inv) => sum + (inv.financedAmountInSui || 0),
      0
    );
    const pendingAmount = active.reduce((sum, inv) => sum + inv.amountInSui, 0);

    // Calculate average discount (mock for now, as we don't have discount data on-chain)
    const avgDiscount = 3.5; // Default mock value

    return {
      total: myInvoices.length,
      active: active.length,
      settled: settled.length,
      totalFinanced,
      pendingAmount,
      avgDiscount,
    };
  }, [myInvoices]);

  const cards: StatsOverviewProps[] = [
    {
      title: "Total Invoices",
      icon: FileText,
      value: stats.total,
      description: `${stats.active} active, ${stats.settled} settled`,
    },
    {
      title: "Total Financed",
      icon: SUILogo,
      value: `${stats.totalFinanced.toFixed(2)} SUI`,
      description: "Lifetime value",
    },
    {
      title: "Pending Amount",
      icon: Clock,
      value: `${stats.pendingAmount.toFixed(2)} SUI`,
      description: `${stats.active} active invoices`,
    },
    {
      title: "Avg. Discount",
      icon: TrendingUp,
      value: `${stats.avgDiscount}%`,
      description: "Better than average",
      highlight: true,
    },
  ];

  // Convert OnChainInvoice to InvoiceData format for display
  const convertToInvoiceData = (invoice: OnChainInvoice): InvoiceData => {
    const statusMap: Record<number, "financed" | "listed" | "settled"> = {
      [InvoiceStatus.CREATED]: "listed",
      [InvoiceStatus.FINANCED]: "financed",
      [InvoiceStatus.PAID]: "settled",
      [InvoiceStatus.DEFAULTED]: "settled",
    };

    // Use new contract fields if available, fallback to legacy fields
    const receivedAmount =
      invoice.status === InvoiceStatus.FINANCED ||
      invoice.status === InvoiceStatus.PAID
        ? invoice.supplierReceivedInSui || invoice.financedAmountInSui
        : undefined;

    const calculatedDiscount = invoice.discountRateBps
      ? parseFloat(invoice.discountRateBps) / 100 // Convert basis points to percentage
      : 5; // Mock default

    return {
      id: invoice.id,
      invoiceNumber: `Invoice #${invoice.invoiceNumber}`,
      clientName: invoice.buyer.substring(0, 20) + "...", // Truncated buyer info
      amount: invoice.amountInSui,
      receivedAmount,
      expectedAmount:
        invoice.status === InvoiceStatus.CREATED
          ? invoice.amountInSui * 0.95
          : undefined,
      discount: calculatedDiscount,
      dueDate: formatDate(invoice.dueDate),
      settledDate:
        invoice.status === InvoiceStatus.PAID
          ? formatDate(invoice.dueDate)
          : undefined,
      status: statusMap[invoice.status] || "listed",
    };
  };

  // Filter invoices by status
  const activeInvoices = useMemo(() => {
    if (!myInvoices) return [];
    return myInvoices
      .filter(
        (inv) =>
          inv.status === InvoiceStatus.CREATED ||
          inv.status === InvoiceStatus.FINANCED
      )
      .map(convertToInvoiceData);
  }, [myInvoices]);

  const settledInvoices = useMemo(() => {
    if (!myInvoices) return [];
    return myInvoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .map(convertToInvoiceData);
  }, [myInvoices]);

  const handleCreateInvoice = (data: InvoiceFormData) => {
    console.log("Creating invoice:", data);
    // The CreateInvoiceForm component handles the blockchain transaction
    // After success, refetch invoices
    setTimeout(() => {
      refetch();
    }, 3000);
  };

  const handleInvoiceClick = (invoice: InvoiceData) => {
    console.log("Viewing invoice:", invoice);
    // TODO: Navigate to invoice detail page or show modal
  };

  // Show wallet connection prompt
  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-7xl">
            <Card>
              <CardHeader>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Please connect your wallet to access the business dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Click the "Connect Wallet" button in the navigation to get
                  started.
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
          <DashboardHeader
            title="Seller/Business Dashboard"
            description="Manage your invoices and track financing status"
            buttonText="New Invoice"
            onButtonClick={() => setActiveTab("create")}
          />

          {/* Debug Panel */}
          <div className="mb-6">
            <DebugPanel />
          </div>

          {/* KYC Status Banner */}
          {kycStatus !== "loading" && (
            <Card
              className={`mb-6 ${
                kycStatus === "approved"
                  ? "border-green-500/50"
                  : "border-yellow-500/50"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {kycStatus === "approved" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {kycStatus === "approved"
                        ? "KYC Verified"
                        : "KYC Pending"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {kycStatus === "approved"
                        ? "Your account is verified and ready to create invoices"
                        : "Your KYC verification is being processed"}
                    </p>
                  </div>
                  <Badge
                    variant={kycStatus === "approved" ? "default" : "secondary"}
                  >
                    {kycStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  <p className="text-muted-foreground">
                    Loading your invoices from blockchain...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-red-500/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-500">
                      Error Loading Invoices
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {error instanceof Error
                        ? error.message
                        : "Failed to fetch invoices from blockchain"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          {!isLoading && !error && <StatsOverview cards={cards} />}

          {/* Time-to-Funding Metrics (MVP Requirement) */}
          {!isLoading && !error && myInvoices && myInvoices.length > 0 && (
            <Card className="mb-6 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Platform Performance
                    </p>
                    <p className="text-2xl font-bold">
                      {
                        myInvoices.filter(
                          (inv) => inv.status !== InvoiceStatus.CREATED
                        ).length
                      }{" "}
                      of {myInvoices.length} Financed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Time to Funding (Avg)
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      ~35s{" "}
                      <span className="text-sm text-muted-foreground">
                        (estimated)
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs
            defaultValue="active"
            className="space-y-6"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="active">
                Active Invoices ({activeInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="settled">
                Settled ({settledInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {!isLoading && activeInvoices.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Active Invoices
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first invoice to get started with invoice
                        financing
                      </p>
                      <Button onClick={() => setActiveTab("create")}>
                        Create Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <InvoiceList
                  invoices={activeInvoices}
                  emptyMessage="No active invoices found"
                  onInvoiceClick={handleInvoiceClick}
                />
              )}
            </TabsContent>

            <TabsContent value="settled">
              {!isLoading && settledInvoices.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Settled Invoices
                      </h3>
                      <p className="text-muted-foreground">
                        Settled invoices will appear here once they are repaid
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <InvoiceList
                  invoices={settledInvoices}
                  emptyMessage="No settled invoices found"
                  onInvoiceClick={handleInvoiceClick}
                />
              )}
            </TabsContent>

            <TabsContent value="create">
              <CreateInvoiceForm
                onSuccess={(invoiceId) => {
                  console.log("Invoice created:", invoiceId);
                  // Refetch invoices after successful creation
                  setTimeout(() => refetch(), 2000);
                  // Switch to active tab
                  setTimeout(() => {
                    const activeTab = document.querySelector(
                      '[value="active"]'
                    ) as HTMLElement;
                    activeTab?.click();
                  }, 2500);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;

"use client";

import Navigation from "@/components/Navigation";
import InvestorDashboardHeader from "@/components/InvestorDashboardHeader";
import PortfolioStatsCards from "@/components/PortfolioStatsCards";
import InvestmentList from "@/components/InvestmentList";
import PortfolioDistribution from "@/components/PortfolioDistribution";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { Investment } from "@/components/InvestmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const InvestorDashboard = () => {
  // Mock data for active investments
  const activeInvestments: Investment[] = [
    {
      id: "1",
      business: "TechCorp Solutions",
      invoiceId: "INV-001",
      invested: 47500,
      expectedReturn: 50000,
      returnRate: 5.26,
      dueDate: "Feb 15, 2024",
      rating: "A",
      status: "active",
    },
    {
      id: "2",
      business: "Global Manufacturing Ltd",
      invoiceId: "INV-002",
      invested: 120000,
      expectedReturn: 125000,
      returnRate: 4.17,
      dueDate: "Mar 1, 2024",
      rating: "AA",
      status: "active",
    },
  ];

  // Mock data for settled investments
  const settledInvestments: Investment[] = [
    {
      id: "3",
      business: "Healthcare Services Co",
      invoiceId: "INV-154",
      invested: 58000,
      actualReturn: 60000,
      returnRate: 3.45,
      settledDate: "Jan 28, 2024",
      rating: "AAA",
      status: "settled",
    },
    {
      id: "4",
      business: "Retail Innovations Inc",
      invoiceId: "INV-143",
      invested: 45600,
      actualReturn: 48000,
      returnRate: 5.26,
      settledDate: "Jan 15, 2024",
      rating: "A",
      status: "settled",
    },
  ];

  const handleInvestmentClick = (investment: Investment) => {
    console.log("Viewing investment:", investment);
    // TODO: Implement investment detail view
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <InvestorDashboardHeader />

          <PortfolioStatsCards />

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active Investments</TabsTrigger>
              <TabsTrigger value="settled">Settled</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <InvestmentList
                investments={activeInvestments}
                emptyMessage="No active investments found"
                onInvestmentClick={handleInvestmentClick}
              />
            </TabsContent>

            <TabsContent value="settled">
              <InvestmentList
                investments={settledInvestments}
                emptyMessage="No settled investments found"
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
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;

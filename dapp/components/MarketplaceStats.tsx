import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface MarketplaceStatsData {
  totalAvailable: string;
  activeInvoices: number;
  avgDiscount: string;
  avgReturn: string;
}

interface MarketplaceStatsProps {
  stats?: MarketplaceStatsData;
}

const defaultStats: MarketplaceStatsData = {
  totalAvailable: "$2.4M",
  activeInvoices: 142,
  avgDiscount: "4.8%",
  avgReturn: "12.5%",
};

const MarketplaceStats = ({ stats = defaultStats }: MarketplaceStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Available</CardDescription>
          <CardTitle className="text-2xl">{stats.totalAvailable}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active Invoices</CardDescription>
          <CardTitle className="text-2xl">{stats.activeInvoices}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg. Discount</CardDescription>
          <CardTitle className="text-2xl">{stats.avgDiscount}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg. Return</CardDescription>
          <CardTitle className="text-2xl text-accent">{stats.avgReturn}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};

export default MarketplaceStats;

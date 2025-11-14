import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, PieChart } from "lucide-react";

export interface PortfolioStats {
  totalInvested: string;
  totalInvestments: number;
  totalReturns: string;
  avgReturn: string;
  activeValue: string;
  pendingSettlements: number;
  successRate: string;
  successDescription: string;
}

interface PortfolioStatsCardsProps {
  stats?: PortfolioStats;
}

const defaultStats: PortfolioStats = {
  totalInvested: "$280K",
  totalInvestments: 12,
  totalReturns: "$14.2K",
  avgReturn: "5.07% average return",
  activeValue: "$156K",
  pendingSettlements: 7,
  successRate: "100%",
  successDescription: "All invoices settled",
};

const PortfolioStatsCards = ({ stats = defaultStats }: PortfolioStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Total Invested
          </CardDescription>
          <CardTitle className="text-3xl">{stats.totalInvested}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Across {stats.totalInvestments} invoices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Total Returns
          </CardDescription>
          <CardTitle className="text-3xl text-accent">{stats.totalReturns}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{stats.avgReturn}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Active Value
          </CardDescription>
          <CardTitle className="text-3xl">{stats.activeValue}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {stats.pendingSettlements} pending settlements
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Success Rate
          </CardDescription>
          <CardTitle className="text-3xl">{stats.successRate}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{stats.successDescription}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioStatsCards;

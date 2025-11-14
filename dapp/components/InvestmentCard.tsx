import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Investment {
  id: string;
  business: string;
  invoiceId: string;
  invested: number;
  expectedReturn?: number;
  actualReturn?: number;
  returnRate: number;
  dueDate?: string;
  settledDate?: string;
  rating: string;
  status: "active" | "settled";
}

interface InvestmentCardProps {
  investment: Investment;
  onClick?: (investment: Investment) => void;
}

const InvestmentCard = ({ investment, onClick }: InvestmentCardProps) => {
  const getStatusBadge = () => {
    if (investment.status === "settled") {
      return <Badge variant="secondary">Settled</Badge>;
    }
    return <Badge>Active</Badge>;
  };

  const isSettled = investment.status === "settled";

  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onClick?.(investment)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{investment.business}</CardTitle>
            <CardDescription>Invoice #{investment.invoiceId}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Invested</p>
            <p className="font-semibold">${investment.invested.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isSettled ? "Returned" : "Expected Return"}
            </p>
            <p className="font-semibold text-accent">
              ${(isSettled ? investment.actualReturn : investment.expectedReturn)?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Return Rate</p>
            <p className="font-semibold">{investment.returnRate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isSettled ? "Settled Date" : "Due Date"}
            </p>
            <p className="font-semibold">
              {isSettled ? investment.settledDate : investment.dueDate}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isSettled ? "Status" : "Rating"}
            </p>
            {isSettled ? (
              <Badge variant="secondary">Paid</Badge>
            ) : (
              <Badge variant="outline">{investment.rating}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentCard;

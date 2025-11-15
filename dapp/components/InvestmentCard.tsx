import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

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
  onSettle?: (investment: Investment) => void;
  showSettleButton?: boolean;
}

const InvestmentCard = ({ investment, onClick, onSettle, showSettleButton = false }: InvestmentCardProps) => {
  const getStatusBadge = () => {
    if (investment.status === "settled") {
      return <Badge variant="secondary">Settled</Badge>;
    }
    return <Badge>Active</Badge>;
  };

  const isSettled = investment.status === "settled";

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(investment);
  };

  return (
    <Card className="hover:border-primary transition-colors">
      <div className="cursor-pointer" onClick={handleCardClick}>
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
      </div>
      
      {showSettleButton && !isSettled && (
        <CardFooter className="border-t pt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(investment);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button 
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onSettle?.(investment);
            }}
          >
            Settle {investment.expectedReturn?.toFixed(2)} SUI
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default InvestmentCard;

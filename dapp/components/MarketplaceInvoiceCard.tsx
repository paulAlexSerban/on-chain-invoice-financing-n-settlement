import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Building,
} from "lucide-react";
import SUILogo from "./ui/sui-logo";

export interface MarketplaceInvoice {
  id: string;
  business: string;
  amount: number;
  discount: number;
  dueDate: string;
  rating: "AAA" | "AA" | "A" | "B";
  industry: string;
}

interface MarketplaceInvoiceCardProps {
  invoice: MarketplaceInvoice;
  onPurchase?: (invoice: MarketplaceInvoice) => void;
  onViewDetails?: (invoice: MarketplaceInvoice) => void;
}

const MarketplaceInvoiceCard = ({
  invoice,
  onPurchase,
  onViewDetails,
}: MarketplaceInvoiceCardProps) => {
  const getRatingVariant = () => {
    switch (invoice.rating) {
      case "AAA":
        return "default";
      case "AA":
        return "secondary";
      default:
        return "outline";
    }
  };

  const calculateInvestmentAmount = () => {
    return invoice.amount * (1 - invoice.discount / 100);
  };

  return (
    <Card className="hover:border-primary transition-colors">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{invoice.business}</h3>
                  <Badge variant={getRatingVariant()}>
                    {invoice.rating} Rated
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Invoice ID: {invoice.id} • {invoice.industry}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <SUILogo className="h-3 w-3" />
                  Invoice Amount
                </div>
                <div className="font-semibold">
                  ${invoice.amount.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Discount Rate
                </div>
                <div className="font-semibold text-accent">
                  {invoice.discount}%
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <SUILogo className="h-3 w-3" />
                  Your Investment
                </div>
                <div className="font-semibold">
                  ${calculateInvestmentAmount().toLocaleString()}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  Due Date
                </div>
                <div className="font-semibold">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="whitespace-nowrap"
              onClick={() => onPurchase?.(invoice)}
            >
              Purchase Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(invoice)}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceInvoiceCard;

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  receivedAmount?: number;
  expectedAmount?: number;
  discount: number;
  dueDate?: string;
  settledDate?: string;
  status: "financed" | "listed" | "settled";
}

interface InvoiceCardProps {
  invoice: InvoiceData;
  onViewClick?: () => void;
}

const InvoiceCard = ({ invoice, onViewClick }: InvoiceCardProps) => {
  const getStatusBadge = () => {
    switch (invoice.status) {
      case "financed":
        return <Badge>Financed</Badge>;
      case "listed":
        return <Badge variant="outline">Listed</Badge>;
      case "settled":
        return <Badge variant="secondary">Settled</Badge>;
      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (invoice.status) {
      case "financed":
        return "View on Blockchain";
      case "listed":
        return "View Listing";
      case "settled":
        return "View Transaction";
      default:
        return "View Details";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{invoice.invoiceNumber}</CardTitle>
            <CardDescription>Client: {invoice.clientName}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {invoice.status === "settled"
                ? "Received"
                : invoice.status === "financed"
                  ? "Received"
                  : "Expected"}
            </p>
            <p className="font-semibold text-accent">
              $
              {(
                invoice.receivedAmount ||
                invoice.expectedAmount ||
                0
              ).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Discount</p>
            <p className="font-semibold">{invoice.discount}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {invoice.status === "settled" ? "Settled" : "Due Date"}
            </p>
            <p className="font-semibold">
              {invoice.settledDate || invoice.dueDate || "N/A"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onViewClick}>
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;

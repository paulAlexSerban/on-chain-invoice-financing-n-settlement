import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, ExternalLink } from "lucide-react";

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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>{invoice.invoiceNumber}</CardTitle>
              {/* Trust Badges - On-chain verification */}
              <div className="flex items-center gap-1" title="Verified on-chain">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
              </div>
            </div>
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onViewClick} className="flex-1">
            {getButtonText()}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
              const url = network === "mainnet"
                ? `https://suivision.xyz/object/${invoice.id}`
                : `https://testnet.suivision.xyz/object/${invoice.id}`;
              window.open(url, '_blank');
            }}
            title="View on Sui Explorer"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;

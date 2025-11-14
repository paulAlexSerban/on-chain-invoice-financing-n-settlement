import MarketplaceInvoiceCard, {
  MarketplaceInvoice,
} from "@/components/MarketplaceInvoiceCard";

interface MarketplaceInvoiceListProps {
  invoices: MarketplaceInvoice[];
  emptyMessage?: string;
  onPurchase?: (invoice: MarketplaceInvoice) => void;
  onViewDetails?: (invoice: MarketplaceInvoice) => void;
}

const MarketplaceInvoiceList = ({
  invoices,
  emptyMessage = "No invoices available",
  onPurchase,
  onViewDetails,
}: MarketplaceInvoiceListProps) => {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <MarketplaceInvoiceCard
          key={invoice.id}
          invoice={invoice}
          onPurchase={onPurchase}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
};

export default MarketplaceInvoiceList;

import InvoiceCard, { InvoiceData } from "@/components/InvoiceCard";

interface InvoiceListProps {
  invoices: InvoiceData[];
  emptyMessage?: string;
  onInvoiceClick?: (invoice: InvoiceData) => void;
}

const InvoiceList = ({
  invoices,
  emptyMessage = "No invoices found",
  onInvoiceClick,
}: InvoiceListProps) => {
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
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          onViewClick={() => onInvoiceClick?.(invoice)}
        />
      ))}
    </div>
  );
};

export default InvoiceList;

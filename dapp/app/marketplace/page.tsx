"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import MarketplaceHeader from "@/components/MarketplaceHeader";
import MarketplaceFilters, {
  FilterValues,
} from "@/components/MarketplaceFilters";
import MarketplaceStats from "@/components/MarketplaceStats";
import MarketplaceInvoiceList from "@/components/MarketplaceInvoiceList";
import { MarketplaceInvoice } from "@/components/MarketplaceInvoiceCard";

const mockInvoices: MarketplaceInvoice[] = [
  {
    id: "INV-001",
    business: "TechCorp Solutions",
    amount: 50000,
    discount: 5,
    dueDate: "2025-12-15",
    rating: "A",
    industry: "Technology",
  },
  {
    id: "INV-002",
    business: "Global Manufacturing Ltd",
    amount: 125000,
    discount: 4,
    dueDate: "2025-12-01",
    rating: "AA",
    industry: "Manufacturing",
  },
  {
    id: "INV-003",
    business: "Retail Innovations Inc",
    amount: 75000,
    discount: 6,
    dueDate: "2025-12-20",
    rating: "A",
    industry: "Retail",
  },
  {
    id: "INV-004",
    business: "Healthcare Services Co",
    amount: 200000,
    discount: 3.5,
    dueDate: "2025-12-15",
    rating: "AAA",
    industry: "Healthcare",
  },
];

const Marketplace = () => {
  const [filters, setFilters] = useState<Partial<FilterValues>>({
    search: "",
    industry: "all",
    rating: "all",
    sortBy: "discount",
  });

  const handleFilterChange = (newFilters: Partial<FilterValues>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    console.log("Filters changed:", { ...filters, ...newFilters });
    // TODO: Implement filtering logic
  };

  const handlePurchase = (invoice: MarketplaceInvoice) => {
    console.log("Purchasing invoice:", invoice);
    // TODO: Implement purchase logic
  };

  const handleViewDetails = (invoice: MarketplaceInvoice) => {
    console.log("Viewing invoice details:", invoice);
    // TODO: Implement view details logic
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <MarketplaceHeader />

          <MarketplaceFilters
            onFilterChange={handleFilterChange}
            defaultValues={filters}
          />

          <MarketplaceStats />

          <MarketplaceInvoiceList
            invoices={mockInvoices}
            onPurchase={handlePurchase}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>
    </div>
  );
};

export default Marketplace;

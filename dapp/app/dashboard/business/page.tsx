"use client";
import { FileText, DollarSign, Clock, TrendingUp, Plus } from "lucide-react";
import Navigation from "@/components/Navigation";
import StatsOverview, { StatsOverviewProps } from "@/components/StatsOverview";
import DashboardHeader from "@/components/DashboardHeader";
import InvoiceList from "@/components/InvoiceList";
import CreateInvoiceForm, {
  InvoiceFormData,
} from "@/components/CreateInvoiceForm";
import { InvoiceData } from "@/components/InvoiceCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const BusinessDashboard = () => {
  const cards: StatsOverviewProps[] = [
    {
      title: "Total Invoices",
      icon: FileText,
      value: 24,
      description: "8 active, 16 settled",
    },
    {
      title: "Total Financed",
      icon: DollarSign,
      value: "$450K",
      description: "Lifetime value",
    },
    {
      title: "Pending Amount",
      icon: Clock,
      value: "$125K",
      description: "8 active invoices",
    },
    {
      title: "Avg. Discount",
      icon: TrendingUp,
      value: "4.2%",
      description: "Better than average",
      highlight: true,
    },
  ];

  // Mock data for active invoices
  const activeInvoices: InvoiceData[] = [
    {
      id: "1",
      invoiceNumber: "Invoice #INV-2024-001",
      clientName: "TechStart Inc.",
      amount: 50000,
      receivedAmount: 47500,
      discount: 5,
      dueDate: "Feb 15, 2024",
      status: "financed",
    },
    {
      id: "2",
      invoiceNumber: "Invoice #INV-2024-002",
      clientName: "Global Solutions LLC",
      amount: 75000,
      expectedAmount: 71250,
      discount: 5,
      dueDate: "Mar 1, 2024",
      status: "listed",
    },
  ];

  // Mock data for settled invoices
  const settledInvoices: InvoiceData[] = [
    {
      id: "3",
      invoiceNumber: "Invoice #INV-2023-156",
      clientName: "Enterprise Corp",
      amount: 100000,
      receivedAmount: 96000,
      discount: 4,
      settledDate: "Jan 15, 2024",
      status: "settled",
    },
  ];

  const handleCreateInvoice = (data: InvoiceFormData) => {
    console.log("Creating invoice:", data);
    // TODO: Implement invoice creation logic
  };

  const handleInvoiceClick = (invoice: InvoiceData) => {
    console.log("Viewing invoice:", invoice);
    // TODO: Implement invoice detail view
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <DashboardHeader
            title="Business Dashboard"
            description="Manage your invoices and track financing status"
            buttonText="New Invoice"
            onButtonClick={() => console.log("New invoice clicked")}
          />

          {/* Stats Overview */}
          <StatsOverview cards={cards} />

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active Invoices</TabsTrigger>
              <TabsTrigger value="settled">Settled</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <InvoiceList
                invoices={activeInvoices}
                emptyMessage="No active invoices found"
                onInvoiceClick={handleInvoiceClick}
              />
            </TabsContent>

            <TabsContent value="settled">
              <InvoiceList
                invoices={settledInvoices}
                emptyMessage="No settled invoices found"
                onInvoiceClick={handleInvoiceClick}
              />
            </TabsContent>

            <TabsContent value="create">
              <CreateInvoiceForm onSubmit={handleCreateInvoice} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;

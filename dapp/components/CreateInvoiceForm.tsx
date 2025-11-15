"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvoiceContract } from "@/hooks/useInvoiceContract";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface CreateInvoiceFormProps {
  onSuccess?: (invoiceId: string) => void;
}

export interface InvoiceFormData {
  clientName: string;
  amount: number;
  invoiceId: string;
  dueDate: string;
  discount: number;
  description?: string;
}

const CreateInvoiceForm = ({ onSuccess }: CreateInvoiceFormProps) => {
  const { createInvoice, isLoading, isConnected } = useInvoiceContract();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.group("📝 Form Submission");
    console.log("Timestamp:", new Date().toISOString());
    
    if (!isConnected) {
      console.error("❌ Wallet not connected - cannot submit");
      alert("Please connect your wallet first");
      console.groupEnd();
      return;
    }

    console.log("✅ Wallet connected, proceeding with submission");
    setIsSubmitting(true);
    
    // Store form reference before async operation
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const invoiceData = {
      invoiceNumber: formData.get("invoiceId") as string,
      buyer: formData.get("client") as string,
      amount: Number(formData.get("amount")),
      dueDate: new Date(formData.get("dueDate") as string),
      description: formData.get("description") as string || "",
    };

    console.log("📋 Form Data Collected:", invoiceData);
    console.log("💰 Amount (raw):", formData.get("amount"));
    console.log("💰 Amount (parsed):", invoiceData.amount);
    console.log("📅 Due Date (raw):", formData.get("dueDate"));
    console.log("📅 Due Date (parsed):", invoiceData.dueDate);
    
    try {
      console.log("🚀 Calling createInvoice hook...");
      const result = await createInvoice(invoiceData);

      console.log("📥 Result received from hook:", result);

      if (result?.success) {
        console.log("✅ Invoice created successfully!");
        console.log("🆔 Invoice ID:", result.invoiceId);
        console.log("🔗 Digest:", result.digest);
        
        // Reset form using stored reference
        if (form) {
          form.reset();
          console.log("🔄 Form reset");
        }
        
        onSuccess?.(result.invoiceId || "");
        console.log("✅ Success callback executed");
      } else {
        console.warn("⚠️ Result indicates failure or no result returned");
      }
      
      console.groupEnd();
    } catch (error) {
      console.error("❌ Unhandled error in form submission:", error);
      console.groupEnd();
    } finally {
      setIsSubmitting(false);
      console.log("🏁 Form submission process completed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Invoice</CardTitle>
        <CardDescription>
          Tokenize your invoice for instant financing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                name="client"
                placeholder="e.g., TechStart Inc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Invoice Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="50000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceId">Invoice ID</Label>
              <Input
                id="invoiceId"
                name="invoiceId"
                placeholder="INV-2024-003"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Desired Discount (%)</Label>
            <Input
              id="discount"
              name="discount"
              type="number"
              placeholder="5"
              step="0.1"
              required
            />
            <p className="text-sm text-muted-foreground">
              Lower discount rates increase chances of faster financing
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Services rendered for..."
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isConnected || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Invoice...
              </>
            ) : !isConnected ? (
              "Connect Wallet First"
            ) : (
              "Tokenize Invoice"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateInvoiceForm;

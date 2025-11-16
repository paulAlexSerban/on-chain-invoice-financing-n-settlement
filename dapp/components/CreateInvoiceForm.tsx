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
import { useSupplierRegistration } from "@/hooks/useSupplierRegistration";
import { Loader2, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";

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
  const { registerSupplier, getSupplierCapId, isLoading: isRegistering } = useSupplierRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSupplierCap, setHasSupplierCap] = useState(false);

  useEffect(() => {
    // Check if user has SupplierCap
    const checkCap = async () => {
      const capId = await getSupplierCapId();
      setHasSupplierCap(!!capId);
    };
    checkCap();

    // Also check when supplier registers
    const interval = setInterval(checkCap, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [getSupplierCapId, isRegistering]);

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
    
    // Validate required fields
    // Check both "buyer" and "client" field names for backward compatibility
    const buyerAddress = (formData.get("buyer") || formData.get("client")) as string | null;
    const invoiceNumber = formData.get("invoiceId") as string | null;
    const amount = formData.get("amount") as string | null;
    const dueDate = formData.get("dueDate") as string | null;
    
    console.log("🔍 Form field values:");
    console.log("  - buyer field:", formData.get("buyer"));
    console.log("  - client field:", formData.get("client"));
    console.log("  - buyerAddress:", buyerAddress);
    
    if (!buyerAddress || !buyerAddress.trim()) {
      alert("Please enter a buyer address");
      console.error("❌ Buyer address is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!invoiceNumber || !invoiceNumber.trim()) {
      alert("Please enter an invoice ID");
      console.error("❌ Invoice ID is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount (greater than 0)");
      console.error("❌ Invalid amount");
      setIsSubmitting(false);
      return;
    }
    
    if (!dueDate) {
      alert("Please select a due date");
      console.error("❌ Due date is required");
      setIsSubmitting(false);
      return;
    }
    
    // Get discount and escrow percentages from form
    const discountPercent = Number(formData.get("discount") || "5");
    const escrowPercent = Number(formData.get("escrow") || "10");
    
    // Validate discount and escrow percentages
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 20) {
      alert("Discount rate must be between 0% and 20%");
      console.error("❌ Invalid discount rate:", discountPercent);
      setIsSubmitting(false);
      return;
    }
    
    if (isNaN(escrowPercent) || escrowPercent < 0 || escrowPercent > 50) {
      alert("Escrow requirement must be between 0% and 50%");
      console.error("❌ Invalid escrow percentage:", escrowPercent);
      setIsSubmitting(false);
      return;
    }
    
    // Convert percentages to basis points (1% = 100 BPS, 100% = 10000 BPS)
    const discountBps = Math.round(discountPercent * 100);
    const escrowBps = Math.round(escrowPercent * 100);
    
    console.log("💹 Rate conversions:");
    console.log("  - Discount:", discountPercent, "% =", discountBps, "BPS");
    console.log("  - Escrow:", escrowPercent, "% =", escrowBps, "BPS");
    
    const invoiceData = {
      invoiceNumber: invoiceNumber.trim(),
      buyerAddress: buyerAddress.trim(),
      amount: Number(amount),
      dueDate: new Date(dueDate),
      companiesInfo: JSON.stringify({
        invoiceNumber: invoiceNumber.trim(),
        description: (formData.get("description") as string || "").trim(),
      }),
      discountBps: discountBps,
      feeBps: 100, // 1% platform fee (hardcoded for now)
      escrowBps: escrowBps,
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
              <Label htmlFor="buyer">Buyer Address</Label>
              <Input
                id="buyer"
                name="buyer"
                placeholder="0x... (Sui address)"
                required
                pattern="^0x[a-fA-F0-9]{64}$"
                title="Enter a valid Sui address (0x followed by 64 hex characters)"
              />
              <p className="text-xs text-muted-foreground">
                Enter the Sui address of the buyer who will repay the invoice
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Invoice Amount (SUI)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.0001"
                placeholder="100"
                required
              />
              <p className="text-xs text-muted-foreground">
                Amount in SUI (not USD)
              </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount Rate (%)</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                placeholder="5"
                step="0.1"
                min="0"
                max="20"
                defaultValue="5"
                required
              />
              <p className="text-xs text-muted-foreground">
                Discount offered to investors (e.g., 5% = investor pays 95% of face value)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="escrow">Escrow Requirement (%)</Label>
              <Input
                id="escrow"
                name="escrow"
                type="number"
                placeholder="10"
                step="1"
                min="0"
                max="50"
                defaultValue="10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Buyer must deposit this % as collateral (e.g., 10% of invoice amount)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Services rendered for..."
            />
          </div>

          {!hasSupplierCap && isConnected && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                ⚠️ You need to register as a supplier/seller before creating invoices.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  console.log("🚀 Starting supplier registration...");
                  const result = await registerSupplier();
                  console.log("📥 Registration result:", result);
                  if (result?.success) {
                    console.log("✅ Registration successful, setting hasSupplierCap to true");
                    setHasSupplierCap(true);

                    // Also trigger a re-check
                    const capId = await getSupplierCapId();
                    if (capId) {
                      setHasSupplierCap(true);
                    }
                  } else {
                    console.warn("⚠️ Registration result:", result);
                  }
                }}
                disabled={isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register as Supplier
                  </>
                )}
              </Button>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isConnected || !hasSupplierCap || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Invoice...
              </>
            ) : !isConnected ? (
              "Connect Wallet First"
            ) : !hasSupplierCap ? (
              "Register as Supplier First"
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

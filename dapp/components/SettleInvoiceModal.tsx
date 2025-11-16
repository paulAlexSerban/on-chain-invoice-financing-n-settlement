"use client";

import { useState, useEffect } from "react";
import { useSettleInvoice } from "@/hooks/useSettleInvoice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { SuiClient } from "@mysten/sui.js/client";
import { getRpcUrl } from "@/lib/contract/constants";

export interface SettleInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    dueDate?: string;
    discountBps?: number;
    buyer: string;
    financedBy?: string;
  };
  onSuccess?: () => void;
}

export function SettleInvoiceModal({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: SettleInvoiceModalProps) {
  const { settleInvoice, isSettling, error: hookError } = useSettleInvoice();
  const [suiClient] = useState(() => new SuiClient({ url: getRpcUrl() }));
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;

  // Sync error from hook
  useEffect(() => {
    setError(hookError);
  }, [hookError]);

  const handleSettle = async () => {
    if (!packageId) {
      setError("Contract ID not configured");
      return;
    }

    setIsQuerying(true);
    setError(null);

    try {
      // Query for BuyerEscrow object
      // BuyerEscrow is a SHARED object, so we can't use getOwnedObjects
      // Instead, check localStorage first (stored when invoice was created)
      console.log("🔍 Finding BuyerEscrow object for invoice...");
      
      let escrowId: string | null = null;
      
      // First, try to get from localStorage
      const storedEscrowIds = localStorage.getItem('escrow_ids')
        ? JSON.parse(localStorage.getItem('escrow_ids') || '{}')
        : {};

      if (storedEscrowIds[invoice.id]) {
        escrowId = storedEscrowIds[invoice.id];
        console.log("✅ Found escrow ID in localStorage:", escrowId);
      } else {
        console.log("⚠️ Escrow ID not in localStorage, querying blockchain...");
        
        // Query the invoice object to get its transaction digest
        try {
          const invoiceObj = await suiClient.getObject({
            id: invoice.id,
            options: {
              showPreviousTransaction: true,
            },
          });

          if (invoiceObj.data?.previousTransaction) {
            const txDigest = invoiceObj.data.previousTransaction;
            console.log("📜 Invoice transaction digest:", txDigest);

            // Get the transaction details to find all created objects
            const txDetails = await suiClient.getTransactionBlock({
              digest: txDigest,
              options: {
                showObjectChanges: true,
              },
            });

            console.log("📦 Transaction object changes:", txDetails.objectChanges);

            // Find the BuyerEscrow object in the created objects
            const escrowObject = txDetails.objectChanges?.find(
              (change: any) =>
                change.type === "created" &&
                change.objectType?.includes("BuyerEscrow")
            );

            if (escrowObject && "objectId" in escrowObject) {
              escrowId = (escrowObject as any).objectId;
              console.log("✅ Found escrow object from transaction:", escrowId);
              
              // Store it for next time
              storedEscrowIds[invoice.id] = escrowId;
              localStorage.setItem('escrow_ids', JSON.stringify(storedEscrowIds));
            }
          }
        } catch (queryError) {
          console.error("Error querying invoice/transaction:", queryError);
        }
      }

      if (!escrowId) {
        setError("Buyer escrow not found for this invoice. The escrow may not have been created yet.");
        setIsQuerying(false);
        return;
      }

      // Query for Funding object
      // Funding is also a SHARED object, need to check localStorage or query transaction
      console.log("🔍 Finding Funding object for invoice...");
      
      let fundingId: string | null = null;
      
      // Get all tracked funding IDs
      const storedFundingIds: string[] = localStorage.getItem('funding_ids')
        ? JSON.parse(localStorage.getItem('funding_ids') || '[]')
        : [];

      console.log(`📦 Checking ${storedFundingIds.length} tracked Funding objects...`);

      // Fetch each Funding object and check if it matches this invoice
      for (const fId of storedFundingIds) {
        try {
          const fundingObj = await suiClient.getObject({
            id: fId,
            options: {
              showContent: true,
            },
          });

          if (fundingObj.data?.content && 'fields' in fundingObj.data.content) {
            const fields = fundingObj.data.content.fields as any;
            if (fields.invoice_id === invoice.id) {
              fundingId = fId;
              console.log("✅ Found Funding object:", fundingId);
              break;
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch Funding ${fId}:`, err);
        }
      }

      if (!fundingId) {
        setError("Funding object not found. The invoice may not have been financed yet, or the Funding object wasn't tracked. Try financing the invoice again.");
        setIsQuerying(false);
        return;
      }

      setIsQuerying(false);

      // Calculate total payment: invoice amount + discount returned to buyer
      const discountRate = (invoice.discountBps || 0) / 10000;
      const discountAmount = invoice.amount * discountRate;
      const totalPayment = invoice.amount + discountAmount;

      console.log("💵 Settlement calculation:");
      console.log(`  - Invoice Amount: ${invoice.amount} SUI`);
      console.log(`  - Discount BPS: ${invoice.discountBps || 0}`);
      console.log(`  - Discount Amount: ${discountAmount.toFixed(4)} SUI`);
      console.log(`  - Total Payment: ${totalPayment.toFixed(4)} SUI`);

      const result = await settleInvoice({
        invoiceId: invoice.id,
        escrowId,
        fundingId,
        totalPayment,
      });

      if (result.success) {
        setSuccess(true);
        
        // Wait a moment to show success message
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
          setSuccess(false);
        }, 2000);
      }
    } catch (err: any) {
      console.error("❌ Error querying objects:", err);
      setError(err.message || "Failed to query blockchain objects");
      setIsQuerying(false);
    }
  };

  const handleClose = () => {
    if (!isSettling) {
      setError(null);
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settle Invoice</DialogTitle>
          <DialogDescription>
            Confirm payment to complete this invoice and mark it as repaid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Details */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invoice</span>
              <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Due</span>
              <span className="text-lg font-bold">{invoice.amount.toFixed(2)} SUI</span>
            </div>

            {invoice.dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="font-medium">{invoice.dueDate}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge>Financed</Badge>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will transfer <strong>{invoice.amount.toFixed(2)} SUI</strong> to settle the
              invoice. The investor will receive payment minus platform fees.
            </AlertDescription>
          </Alert>

          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Invoice settled successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Breakdown */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
            <h4 className="font-medium text-sm mb-2">Payment Breakdown</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Face Value</span>
              <span>{invoice.amount.toFixed(2)} SUI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fees</span>
              <span className="text-muted-foreground">~0.2 SUI (estimated)</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-medium">
              <span>Investor Receives</span>
              <span>~{(invoice.amount - 0.2).toFixed(2)} SUI</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSettling}>
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={isSettling || success}>
            {isSettling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Settling...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Settled
              </>
            ) : (
              `Settle ${invoice.amount.toFixed(2)} SUI`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

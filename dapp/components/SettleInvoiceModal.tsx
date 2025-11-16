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

export interface SettleInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    dueDate?: string;
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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync error from hook
  useEffect(() => {
    setError(hookError);
  }, [hookError]);

  const handleSettle = async () => {
    const result = await settleInvoice({
      invoiceId: invoice.id,
      amount: invoice.amount,
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

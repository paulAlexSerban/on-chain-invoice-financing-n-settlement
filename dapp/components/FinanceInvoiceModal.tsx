"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnChainInvoice } from "@/types/invoice";
import { useInvoiceContract, FinanceCalculation } from "@/hooks/useInvoiceContract";
import { Loader2, TrendingUp, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface FinanceInvoiceModalProps {
  invoice: OnChainInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FinanceInvoiceModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: FinanceInvoiceModalProps) {
  const { financeInvoice, calculateFinancing, isLoading } = useInvoiceContract();
  const [calculation, setCalculation] = useState<FinanceCalculation | null>(null);

  if (!invoice) return null;

  // Get discount rate from invoice object (discount_bps / 100 = percentage)
  // Example: 320 BPS = 3.2%
  const discountRate = (invoice.discountBps || 0) / 100;

  // Calculate days until due
  const daysUntilDue = Math.ceil((invoice.dueDate - Date.now()) / (1000 * 60 * 60 * 24));

  // Initialize calculation when modal opens or invoice changes
  if (!calculation && invoice) {
    const calc = calculateFinancing(invoice.amountInSui, discountRate, daysUntilDue);
    setCalculation(calc);
  }

  const handleFinance = async () => {
    if (discountRate <= 0) {
      return;
    }

    const result = await financeInvoice({
      invoiceId: invoice.id,
      invoiceAmount: invoice.amountInSui,
      discountRate: discountRate,
    });

    if (result?.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finance Invoice</DialogTitle>
          <DialogDescription>
            Review the financing terms and fees before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Details */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-semibold text-sm">Invoice Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Invoice Number:</div>
              <div className="font-medium">{invoice.invoiceNumber}</div>

              <div className="text-muted-foreground">Buyer:</div>
              <div className="font-medium">{invoice.buyer}</div>

              <div className="text-muted-foreground">Face Value:</div>
              <div className="font-medium">{invoice.amountInSui.toLocaleString()} SUI</div>

              <div className="text-muted-foreground">Days Until Due:</div>
              <div className="font-medium">{daysUntilDue} days</div>
            </div>
          </div>

          {/* Discount Rate Display (Set by Invoice) */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Discount Rate</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-set by the supplier when creating the invoice
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{discountRate.toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground">{invoice.discountBps} BPS</div>
              </div>
            </div>
          </div>

          {calculation && (
            <>
              {/* Fee Breakdown */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Fee Breakdown
                </h4>

                <div className="space-y-2 text-sm">
                  {/* Invoice Amount */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Face Value:</span>
                    <span className="font-medium">{calculation.invoiceAmount.toLocaleString()} SUI</span>
                  </div>

                  <Separator />

                  {/* What You Pay */}
                  <div className="flex justify-between font-semibold text-base">
                    <span>You Pay (Investment):</span>
                    <span className="text-blue-600">{calculation.investorPays.toLocaleString()} SUI</span>
                  </div>

                  <Separator />

                  {/* Deductions from Face Value */}
                  <div className="pl-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        - Your Discount ({calculation.discountRate.toFixed(2)}%):
                      </span>
                      <span className="text-red-600">-{calculation.discountAmount.toFixed(4)} SUI</span>
                    </div>
                  </div>

                  <Separator />

                  {/* What Supplier Gets */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier Receives (Today):</span>
                    <span className="font-medium text-green-600">
                      {calculation.supplierReceives.toFixed(4)} SUI
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Projection */}
              <div className="rounded-lg border p-4 space-y-3 bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Expected Returns (At Settlement)
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buyer Pays (Face Value):</span>
                    <span className="font-medium">{calculation.invoiceAmount.toLocaleString()} SUI</span>
                  </div>

                  <div className="pl-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        - Platform Take-Rate ({calculation.takeRatePercent}% of discount):
                      </span>
                      <span className="text-red-600">-{calculation.expectedTakeRateFee.toFixed(4)} SUI</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">- Settlement Fee:</span>
                      <span className="text-red-600">-{calculation.settlementFee.toFixed(4)} SUI</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>You Receive:</span>
                    <span className="text-green-600">
                      {calculation.expectedInvestorReceives.toFixed(4)} SUI
                    </span>
                  </div>

                  <Separator className="my-2" />

                  {/* Net Profit */}
                  <div className="flex justify-between font-bold text-base">
                    <span>Your Net Profit:</span>
                    <span className="text-green-600">
                      {calculation.expectedNetProfit.toFixed(4)} SUI
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Effective APY:</span>
                    <span className={calculation.expectedAPY > 0 ? "text-green-600 font-semibold" : ""}>
                      {calculation.expectedAPY.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {calculation.expectedAPY < 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: This discount rate results in a negative return due to platform fees.
                    Consider increasing the discount rate.
                  </AlertDescription>
                </Alert>
              )}

              {calculation.discountRate < 1 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Low discount rate: Your return may not justify the risk. Typical rates are 2-5%.
                  </AlertDescription>
                </Alert>
              )}

              {calculation.discountRate > 10 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    High discount rate: This may be unattractive to suppliers. Consider market rates.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleFinance}
            disabled={
              isLoading ||
              !calculation ||
              calculation.expectedAPY < 0 ||
              discountRate <= 0
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Finance for ${calculation?.investorPays.toLocaleString() || 0} SUI`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

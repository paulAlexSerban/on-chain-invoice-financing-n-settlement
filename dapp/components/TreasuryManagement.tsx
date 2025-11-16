"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTreasury } from "@/hooks/useTreasury";
import { useTreasuryWithdraw } from "@/hooks/useTreasuryWithdraw";
import { Loader2, Wallet, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { getTransactionUrl } from "@/lib/contract/constants";

export default function TreasuryManagement() {
  const { treasuryData, isLoading, error, refetch, isOwner, balanceInSui } = useTreasury();
  const { withdrawFromTreasury, isWithdrawing, error: withdrawError } = useTreasuryWithdraw();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [successDigest, setSuccessDigest] = useState<string | null>(null);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (amount > balanceInSui) {
      return;
    }

    setSuccessDigest(null);
    const result = await withdrawFromTreasury(amount);
    
    if (result.success) {
      setSuccessDigest(result.digest || null);
      setWithdrawAmount("");
      // Refetch treasury data after a short delay
      setTimeout(() => refetch(), 2000);
    }
  };

  const handleMaxWithdraw = () => {
    setWithdrawAmount(balanceInSui.toString());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading treasury data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Error Loading Treasury</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card className="border-yellow-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium">Access Denied</p>
              <p className="text-sm text-muted-foreground">
                Only the treasury owner can access this page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!treasuryData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Treasury data not available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Treasury Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Treasury Balance</CardTitle>
              <CardDescription>
                Platform protocol fees and reserves
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold">
                  {balanceInSui.toFixed(4)} SUI
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(treasuryData.balance).toLocaleString()} MIST
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Fee Rate</p>
                <p className="text-lg font-semibold">
                  {(treasuryData.fee_bps / 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="text-xs font-mono truncate">
                  {treasuryData.owner}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Card */}
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Funds</CardTitle>
          <CardDescription>
            Withdraw funds from the treasury to your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {successDigest && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Withdrawal successful!
                    </p>
                    <a
                      href={getTransactionUrl(successDigest)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View transaction on explorer →
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {withdrawError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{withdrawError.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Amount (SUI)</Label>
              <div className="flex gap-2">
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={isWithdrawing}
                  step="0.01"
                  min="0"
                  max={balanceInSui}
                />
                <Button
                  variant="outline"
                  onClick={handleMaxWithdraw}
                  disabled={isWithdrawing || balanceInSui === 0}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Available: {balanceInSui.toFixed(4)} SUI
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleWithdraw}
              disabled={
                isWithdrawing ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) <= 0 ||
                parseFloat(withdrawAmount) > balanceInSui
              }
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Funds will be transferred directly to your connected wallet address.
                This transaction requires gas fees.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

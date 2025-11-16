"use client";

import { useWalletKit } from "@mysten/wallet-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export function DebugPanel() {
  const { currentAccount, isConnected } = useWalletKit();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [suiBalance, setSuiBalance] = useState<string | null>(null);

  const packageId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  useEffect(() => {
    // Reset balance when wallet changes
    setSuiBalance(null);
  }, [currentAccount?.address]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const openExplorer = (type: "address" | "package", value: string) => {
    const baseUrl = network === "mainnet" 
      ? "https://suivision.xyz"
      : "https://testnet.suivision.xyz";
    
    const url = type === "address" 
      ? `${baseUrl}/account/${value}`
      : `${baseUrl}/package/${value}`;
    
    window.open(url, '_blank');
  };

  // Check if all systems are ready
  const isReady = isConnected && packageId;
  const hasIssues = !isConnected || !packageId;

  return (
    <Card className={`border-2 ${hasIssues ? "border-yellow-500/50 bg-yellow-500/5" : "border-green-500/50 bg-green-500/5"}`}>
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isReady ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <CardTitle className="text-base">
                {isReady ? "✅ System Ready" : "⚠️ Configuration Required"}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                Wallet: {isConnected ? "✓" : "✗"}
              </Badge>
              <Badge variant={packageId ? "default" : "destructive"} className="text-xs">
                Contract: {packageId ? "✓" : "✗"}
              </Badge>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 text-sm">
          {/* Wallet Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-base">Wallet Status</p>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            {isConnected && currentAccount ? (
              <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      {currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(currentAccount.address, "address")}
                    >
                      {copied === "address" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openExplorer("address", currentAccount.address)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <Badge variant="outline" className="text-xs">
                    {network}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 rounded-md text-destructive text-sm">
                ⚠️ Please connect your wallet to continue
              </div>
            )}
          </div>

          {/* Contract Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-base">Contract Status</p>
              <Badge variant={packageId ? "default" : "destructive"}>
                {packageId ? "Deployed" : "Not Configured"}
              </Badge>
            </div>
            
            {packageId ? (
              <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground whitespace-nowrap">Package ID:</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <code className="text-xs bg-background px-2 py-1 rounded break-all flex-1">
                      {packageId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => copyToClipboard(packageId, "package")}
                    >
                      {copied === "package" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => openExplorer("package", packageId)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Module:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    invoice_financing
                  </code>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 rounded-md text-destructive text-sm space-y-2">
                <p>⚠️ Package ID not configured</p>
                <p className="text-xs">
                  Run: <code className="bg-background px-1 py-0.5 rounded">make publish_contract</code>
                </p>
              </div>
            )}
          </div>

          {/* System Checklist */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-md">
            <p className="font-semibold text-sm mb-2">Pre-flight Checklist</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Wallet Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {packageId ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Contract Deployed</span>
              </div>
              <div className="flex items-center gap-2">
                {network === "testnet" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span>Network: {network}</span>
              </div>
            </div>
          </div>

          {/* Debug Tips */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-medium">💡 Debug Tips:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Open DevTools (F12) → Console for detailed logs</li>
              <li>All transactions are logged with step-by-step details</li>
              <li>Click <ExternalLink className="h-3 w-3 inline" /> to view on explorer</li>
              <li>Need testnet SUI? Visit Discord #testnet-faucet</li>
            </ul>
          </div>

          {/* Action Buttons */}
          {hasIssues && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium mb-2">Quick Actions:</p>
              <div className="flex gap-2">
                {!isConnected && (
                  <Badge variant="outline" className="text-xs">
                    → Click "Connect Wallet" above
                  </Badge>
                )}
                {!packageId && (
                  <Badge variant="outline" className="text-xs">
                    → Deploy contract first
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}


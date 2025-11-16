"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Clock, TrendingDown, ExternalLink, Shield, CheckCircle } from "lucide-react";
import { OnChainInvoice, getStatusLabel, getStatusColor, formatDate, getDaysUntilDue } from "@/types/invoice";
import SUILogo from "./ui/sui-logo";

interface BlockchainInvoiceCardProps {
  invoice: OnChainInvoice;
  onFinance?: (invoice: OnChainInvoice) => void;
  onViewDetails?: (invoice: OnChainInvoice) => void;
}

export function BlockchainInvoiceCard({ invoice, onFinance, onViewDetails }: BlockchainInvoiceCardProps) {
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const isOverdue = daysUntilDue < 0;
  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
  
  const explorerUrl = network === "mainnet"
    ? `https://suivision.xyz/object/${invoice.id}`
    : `https://testnet.suivision.xyz/object/${invoice.id}`;

  // Calculate potential return (example: 5% discount)
  const discountRate = 0.05;
  const potentialReturn = invoice.amountInSui * discountRate;

  // Risk Indicator Logic (F8 from PRD)
  const getRiskLevel = () => {
    if (isOverdue) return { level: 'high', color: 'bg-red-500', label: 'High Risk' };
    if (daysUntilDue <= 7) return { level: 'medium', color: 'bg-yellow-500', label: 'Medium Risk' };
    if (daysUntilDue <= 30 && invoice.amountInSui > 10000) return { level: 'medium', color: 'bg-yellow-500', label: 'Medium Risk' };
    return { level: 'low', color: 'bg-green-500', label: 'Low Risk' };
  };

  const risk = getRiskLevel();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate">
                {invoice.invoiceNumber}
              </h3>
              {/* Trust Badges - On-chain verification */}
              <div className="flex items-center gap-1" title="Verified on-chain and issuance confirmed">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{invoice.buyer}</span>
            </div>
          </div>
          <Badge 
            variant="outline"
            className={`${getStatusColor(invoice.status)} text-white border-none`}
          >
            {getStatusLabel(invoice.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Amount */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
          <div className="flex items-center gap-2">
            <SUILogo className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Invoice Amount</span>
          </div>
          <span className="font-bold text-lg">
            {invoice.amountInSui.toLocaleString()} SUI
          </span>
        </div>

        {/* Due Date */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due Date</span>
          </div>
          <span className={`font-medium ${isOverdue ? 'text-red-500' : ''}`}>
            {formatDate(invoice.dueDate)}
            {!isOverdue && daysUntilDue <= 30 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({daysUntilDue}d)
              </span>
            )}
          </span>
        </div>

        {/* Created Date */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Created</span>
          </div>
          <span className="font-medium">
            {formatDate(invoice.createdAt)}
          </span>
        </div>

        {/* Potential Return */}
        {invoice.status === 0 && (
          <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-md">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Est. Return</span>
            </div>
            <span className="font-bold text-green-700 dark:text-green-400">
              ~{potentialReturn.toFixed(2)} SUI
            </span>
          </div>
        )}

        {/* Risk Indicator (F8 from PRD) */}
        {invoice.status === 0 && (
          <div className="flex items-center justify-between p-2 rounded-md border">
            <span className="text-xs text-muted-foreground">Risk Level</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${risk.color}`} />
              <span className="text-xs font-medium">{risk.label}</span>
            </div>
          </div>
        )}

        {/* Funded Info */}
        {invoice.status === 1 && invoice.financedAmountInSui && invoice.financedAmountInSui > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Funded Amount</span>
            <span className="font-medium">
              {invoice.financedAmountInSui.toLocaleString()} SUI
            </span>
          </div>
        )}

        {/* Description */}
        {invoice.description && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {invoice.description}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {invoice.status === 0 && onFinance && (
          <Button 
            onClick={() => onFinance(invoice)}
            className="flex-1"
          >
            Finance Invoice
          </Button>
        )}
        
        {onViewDetails && (
          <Button 
            variant={invoice.status === 0 ? "outline" : "default"}
            onClick={() => onViewDetails(invoice)}
            className={invoice.status === 0 ? "" : "flex-1"}
          >
            View Details
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open(explorerUrl, '_blank')}
          title="View on Explorer"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}


import InvestmentCard, { Investment } from "@/components/InvestmentCard";

interface InvestmentListProps {
  investments: Investment[];
  emptyMessage?: string;
  onInvestmentClick?: (investment: Investment) => void;
  onSettle?: (investment: Investment) => void;
  showSettleButton?: boolean;
}

const InvestmentList = ({
  investments,
  emptyMessage = "No investments found",
  onInvestmentClick,
  onSettle,
  showSettleButton = false,
}: InvestmentListProps) => {
  if (investments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {investments.map((investment) => (
        <InvestmentCard
          key={investment.id}
          investment={investment}
          onClick={onInvestmentClick}
          onSettle={onSettle}
          showSettleButton={showSettleButton}
        />
      ))}
    </div>
  );
};

export default InvestmentList;

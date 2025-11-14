import InvestmentCard, { Investment } from "@/components/InvestmentCard";

interface InvestmentListProps {
  investments: Investment[];
  emptyMessage?: string;
  onInvestmentClick?: (investment: Investment) => void;
}

const InvestmentList = ({
  investments,
  emptyMessage = "No investments found",
  onInvestmentClick,
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
        />
      ))}
    </div>
  );
};

export default InvestmentList;

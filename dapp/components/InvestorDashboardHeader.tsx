interface InvestorDashboardHeaderProps {
  title?: string;
  description?: string;
}

const InvestorDashboardHeader = ({
  title = "Financer/Investor Dashboard",
  description = "Track your portfolio and investment performance",
}: InvestorDashboardHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default InvestorDashboardHeader;

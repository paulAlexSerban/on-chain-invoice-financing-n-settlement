interface MarketplaceHeaderProps {
  title?: string;
  description?: string;
}

const MarketplaceHeader = ({
  title = "Invoice Marketplace",
  description = "Discover and invest in verified invoice tokens from businesses worldwide",
}: MarketplaceHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default MarketplaceHeader;

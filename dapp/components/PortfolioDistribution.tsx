import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface DistributionItem {
  sector: string;
  percentage: number;
}

interface PortfolioDistributionProps {
  distribution?: DistributionItem[];
  title?: string;
  description?: string;
}

const defaultDistribution: DistributionItem[] = [
  { sector: "Technology", percentage: 35 },
  { sector: "Healthcare", percentage: 28 },
  { sector: "Manufacturing", percentage: 22 },
  { sector: "Retail", percentage: 15 },
];

const PortfolioDistribution = ({
  distribution = defaultDistribution,
  title = "Portfolio Distribution",
  description = "By industry sector",
}: PortfolioDistributionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {distribution.map((item) => (
            <div key={item.sector}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{item.sector}</span>
                <span className="text-sm font-semibold">{item.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioDistribution;

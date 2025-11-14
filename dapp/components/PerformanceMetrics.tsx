import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface MetricItem {
  label: string;
  value: string;
  isAccent?: boolean;
}

interface PerformanceMetricsProps {
  metrics?: MetricItem[];
  title?: string;
  description?: string;
}

const defaultMetrics: MetricItem[] = [
  { label: "Average Return Rate", value: "5.07%", isAccent: true },
  { label: "Total Investments", value: "12" },
  { label: "Avg. Investment Size", value: "$23,333" },
  { label: "Settlement Rate", value: "100%", isAccent: true },
];

const PerformanceMetrics = ({
  metrics = defaultMetrics,
  title = "Performance Metrics",
  description = "Last 6 months",
}: PerformanceMetricsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-3 bg-muted rounded-lg"
          >
            <span className="text-sm">{metric.label}</span>
            <span className={`font-semibold ${metric.isAccent ? "text-accent" : ""}`}>
              {metric.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;

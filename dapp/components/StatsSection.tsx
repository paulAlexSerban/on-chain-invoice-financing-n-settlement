export interface StatItem {
  value: string;
  label: string;
}

interface StatsSectionProps {
  stats?: StatItem[];
}

const defaultStats: StatItem[] = [
  { value: "$50M+", label: "Total Financed" },
  { value: "2,500+", label: "Active Businesses" },
  { value: "24h", label: "Average Settlement" },
  { value: "99.8%", label: "Success Rate" },
];

const StatsSection = ({ stats = defaultStats }: StatsSectionProps) => {
  return (
    <section className="py-12 px-4 border-y border-border">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type StatsOverviewProps = {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | React.ComponentType<any>;
  value: string | number;
  description: string;
  highlight?: boolean;
};

const StatsOverview = ({ cards }: { cards: StatsOverviewProps[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {cards.map(
        ({ title, icon: Icon, value, description, highlight }, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {title}
              </CardDescription>
              <CardTitle
                className={`text-3xl ${highlight ? "text-primary" : ""}`}
              >
                {value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};

export default StatsOverview;

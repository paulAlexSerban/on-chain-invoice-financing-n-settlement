import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import {
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Users,
  Lock,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  colorClass?: string;
}

interface FeaturesSectionProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
}

const defaultFeatures: Feature[] = [
  {
    icon: Zap,
    title: "Instant Settlement",
    description:
      "Get cash immediately instead of waiting 30-90 days for invoice payment",
    colorClass: "text-primary",
  },
  {
    icon: Shield,
    title: "Trustless Transparency",
    description:
      "Every transaction is verifiable on-chain, preventing fraud and double financing",
    colorClass: "text-primary",
  },
  {
    icon: Globe,
    title: "Global Access",
    description:
      "Connect with investors worldwide without traditional banking barriers",
    colorClass: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "Better Rates",
    description:
      "Lower fees through disintermediation and automated smart contracts",
    colorClass: "text-accent",
  },
  {
    icon: Users,
    title: "Community-Driven",
    description:
      "Decentralized liquidity pools ensure competitive financing options",
    colorClass: "text-accent",
  },
  {
    icon: Lock,
    title: "Secure & Immutable",
    description:
      "Built on Sui blockchain with Move language for maximum security",
    colorClass: "text-accent",
  },
];

const FeaturesSection = ({
  title = "Why Choose ChainInvoice?",
  subtitle = "Blockchain technology eliminates traditional barriers in invoice financing",
  features = defaultFeatures,
}: FeaturesSectionProps) => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <Icon className={`h-12 w-12 ${feature.colorClass || "text-primary"} mb-4`} />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

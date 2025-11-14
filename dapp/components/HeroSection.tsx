import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  badge?: string;
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
}

const HeroSection = ({
  badge = "Powered by Sui Blockchain",
  title = "Instant Liquidity for Your Invoices",
  description = "Transform unpaid invoices into immediate cash flow with blockchain-powered invoice financing. Transparent, fast, and global.",
  primaryButtonText = "Get Started",
  primaryButtonLink = "/dashboard/business",
  secondaryButtonText = "Learn More",
  secondaryButtonLink = "/how-it-works",
}: HeroSectionProps) => {
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="container mx-auto text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Zap className="h-4 w-4" />
          {badge}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-info to-accent bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={primaryButtonLink}>
            <Button size="lg" className="gap-2">
              {primaryButtonText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={secondaryButtonLink}>
            <Button size="lg" variant="outline">
              {secondaryButtonText}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

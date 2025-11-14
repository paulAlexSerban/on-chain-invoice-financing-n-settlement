import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface Step {
  number: number;
  title: string;
  description: string;
}

interface HowItWorksSectionProps {
  title?: string;
  subtitle?: string;
  steps?: Step[];
  ctaButtonText?: string;
  ctaButtonLink?: string;
}

const defaultSteps: Step[] = [
  {
    number: 1,
    title: "Tokenize Invoice",
    description:
      "Convert your invoice into a digital asset (NFT) on the blockchain",
  },
  {
    number: 2,
    title: "Get Financed",
    description:
      "Investors purchase your invoice token at a discount for immediate cash",
  },
  {
    number: 3,
    title: "Auto Settlement",
    description:
      "Smart contract automatically distributes payment when invoice is paid",
  },
];

const HowItWorksSection = ({
  title = "How It Works",
  subtitle = "Simple, transparent, and automated invoice financing in 3 steps",
  steps = defaultSteps,
  ctaButtonText = "Learn More About The Process",
  ctaButtonLink = "/how-it-works",
}: HowItWorksSectionProps) => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        {ctaButtonText && (
          <div className="text-center mt-12">
            <Link href={ctaButtonLink}>
              <Button size="lg" variant="outline">
                {ctaButtonText}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowItWorksSection;

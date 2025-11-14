import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
}

const CTASection = ({
  title = "Ready to Unlock Your Cash Flow?",
  description = "Join thousands of businesses and investors already using blockchain-powered invoice financing",
  primaryButtonText = "Start as Business",
  primaryButtonLink = "/dashboard/business",
  secondaryButtonText = "Start as Investor",
  secondaryButtonLink = "/dashboard/investor",
}: CTASectionProps) => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <Card className="bg-gradient-to-r from-primary to-info text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={primaryButtonLink}>
                <Button size="lg" variant="secondary">
                  {primaryButtonText}
                </Button>
              </Link>
              <Link href={secondaryButtonLink}>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white/10"
                >
                  {secondaryButtonText}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;

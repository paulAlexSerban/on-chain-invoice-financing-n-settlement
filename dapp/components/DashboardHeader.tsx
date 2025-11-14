import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const DashboardHeader = ({
  title,
  description,
  buttonText = "New Invoice",
  onButtonClick,
}: DashboardHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {buttonText && (
        <Button className="gap-2" onClick={onButtonClick}>
          <Plus className="h-4 w-4" />
          {buttonText}
        </Button>
      )}
    </div>
  );
};

export default DashboardHeader;

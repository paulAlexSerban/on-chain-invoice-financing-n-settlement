import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface FilterValues {
  search: string;
  industry: string;
  rating: string;
  sortBy: string;
}

interface MarketplaceFiltersProps {
  onFilterChange?: (filters: Partial<FilterValues>) => void;
  defaultValues?: Partial<FilterValues>;
}

const MarketplaceFilters = ({
  onFilterChange,
  defaultValues = {},
}: MarketplaceFiltersProps) => {
  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9"
              defaultValue={defaultValues.search}
              onChange={(e) =>
                onFilterChange?.({ search: e.target.value })
              }
            />
          </div>
          <Select
            defaultValue={defaultValues.industry || "all"}
            onValueChange={(value) =>
              onFilterChange?.({ industry: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="tech">Technology</SelectItem>
              <SelectItem value="mfg">Manufacturing</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
            </SelectContent>
          </Select>
          <Select
            defaultValue={defaultValues.rating || "all"}
            onValueChange={(value) => onFilterChange?.({ rating: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Credit Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="aaa">AAA</SelectItem>
              <SelectItem value="aa">AA</SelectItem>
              <SelectItem value="a">A</SelectItem>
            </SelectContent>
          </Select>
          <Select
            defaultValue={defaultValues.sortBy || "discount"}
            onValueChange={(value) => onFilterChange?.({ sortBy: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Highest Discount</SelectItem>
              <SelectItem value="amount">Highest Amount</SelectItem>
              <SelectItem value="date">Due Date</SelectItem>
              <SelectItem value="rating">Best Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceFilters;

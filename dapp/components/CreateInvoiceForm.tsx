import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateInvoiceFormProps {
  onSubmit?: (data: InvoiceFormData) => void;
}

export interface InvoiceFormData {
  clientName: string;
  amount: number;
  invoiceId: string;
  dueDate: string;
  discount: number;
  description?: string;
}

const CreateInvoiceForm = ({ onSubmit }: CreateInvoiceFormProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: InvoiceFormData = {
      clientName: formData.get("client") as string,
      amount: Number(formData.get("amount")),
      invoiceId: formData.get("invoiceId") as string,
      dueDate: formData.get("dueDate") as string,
      discount: Number(formData.get("discount")),
      description: formData.get("description") as string,
    };

    onSubmit?.(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Invoice</CardTitle>
        <CardDescription>
          Tokenize your invoice for instant financing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                name="client"
                placeholder="e.g., TechStart Inc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Invoice Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="50000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceId">Invoice ID</Label>
              <Input
                id="invoiceId"
                name="invoiceId"
                placeholder="INV-2024-003"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" name="dueDate" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Desired Discount (%)</Label>
            <Input
              id="discount"
              name="discount"
              type="number"
              placeholder="5"
              step="0.1"
              required
            />
            <p className="text-sm text-muted-foreground">
              Lower discount rates increase chances of faster financing
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Services rendered for..."
            />
          </div>

          <Button type="submit" className="w-full">
            Tokenize Invoice
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateInvoiceForm;

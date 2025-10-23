import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  invoice_items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("invoices")
        .select(`
          *,
          invoice_items (
            product_name,
            quantity,
            price
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">{invoice.invoice_number}</span>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-2xl font-bold text-primary">
                      Rp {invoice.total_amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {invoice.invoice_items && invoice.invoice_items.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Items:</p>
                        {invoice.invoice_items.map((item, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {item.product_name} - {item.quantity}x @ Rp {item.price.toLocaleString()}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;

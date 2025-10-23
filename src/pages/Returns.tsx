import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { returnSchema } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PackageX, Plus } from "lucide-react";

interface Return {
  id: string;
  return_number: string;
  product_name: string;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
}

const Returns = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    quantity: "",
    reason: "",
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("returns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
      toast({
        title: "Error",
        description: "Failed to load returns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate form data
      const validationResult = returnSchema.safeParse({
        product_name: formData.product_name,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      const returnNumber = `RET-${Date.now()}`;
      
      const { error } = await (supabase as any)
        .from("returns")
        .insert({
          return_number: returnNumber,
          product_name: validationResult.data.product_name,
          quantity: validationResult.data.quantity,
          reason: validationResult.data.reason,
          user_id: user.id,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Return Created",
        description: "Your return request has been submitted.",
      });

      setDialogOpen(false);
      setFormData({ product_name: "", quantity: "", reason: "" });
      fetchReturns();
    } catch (error) {
      console.error("Error creating return:", error);
      toast({
        title: "Error",
        description: "Failed to create return",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PackageX className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Returns</h1>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Return
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Return Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product_name">Product Name</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Submit Return</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading returns...</p>
        ) : returns.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No returns found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {returns.map((ret) => (
              <Card key={ret.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">{ret.return_number}</span>
                    <Badge className={getStatusColor(ret.status)}>
                      {ret.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold">{ret.product_name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {ret.quantity}</p>
                    <p className="text-sm text-muted-foreground">Reason: {ret.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </p>
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

export default Returns;

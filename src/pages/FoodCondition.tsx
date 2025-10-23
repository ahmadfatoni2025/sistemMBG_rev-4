import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { foodConditionSchema } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Apple, Plus, CheckCircle, XCircle, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FoodCondition {
  id: string;
  product_name: string;
  condition: string;
  fit_for_processing: boolean;
  inspection_date: string;
  notes: string;
}

const FoodCondition = () => {
  const [conditions, setConditions] = useState<FoodCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    condition: "",
    fit_for_processing: "true",
    notes: "",
  });

  useEffect(() => {
    checkAdminRole();
    fetchConditions();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
    }
  };

  const fetchConditions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("food_conditions")
        .select("*")
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setConditions(data || []);
    } catch (error) {
      console.error("Error fetching conditions:", error);
      toast({
        title: "Error",
        description: "Failed to load food conditions",
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
      const validationResult = foodConditionSchema.safeParse({
        product_name: formData.product_name,
        condition: formData.condition,
        fit_for_processing: formData.fit_for_processing === "true",
        notes: formData.notes,
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

      const { error } = await (supabase as any)
        .from("food_conditions")
        .insert({
          product_name: validationResult.data.product_name,
          condition: validationResult.data.condition,
          fit_for_processing: validationResult.data.fit_for_processing,
          notes: validationResult.data.notes,
          inspector_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Inspection Added",
        description: "Raw material quality inspection has been recorded.",
      });

      setDialogOpen(false);
      setFormData({ product_name: "", condition: "", fit_for_processing: "true", notes: "" });
      fetchConditions();
    } catch (error) {
      console.error("Error creating condition:", error);
      toast({
        title: "Error",
        description: "Failed to record raw material quality inspection",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Raw Material Quality Inspection Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    autoTable(doc, {
      startY: 40,
      head: [['Raw Material Name', 'Condition', 'Fit for Processing', 'Inspection Date', 'Notes']],
      body: conditions.map(c => [
        c.product_name,
        c.condition,
        c.fit_for_processing ? 'Yes' : 'No',
        format(new Date(c.inspection_date), "MMM dd, yyyy"),
        c.notes || '—'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(`raw-material-quality-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Quality inspection report has been exported successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Apple className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Raw Material Quality Inspection</h1>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Inspection
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Raw Material Quality Inspection Form</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="product_name">Raw Material Name</Label>
                    <Input
                      id="product_name"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      placeholder="e.g., Chicken breast, Tomatoes, Rice"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Material Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Fresh">Fresh</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Slightly Damaged">Slightly Damaged</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Contaminated">Contaminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fit_for_processing">Fit for Processing</Label>
                    <Select
                      value={formData.fit_for_processing}
                      onValueChange={(value) => setFormData({ ...formData, fit_for_processing: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Submit Inspection</Button>
                </form>
              </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Raw Material Quality Inspection Table</CardTitle>
            <p className="text-sm text-muted-foreground">Review raw materials for safety and processing suitability</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw Material Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Fit for Processing</TableHead>
                  <TableHead>Inspection Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading inspections...
                    </TableCell>
                  </TableRow>
                ) : conditions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No inspections found
                    </TableCell>
                  </TableRow>
                ) : (
                  conditions.map((condition) => (
                    <TableRow key={condition.id}>
                      <TableCell className="font-medium">{condition.product_name}</TableCell>
                      <TableCell>
                        <Badge variant={condition.condition === "Fresh" || condition.condition === "Excellent" ? "default" : "secondary"}>
                          {condition.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {condition.fit_for_processing ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <Badge variant="default" className="bg-green-500">Yes</Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <Badge variant="destructive">No</Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(condition.inspection_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="max-w-xs text-muted-foreground">
                        {condition.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FoodCondition;

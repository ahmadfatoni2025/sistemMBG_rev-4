import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface SupplierHistory {
  id: string;
  supplier_name: string;
  supplier_address?: string;
  supplier_phone?: string;
  supplier_email?: string;
  product_name: string;
  quantity: number;
  arrival_date: string;
  stock_status: string;
  notes: string | null;
}

const Projects = () => {
  const [history, setHistory] = useState<SupplierHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: "",
    supplier_address: "",
    supplier_phone: "",
    supplier_email: "",
    product_name: "",
    quantity: 0,
    arrival_date: new Date().toISOString().split('T')[0],
    stock_status: "received",
    notes: "",
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("supplier_history")
        .select("*")
        .order("arrival_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching supplier history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Raw Material Supply Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    autoTable(doc, {
      startY: 40,
      head: [['Arrival Date', 'Supplier', 'Material', 'Quantity', 'Status', 'Notes']],
      body: history.map(h => [
        format(new Date(h.arrival_date), "MMM dd, yyyy"),
        h.supplier_name,
        h.product_name,
        h.quantity.toString(),
        h.stock_status,
        h.notes || '—'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(`raw-material-supply-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Supply report has been exported successfully.",
    });
  };

  const handleExportExcel = () => {
    const csvContent = [
      ['Arrival Date', 'Supplier', 'Material', 'Quantity', 'Status', 'Notes'],
      ...history.map(h => [
        format(new Date(h.arrival_date), "MMM dd, yyyy"),
        h.supplier_name,
        h.product_name,
        h.quantity,
        h.stock_status,
        h.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `raw-material-supply-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Excel Exported",
      description: "Supply data has been exported to CSV.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await (supabase as any)
        .from("supplier_history")
        .insert({
          supplier_name: formData.supplier_name,
          supplier_address: formData.supplier_address,
          supplier_phone: formData.supplier_phone,
          supplier_email: formData.supplier_email,
          product_name: formData.product_name,
          quantity: formData.quantity,
          arrival_date: formData.arrival_date,
          stock_status: formData.stock_status,
          notes: formData.notes,
        });

      if (error) throw error;

      toast({
        title: "Supplier Entry Added",
        description: "Raw material supply has been recorded successfully.",
      });

      setDialogOpen(false);
      setFormData({
        supplier_name: "",
        supplier_address: "",
        supplier_phone: "",
        supplier_email: "",
        product_name: "",
        quantity: 0,
        arrival_date: new Date().toISOString().split('T')[0],
        stock_status: "received",
        notes: "",
      });
      fetchHistory();
    } catch (error) {
      console.error("Error adding supplier entry:", error);
      toast({
        title: "Error",
        description: "Failed to add supplier entry",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Raw Material Supply</h1>
            <p className="text-muted-foreground">Track supplier deliveries and incoming raw materials</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Supplier
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Supplier & Raw Material Delivery</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier_name">Supplier Name</Label>
                      <Input
                        id="supplier_name"
                        value={formData.supplier_name}
                        onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                        placeholder="Supplier name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier_phone">Phone Number</Label>
                      <Input
                        id="supplier_phone"
                        value={formData.supplier_phone}
                        onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplier_address">Address</Label>
                    <Textarea
                      id="supplier_address"
                      value={formData.supplier_address}
                      onChange={(e) => setFormData({ ...formData, supplier_address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_email">Email</Label>
                    <Input
                      id="supplier_email"
                      type="email"
                      value={formData.supplier_email}
                      onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product_name">Raw Material Name</Label>
                      <Input
                        id="product_name"
                        value={formData.product_name}
                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                        placeholder="Raw Material Name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="arrival_date">Arrival Date</Label>
                      <Input
                        id="arrival_date"
                        type="date"
                        value={formData.arrival_date}
                        onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_status">Status</Label>
                      <Input
                        id="stock_status"
                        value={formData.stock_status}
                        onChange={(e) => setFormData({ ...formData, stock_status: e.target.value })}
                        placeholder="e.g., received, pending"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Supplier Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Deliveries & Raw Material Inventory</CardTitle>
            <CardDescription>Track all supplier deliveries and material stock status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arrival Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Raw Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No supplier history yet
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(new Date(item.arrival_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="font-medium">{item.supplier_name}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.stock_status === "received" ? "default" : "secondary"}
                          className={item.stock_status === "received" ? "bg-success" : ""}
                        >
                          {item.stock_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-muted-foreground">
                        {item.notes || "—"}
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

export default Projects;

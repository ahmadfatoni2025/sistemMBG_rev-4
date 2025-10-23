import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Truck, CreditCard, Building2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  user_id: string;
  invoice_items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [accountNumber, setAccountNumber] = useState("");

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

  const handleExportPDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Invoice", 14, 20);
    doc.setFontSize(11);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 14, 30);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('id-ID')}`, 14, 37);
    doc.text(`Total: Rp ${invoice.total_amount.toLocaleString()}`, 14, 44);
    
    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      autoTable(doc, {
        startY: 50,
        head: [['Product', 'Quantity', 'Price', 'Total']],
        body: invoice.invoice_items.map(item => [
          item.product_name,
          item.quantity,
          `Rp ${item.price.toLocaleString()}`,
          `Rp ${(item.quantity * item.price).toLocaleString()}`
        ])
      });
    }
    
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
    toast({ title: "Success", description: "PDF exported successfully" });
  };

  const handleExportExcel = (invoice: Invoice) => {
    const wsData = [
      ['Invoice Number', invoice.invoice_number],
      ['Date', new Date(invoice.created_at).toLocaleDateString('id-ID')],
      ['Status', invoice.status],
      ['Total Amount', invoice.total_amount],
      [],
      ['Product Name', 'Quantity', 'Price', 'Total']
    ];
    
    if (invoice.invoice_items) {
      invoice.invoice_items.forEach(item => {
        wsData.push([
          item.product_name,
          item.quantity,
          item.price,
          item.quantity * item.price
        ]);
      });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `invoice-${invoice.invoice_number}.xlsx`);
    toast({ title: "Success", description: "Excel exported successfully" });
  };

  const handleSubmitShipment = async (invoice: Invoice) => {
    try {
      const { data: order, error } = await (supabase as any)
        .from("orders")
        .select("id")
        .eq("user_id", invoice.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (order) {
        const { error: updateError } = await (supabase as any)
          .from("orders")
          .update({ status: "processing" })
          .eq("id", order.id);

        if (updateError) throw updateError;

        toast({
          title: "Berhasil",
          description: "Pengiriman berhasil diajukan dan dipindahkan ke menu proses",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal mengajukan pengiriman",
        variant: "destructive",
      });
    }
  };

  const handlePayDirectly = async (invoice: Invoice) => {
    try {
      const { data: order, error } = await (supabase as any)
        .from("orders")
        .select("id")
        .eq("user_id", invoice.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (order) {
        const paymentNumber = `PAY-${Date.now()}`;
        const { error: paymentError } = await (supabase as any)
          .from("payments")
          .insert({
            payment_number: paymentNumber,
            order_id: order.id,
            amount: invoice.total_amount,
            status: "pending",
            payment_method: "bank_transfer",
          });

        if (paymentError) throw paymentError;

        toast({
          title: "Berhasil",
          description: "Pembayaran berhasil dibuat, silakan cek menu pembayaran",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal membuat pembayaran",
        variant: "destructive",
      });
    }
  };

  const handleSaveAccountNumber = async () => {
    if (!selectedInvoice || !accountNumber) {
      toast({
        title: "Error",
        description: "Nomor rekening tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: order, error } = await (supabase as any)
        .from("orders")
        .select("id")
        .eq("user_id", selectedInvoice.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (order) {
        const { error: updateError } = await (supabase as any)
          .from("orders")
          .update({ account_number: accountNumber })
          .eq("id", order.id);

        if (updateError) throw updateError;

        toast({
          title: "Berhasil",
          description: "Nomor rekening berhasil disimpan",
        });
        setAccountNumber("");
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan nomor rekening",
        variant: "destructive",
      });
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
                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportPDF(invoice)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportExcel(invoice)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitShipment(invoice)}
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Ajukan Pengiriman
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePayDirectly(invoice)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Bayar Langsung
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            Tambah No. Rekening
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tambah Nomor Rekening</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="accountNumber">Nomor Rekening Pelanggan/Pemasok</Label>
                              <Input
                                id="accountNumber"
                                placeholder="Masukkan nomor rekening"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                              />
                            </div>
                            <Button onClick={handleSaveAccountNumber} className="w-full">
                              Simpan
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
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

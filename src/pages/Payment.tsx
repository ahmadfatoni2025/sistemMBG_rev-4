import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, CreditCard, QrCode, Building2, Copy, CheckCircle, FileDown, MapPin, Package, Truck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  status: string;
  payment_method: string;
  bank_name: string;
  account_number: string;
  payment_code: string;
  qr_code_url: string;
  created_at: string;
  orders: {
    order_number: string;
    supplier_name: string;
    account_number: string;
    supplier_contact: string;
    delivery_date: string;
    notes: string;
    status: string;
    order_date: string;
    order_items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  };
}

const Payment = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          *,
          orders (
            order_number,
            supplier_name,
            account_number,
            supplier_contact,
            delivery_date,
            notes,
            status,
            order_date,
            order_items (
              product_name,
              quantity,
              unit_price,
              total_price
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data pembayaran",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Berhasil",
      description: "Kode pembayaran berhasil disalin",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleMarkAsPaid = async (paymentId: string, amount: number) => {
    try {
      // Get payment details with order
      const { data: paymentData, error: paymentFetchError } = await (supabase as any)
        .from("payments")
        .select("order_id")
        .eq("id", paymentId)
        .maybeSingle();

      if (paymentFetchError) throw paymentFetchError;
      
      if (!paymentData || !paymentData.order_id) {
        toast({
          title: "Error",
          description: "Pembayaran tidak ditemukan atau tidak memiliki pesanan terkait",
          variant: "destructive",
        });
        return;
      }
      
      const orderId = paymentData.order_id;

      // Update payment status
      const { error: paymentError } = await (supabase as any)
        .from("payments")
        .update({ status: "completed", paid_at: new Date().toISOString() })
        .eq("id", paymentId);

      if (paymentError) throw paymentError;

      // Update order status to processing
      const { error: orderError } = await (supabase as any)
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Get order items to create transactions
      const { data: orderItems, error: itemsError } = await (supabase as any)
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Create transaction records with approved status (since payment is confirmed)
      const transactions = orderItems.map((item: any) => ({
        order_id: orderId,
        payment_id: paymentId,
        product_name: item.product_name,
        quantity: item.quantity,
        amount: item.total_price,
        status: "approved",
        transaction_date: new Date().toISOString(),
        notes: "Auto-approved upon payment confirmation"
      }));

      const { error: transError } = await (supabase as any)
        .from("transactions")
        .insert(transactions);

      if (transError) throw transError;

      toast({
        title: "Berhasil",
        description: "Pembayaran dikonfirmasi dan transaksi disetujui",
      });

      fetchPayments();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal mengkonfirmasi pembayaran",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = (payment: Payment) => {
    if (!payment.orders) {
      toast({ 
        title: "Error", 
        description: "Data pesanan tidak lengkap untuk export PDF",
        variant: "destructive"
      });
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("NOTA PEMBAYARAN", 105, 20, { align: "center" });
    
    // Payment Info
    doc.setFontSize(12);
    doc.text(`No. Pembayaran: ${payment.payment_number}`, 14, 35);
    doc.text(`Tanggal: ${new Date(payment.created_at).toLocaleString('id-ID')}`, 14, 42);
    doc.text(`Status: ${payment.status}`, 14, 49);
    
    // Order Info
    doc.setFontSize(14);
    doc.text("Informasi Pesanan", 14, 60);
    doc.setFontSize(11);
    doc.text(`No. Pesanan: ${payment.orders.order_number || "-"}`, 14, 68);
    doc.text(`Tanggal Pesanan: ${payment.orders.order_date ? new Date(payment.orders.order_date).toLocaleDateString('id-ID') : "-"}`, 14, 75);
    doc.text(`Pemasok: ${payment.orders.supplier_name || "-"}`, 14, 82);
    doc.text(`Kontak: ${payment.orders.supplier_contact || "-"}`, 14, 89);
    doc.text(`Status Pesanan: ${payment.orders.status || "-"}`, 14, 96);
    doc.text(`Tanggal Pengiriman: ${payment.orders.delivery_date ? new Date(payment.orders.delivery_date).toLocaleDateString('id-ID') : "-"}`, 14, 103);
    
    // Account Numbers
    doc.setFontSize(14);
    doc.text("Informasi Rekening", 14, 115);
    doc.setFontSize(11);
    if (payment.orders.account_number) {
      doc.text(`No. Rekening Pelanggan/Pemasok: ${payment.orders.account_number}`, 14, 123);
    }
    if (payment.bank_name && payment.account_number) {
      doc.text(`Bank: ${payment.bank_name}`, 14, 130);
      doc.text(`No. Rekening Tujuan: ${payment.account_number}`, 14, 137);
    }
    
    // Items Table
    if (payment.orders.order_items && payment.orders.order_items.length > 0) {
      doc.setFontSize(14);
      doc.text("Detail Produk", 14, 150);
      
      autoTable(doc, {
        startY: 155,
        head: [['Produk', 'Jumlah', 'Harga Satuan', 'Total']],
        body: payment.orders.order_items.map(item => [
          item.product_name || "-",
          item.quantity?.toString() || "0",
          `Rp ${(item.unit_price || 0).toLocaleString()}`,
          `Rp ${(item.total_price || 0).toLocaleString()}`
        ]),
        foot: [['', '', 'Total Pembayaran:', `Rp ${payment.amount.toLocaleString()}`]],
        theme: 'grid',
      });
    }
    
    // Notes
    if (payment.orders.notes) {
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFontSize(11);
      doc.text("Catatan:", 14, finalY + 10);
      const splitNotes = doc.splitTextToSize(payment.orders.notes, 180);
      doc.text(splitNotes, 14, finalY + 17);
    }
    
    // Address Link
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink("Lihat Alamat Pengiriman di Maps", 14, finalY + 30, { 
      url: "https://maps.app.goo.gl/VZmfHtUKddte6QMX7" 
    });
    
    doc.save(`nota-${payment.payment_number}.pdf`);
    toast({ title: "Berhasil", description: "PDF berhasil diexport" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Menunggu", className: "bg-yellow-500" },
      processing: { label: "Diproses", className: "bg-blue-500" },
      completed: { label: "Selesai", className: "bg-green-500" },
      failed: { label: "Gagal", className: "bg-red-500" },
      draft: { label: "Draft", className: "bg-gray-500" },
      shipped: { label: "Dikirim", className: "bg-indigo-500" },
      delivered: { label: "Tiba", className: "bg-teal-500" },
    };

    const variant = variants[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Pembayaran</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Memuat data...</p>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada data pembayaran</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {payment.payment_number}
                    </CardTitle>
                    <div className="flex gap-2">
                      {getStatusBadge(payment.status)}
                      {payment.orders?.status && getStatusBadge(payment.orders.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Main Payment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Package className="w-5 h-5" />
                          <span>Informasi Pesanan</span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">No. Pesanan</p>
                          <p className="font-medium">{payment.orders?.order_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Pesanan</p>
                          <p className="font-medium">
                            {payment.orders?.order_date 
                              ? new Date(payment.orders.order_date).toLocaleDateString('id-ID')
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pemasok</p>
                          <p className="font-medium">{payment.orders?.supplier_name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Kontak Pemasok</p>
                          <p className="font-medium">{payment.orders?.supplier_contact || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status Pesanan</p>
                          <p className="font-medium capitalize">{payment.orders?.status || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Pengiriman</p>
                          <p className="font-medium">
                            {payment.orders?.delivery_date 
                              ? new Date(payment.orders.delivery_date).toLocaleDateString('id-ID')
                              : "-"}
                          </p>
                        </div>
                        {payment.orders?.account_number && (
                          <div className="p-3 border rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground">No. Rekening Pelanggan/Pemasok</p>
                            <p className="font-mono font-bold text-lg">{payment.orders.account_number}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                          <p className="text-2xl font-bold text-primary">
                            Rp {payment.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <CreditCard className="w-5 h-5" />
                          <span>Informasi Pembayaran</span>
                        </div>
                        {payment.bank_name && (
                          <div className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                              <Building2 className="w-5 h-5" />
                              <span className="font-semibold">{payment.bank_name}</span>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">No. Rekening Tujuan</p>
                              <p className="font-mono font-bold text-lg">{payment.account_number}</p>
                            </div>
                          </div>
                        )}

                        {payment.payment_code && (
                          <div className="p-4 border rounded-lg space-y-3">
                            <p className="text-sm text-muted-foreground">Kode Pembayaran</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 p-3 bg-muted rounded font-mono font-bold text-lg">
                                {payment.payment_code}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyCode(payment.payment_code)}
                              >
                                {copiedCode === payment.payment_code ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {payment.qr_code_url && (
                          <div className="p-4 border rounded-lg text-center space-y-2">
                            <div className="flex items-center justify-center gap-2 text-primary mb-2">
                              <QrCode className="w-5 h-5" />
                              <span className="font-semibold">Scan QR Code</span>
                            </div>
                            <div className="bg-white p-4 rounded inline-block">
                              <img 
                                src={payment.qr_code_url} 
                                alt="QR Code" 
                                className="w-48 h-48"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Scan dengan aplikasi mobile banking
                            </p>
                          </div>
                        )}

                        {/* Map Link */}
                        <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                          <div className="flex items-center gap-2 text-primary">
                            <MapPin className="w-5 h-5" />
                            <span className="font-semibold">Alamat Pengiriman</span>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open("https://maps.app.goo.gl/VZmfHtUKddte6QMX7", "_blank")}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Lihat di Google Maps
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    {payment.orders?.order_items && payment.orders.order_items.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Package className="w-5 h-5" />
                          <span>Detail Produk</span>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-right">Harga Satuan</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payment.orders.order_items.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{item.product_name}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {item.unit_price.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    Rp {item.total_price.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {payment.orders?.notes && (
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Catatan:</p>
                        <p className="text-sm">{payment.orders.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t flex justify-between items-center flex-wrap gap-3">
                    <p className="text-xs text-muted-foreground">
                      Dibuat: {new Date(payment.created_at).toLocaleString('id-ID')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportPDF(payment)}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      {payment.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(payment.id, payment.amount)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Konfirmasi Pembayaran
                        </Button>
                      )}
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

export default Payment;
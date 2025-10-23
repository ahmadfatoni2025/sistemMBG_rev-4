import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, CreditCard, QrCode, Building2, Copy, CheckCircle } from "lucide-react";

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
            account_number
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
        .single();

      if (paymentFetchError) throw paymentFetchError;
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Menunggu", className: "bg-yellow-500" },
      processing: { label: "Diproses", className: "bg-blue-500" },
      completed: { label: "Selesai", className: "bg-green-500" },
      failed: { label: "Gagal", className: "bg-red-500" },
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {payment.payment_number}
                    </CardTitle>
                    {getStatusBadge(payment.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">No. Pesanan</p>
                        <p className="font-medium">{payment.orders?.order_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pemasok</p>
                        <p className="font-medium">{payment.orders?.supplier_name || "-"}</p>
                      </div>
                      {payment.orders?.account_number && (
                        <div>
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
                      {payment.bank_name && (
                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-primary">
                            <Building2 className="w-5 h-5" />
                            <span className="font-semibold">{payment.bank_name}</span>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">No. Rekening</p>
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
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Dibuat: {new Date(payment.created_at).toLocaleString('id-ID')}
                    </p>
                    {payment.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(payment.id, payment.amount)}
                      >
                        Konfirmasi Pembayaran
                      </Button>
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

export default Payment;
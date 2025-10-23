import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Order {
  id: string;
  order_number: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  order_date: string;
  delivery_date: string;
  notes: string;
}

const Process = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("orders")
        .select("*")
        .in("status", ["processing", "in_transit", "delivered"])
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data proses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Update order status
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // If status is "delivered", create supplier history and approve transactions
      if (newStatus === "delivered") {
        // Get order details
        const { data: order, error: orderError } = await (supabase as any)
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;

        // Create supplier history entries
        const historyEntries = order.order_items.map((item: any) => ({
          order_id: orderId,
          supplier_name: order.supplier_name || "Unknown",
          supplier_phone: order.supplier_contact || null,
          product_name: item.product_name,
          quantity: item.quantity,
          arrival_date: new Date().toISOString(),
          stock_status: "received",
          notes: `Delivered from order ${order.order_number}`,
        }));

        const { error: historyError } = await (supabase as any)
          .from("supplier_history")
          .insert(historyEntries);

        if (historyError) throw historyError;

        // Update transactions to approved
        const { error: transError } = await (supabase as any)
          .from("transactions")
          .update({ status: "approved" })
          .eq("order_id", orderId);

        if (transError) throw transError;

        // Update product quantities
        for (const item of order.order_items) {
          const { data: product } = await (supabase as any)
            .from("products")
            .select("quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await (supabase as any)
              .from("products")
              .update({ quantity: product.quantity + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      toast({
        title: "Berhasil",
        description: "Status pesanan berhasil diperbarui",
      });

      fetchOrders();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal memperbarui status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="w-4 h-4" />;
      case "in_transit":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      processing: { label: "Diproses", className: "bg-blue-500" },
      in_transit: { label: "Dalam Perjalanan", className: "bg-yellow-500" },
      delivered: { label: "Diterima", className: "bg-green-500" },
    };

    const variant = variants[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Proses Pengiriman</h1>
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="processing">Diproses</SelectItem>
              <SelectItem value="in_transit">Dalam Perjalanan</SelectItem>
              <SelectItem value="delivered">Diterima</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Memuat data...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tidak ada pesanan</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead>Pemasok</TableHead>
                    <TableHead>Tanggal Pesan</TableHead>
                    <TableHead>Tanggal Kirim</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ubah Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.supplier_name || "-"}</TableCell>
                      <TableCell>{new Date(order.order_date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        {order.delivery_date 
                          ? new Date(order.delivery_date).toLocaleDateString('id-ID')
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">Rp {order.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          {getStatusBadge(order.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="processing">Diproses</SelectItem>
                            <SelectItem value="in_transit">Dalam Perjalanan</SelectItem>
                            <SelectItem value="delivered">Diterima</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Process;
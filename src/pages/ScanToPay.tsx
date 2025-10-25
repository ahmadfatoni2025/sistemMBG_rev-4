import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Download } from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ScanToPayOrder {
  id: string;
  order_number: string;
  payment_info: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
}

const ScanToPay = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { toast } = useToast();

  // Admin state
  const [paymentInfo, setPaymentInfo] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { product_name: "", quantity: 1, unit_price: 0, total_price: 0 },
  ]);
  const [qrUrl, setQrUrl] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Customer state
  const [order, setOrder] = useState<ScanToPayOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPdfButton, setShowPdfButton] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    }
  }, [orderId]);

  const fetchOrder = async (id: string) => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);

      if (itemsError) throw itemsError;

      setOrder({
        id: orderData.id,
        order_number: orderData.order_number,
        payment_info: orderData.notes || "",
        items: itemsData || [],
        total_amount: orderData.total_amount,
        status: orderData.status,
        created_at: orderData.created_at,
      });

      setShowPdfButton(orderData.status === "paid");
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { product_name: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const createOrder = async () => {
    if (!paymentInfo.trim()) {
      toast({
        title: "Error",
        description: "Please enter payment information",
        variant: "destructive",
      });
      return;
    }

    if (items.some((item) => !item.product_name.trim() || item.quantity <= 0 || item.unit_price <= 0)) {
      toast({
        title: "Error",
        description: "Please fill all item details correctly",
        variant: "destructive",
      });
      return;
    }

    setCreatingOrder(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const orderNumber = `ORD-${Date.now()}`;
      const totalAmount = calculateTotal();

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          total_amount: totalAmount,
          notes: paymentInfo,
          order_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const qrCodeUrl = `${window.location.origin}/pembayaran?orderId=${orderData.id}`;
      setQrUrl(qrCodeUrl);

      toast({
        title: "Success",
        description: "Order created successfully!",
      });
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id);

      if (error) throw error;

      setShowPdfButton(true);
      setOrder({ ...order, status: "paid" });

      toast({
        title: "Success",
        description: "Payment confirmed!",
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const generatePDF = () => {
    if (!order) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Invoice Number: ${order.order_number}`, 20, 35);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 42);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 49);

    const tableData = order.items.map((item) => [
      item.product_name,
      item.quantity.toString(),
      `Rp ${item.unit_price.toLocaleString()}`,
      `Rp ${item.total_price.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Item Name", "Quantity", "Unit Price", "Total"]],
      body: tableData,
      foot: [["", "", "Grand Total:", `Rp ${order.total_amount.toLocaleString()}`]],
      theme: "striped",
    });

    doc.setFontSize(12);
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Payment Information:", 20, finalY);
    doc.setFontSize(10);
    
    const paymentLines = order.payment_info.split("\n");
    paymentLines.forEach((line, index) => {
      doc.text(line, 20, finalY + 7 + (index * 7));
    });

    doc.save(`Invoice-${order.order_number}.pdf`);
  };

  // Customer View
  if (orderId) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!order) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Order Not Found</CardTitle>
              <CardDescription>The order you're looking for doesn't exist.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Order #{order.order_number}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">Items</h3>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x Rp {item.unit_price.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold">Rp {item.total_price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t pt-4">
                  <p className="text-lg font-bold">Total</p>
                  <p className="text-lg font-bold">Rp {order.total_amount.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Payment Instructions</h3>
                <div className="rounded-lg bg-muted p-4">
                  {order.payment_info.includes("http") ? (
                    <img
                      src={order.payment_info}
                      alt="Payment QR Code"
                      className="mx-auto max-w-xs"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {order.payment_info}
                    </pre>
                  )}
                </div>
              </div>

              {!showPdfButton && order.status !== "paid" && (
                <Button onClick={handleMarkAsPaid} className="w-full" size="lg">
                  I Have Paid (Show Invoice)
                </Button>
              )}

              {showPdfButton && (
                <Button onClick={generatePDF} className="w-full" size="lg" variant="secondary">
                  <Download className="mr-2 h-5 w-5" />
                  Export Invoice (PDF)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin View
  if (qrUrl) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Generated</CardTitle>
              <CardDescription>Share this QR code with your customer</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="rounded-lg bg-white p-8">
                <QRCode value={qrUrl} size={256} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Customer can scan this QR code to view order details and make payment
              </p>
              <Button onClick={() => { setQrUrl(""); setPaymentInfo(""); setItems([{ product_name: "", quantity: 1, unit_price: 0, total_price: 0 }]); }} variant="outline">
                Create Another Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Order</CardTitle>
            <CardDescription>Fill in the order details to generate a payment QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="paymentInfo">Payment Information *</Label>
              <Textarea
                id="paymentInfo"
                placeholder="Enter QRIS image URL (https://...) or account details (BCA 123456789 a/n MBG)"
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Enter a QRIS image link or payment account details
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Item Name</Label>
                        <Input
                          placeholder="Product name"
                          value={item.product_name}
                          onChange={(e) => updateItem(index, "product_name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price (Rp)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="icon"
                        className="ml-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-end border-t pt-2">
                    <p className="text-sm font-semibold">
                      Total: Rp {item.total_price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-lg font-bold">Grand Total</p>
              <p className="text-lg font-bold">Rp {calculateTotal().toLocaleString()}</p>
            </div>

            <Button onClick={createOrder} disabled={creatingOrder} className="w-full" size="lg">
              {creatingOrder ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Order...
                </>
              ) : (
                "Create Order & QR Code"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScanToPay;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { orderItemSchema, supplierInfoSchema } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, ShoppingCart, FileText, Package } from "lucide-react";

interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

const Order = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [notes, setNotes] = useState("");
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "1",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat daftar bahan baku",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = () => {
    const product = products.find((p) => p.id === formData.product_id);
    if (!product) {
      toast({
        title: "Error",
        description: "Pilih bahan baku",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(formData.quantity);
    const total = product.price * quantity;

    // Validate order item data
    const validationResult = orderItemSchema.safeParse({
      product_name: product.name,
      quantity: quantity,
      price: total,
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

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: product.price,
      total_price: total,
    };

    if (editingItem) {
      setOrderItems(orderItems.map((item) => 
        item.product_id === editingItem.product_id ? newItem : item
      ));
      setEditingItem(null);
    } else {
      setOrderItems([...orderItems, newItem]);
    }

    setFormData({ product_id: "", quantity: "1" });
    setDialogOpen(false);
    toast({
      title: "Berhasil",
      description: editingItem ? "Item berhasil diperbarui" : "Item berhasil ditambahkan",
    });
  };

  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item);
    setFormData({
      product_id: item.product_id,
      quantity: item.quantity.toString(),
    });
    setDialogOpen(true);
  };

  const handleDeleteItem = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.product_id !== productId));
    toast({
      title: "Berhasil",
      description: "Item berhasil dihapus",
    });
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getIconColor = (index: number) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-cyan-500",
      "bg-orange-500",
      "bg-green-500",
    ];
    return colors[index % colors.length];
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Tambahkan minimal satu item ke pesanan",
        variant: "destructive",
      });
      return;
    }

    // Validate supplier information
    const supplierValidation = supplierInfoSchema.safeParse({
      supplier_name: supplierName,
      supplier_contact: supplierContact,
      notes: notes,
    });

    if (!supplierValidation.success) {
      const firstError = supplierValidation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orderNumber = `ORD-${Date.now()}`;
      const totalAmount = getTotalAmount();

      const { data: order, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          total_amount: totalAmount,
          status: "draft",
          supplier_name: supplierName,
          supplier_contact: supplierContact,
          notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Auto-create invoice
      const invoiceNumber = `INV-${Date.now()}`;
      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          total_amount: totalAmount,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = orderItems.map((item) => ({
        invoice_id: invoiceData.id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
      }));

      const { error: invoiceItemsError } = await (supabase as any)
        .from("invoice_items")
        .insert(invoiceItems);

      if (invoiceItemsError) throw invoiceItemsError;

      // Auto-create payment record
      const paymentNumber = `PAY-${Date.now()}`;
      const { error: paymentError } = await (supabase as any)
        .from("payments")
        .insert({
          payment_number: paymentNumber,
          order_id: order.id,
          amount: totalAmount,
          status: "pending",
          payment_method: "bank_transfer",
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Berhasil",
        description: "Pesanan, invoice, dan pembayaran berhasil dibuat",
      });

      // Reset form and navigate
      setOrderItems([]);
      setSupplierName("");
      setSupplierContact("");
      setNotes("");
      navigate("/invoices");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal membuat pesanan",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pesanan Bahan Baku</h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola pesanan bahan baku untuk menu Makan Bergizi Gratis</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm" onClick={() => {
                setEditingItem(null);
                setFormData({ product_id: "", quantity: "1" });
              }}>
                <Plus className="w-4 h-4" />
                Tambah Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Tambah Item Pesanan"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product">Bahan Baku</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahan baku" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Rp {product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Jumlah</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddItem} className="w-full">
                  {editingItem ? "Perbarui Item" : "Tambah Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {orderItems.length === 0 ? (
          <Card className="shadow-sm border-border/40">
            <CardContent className="py-20">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Belum Ada Item Pesanan</h3>
                <p className="text-muted-foreground text-sm mb-4">Klik tombol "Tambah Item" untuk memulai pesanan</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orderItems.map((item, index) => (
              <Card key={index} className="shadow-sm border-border/40 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getIconColor(index)} flex items-center justify-center flex-shrink-0`}>
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">{item.product_name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {products.find(p => p.id === item.product_id)?.category || "Bahan Baku"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditItem(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.product_id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Harga Satuan</p>
                          <p className="text-sm font-semibold">Rp {item.unit_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Jumlah</p>
                          <p className="text-sm font-semibold">{item.quantity} unit</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Harga</p>
                          <p className="text-sm font-bold text-primary">Rp {item.total_price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="shadow-sm border-border/40 bg-muted/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Pesanan</span>
                  <span className="text-2xl font-bold text-primary">Rp {getTotalAmount().toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/40">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="text-lg font-semibold">Informasi Pemasok</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier_name">Nama Pemasok</Label>
                    <Input
                      id="supplier_name"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Nama pemasok"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_contact">Kontak Pemasok</Label>
                    <Input
                      id="supplier_contact"
                      value={supplierContact}
                      onChange={(e) => setSupplierContact(e.target.value)}
                      placeholder="No. telepon / email"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk pesanan ini..."
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <Button
                  className="w-full gap-2 shadow-sm"
                  onClick={handleCreateOrder}
                  disabled={orderItems.length === 0}
                  size="lg"
                >
                  <FileText className="w-4 h-4" />
                  Buat Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Order;
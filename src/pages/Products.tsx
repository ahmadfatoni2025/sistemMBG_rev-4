import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, FileSpreadsheet } from "lucide-react";
import { Product, ProductFormData } from "@/types/product";
import { ProductTable } from "@/components/products/ProductTable";
import { ProductDialog } from "@/components/products/ProductDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const initialProducts: Product[] = [
  { id: 1, name: 'Wortel', color: 'Oranye', category: 'Sayur', price: 5000, quantity: 1 },
  { id: 2, name: 'Cabai Merah', color: 'Merah', category: 'Bumbu', price: 8000, quantity: 1 },
  { id: 3, name: 'Daging Sapi', color: 'Merah', category: 'Lauk', price: 45000, quantity: 1 },
];

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setProducts(data?.map((p, index) => ({
        id: index + 1,
        name: p.name,
        color: p.color || '',
        category: p.category,
        price: parseFloat(p.price.toString()),
        quantity: p.quantity
      })) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuantityChange = (id: number, amount: number) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === id) {
          const newQuantity = product.quantity + amount;
          return { ...product, quantity: newQuantity >= 0 ? newQuantity : 0 };
        }
        return product;
      })
    );
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingProduct) {
        const productToUpdate = await (supabase as any)
          .from("products")
          .select("id")
          .eq("name", editingProduct.name)
          .single();

        if (!productToUpdate.data) return;

        const { error } = await (supabase as any)
          .from("products")
          .update({
            name: data.name,
            color: data.color,
            category: data.category,
            price: data.price,
            quantity: data.quantity,
          })
          .eq("id", productToUpdate.data.id);

        if (error) throw error;

        toast({
          title: "Product updated",
          description: "The product has been updated successfully.",
        });
      } else {
        const { error } = await (supabase as any)
          .from("products")
          .insert({
            name: data.name,
            color: data.color,
            category: data.category,
            price: data.price,
            quantity: data.quantity,
            user_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Product added",
          description: "The product has been added successfully.",
        });
      }
      
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const productToDelete = products[id - 1];
      if (!productToDelete) return;

      const { error } = await (supabase as any)
        .from("products")
        .delete()
        .eq("name", productToDelete.name)
        .eq("category", productToDelete.category);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
        variant: "destructive",
      });
      
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Invoice - Raw Materials List", 14, 22);
    
    // Add date
    doc.setFontSize(11);
    const invoiceNumber = `INV-${new Date().getTime()}`;
    doc.text(`Invoice #: ${invoiceNumber}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Add table
    autoTable(doc, {
      startY: 45,
      head: [['Material Name', 'Category', 'Color', 'Quantity', 'Price', 'Total']],
      body: filteredProducts.map(p => [
        p.name,
        p.category,
        p.color,
        p.quantity.toString(),
        `IDR ${p.price.toLocaleString()}`,
        `IDR ${(p.price * p.quantity).toLocaleString()}`
      ]),
      foot: [['', '', '', '', 'Grand Total:', `IDR ${filteredProducts.reduce((sum, p) => sum + p.price * p.quantity, 0).toLocaleString()}`]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    doc.save(`invoice-${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Save to invoices table
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const totalAmount = filteredProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

      const { data: invoiceData, error: invoiceError } = await (supabase as any)
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          total_amount: totalAmount,
          status: 'paid'
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const invoiceItems = filteredProducts.map(p => ({
        invoice_id: invoiceData.id,
        product_name: p.name,
        quantity: p.quantity,
        price: p.price,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Invoice Created",
        description: "PDF exported and invoice saved successfully.",
      });
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Invoice Saved with Warning",
        description: "PDF exported but invoice may not be saved to database.",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Raw Materials Inventory</h1>
            <p className="text-muted-foreground">Manage raw food ingredients and materials</p>
          </div>
          <Button onClick={handleAddNew} className="gap-2 shadow-md hover:shadow-lg transition-shadow">
            <Plus className="w-4 h-4" />
            Add Raw Material
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Total Products</p>
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{products.length}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <div className="p-2 bg-accent/10 rounded-lg">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              IDR {products.reduce((sum, p) => sum + p.price * p.quantity, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Categories</p>
              <div className="p-2 bg-secondary/50 rounded-lg">
                <Filter className="w-4 h-4 text-secondary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {new Set(products.map((p) => p.category)).size}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-muted-foreground">Total Stock</p>
              <div className="p-2 bg-muted rounded-lg">
                <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {products.reduce((sum, p) => sum + p.quantity, 0)}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <ProductTable
          products={filteredProducts}
          onQuantityChange={handleQuantityChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Product Dialog */}
        <ProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          product={editingProduct}
        />
      </div>
    </div>
  );
};

export default Products;

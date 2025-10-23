import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, MessageCircle, Send, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RejectedItem {
  id: string;
  product_name: string;
  seller_id: string;
  reason: string;
  quantity: number;
  status: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const Rejected = () => {
  const [rejectedItems, setRejectedItems] = useState<RejectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RejectedItem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    product_name: "",
    quantity: 0,
    reason: "",
  });

  useEffect(() => {
    initializePage();
    fetchProducts();
  }, []);

  const initializePage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUserId(user.id);
    await checkAdminRole(user.id);
    await fetchRejectedItems();
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchRejectedItems = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("rejected_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRejectedItems(data || []);
    } catch (error) {
      console.error("Error fetching rejected items:", error);
      toast({
        title: "Error",
        description: "Failed to load rejected items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (rejectedItemId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .eq("rejected_item_id", rejectedItemId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    }
  };

  const handleOpenChat = (item: RejectedItem) => {
    setSelectedItem(item);
    fetchChatMessages(item.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedItem) return;

    try {
      const { error } = await (supabase as any)
        .from("chat_messages")
        .insert({
          rejected_item_id: selectedItem.id,
          sender_id: currentUserId,
          message: newMessage,
        });

      if (error) throw error;

      setNewMessage("");
      fetchChatMessages(selectedItem.id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert rejected item
      const { error: rejectError } = await (supabase as any)
        .from("rejected_items")
        .insert({
          product_id: formData.product_id,
          product_name: formData.product_name,
          quantity: formData.quantity,
          reason: formData.reason,
          seller_id: user.id,
          status: "pending",
        });

      if (rejectError) throw rejectError;

      // Update product quantity (decrease)
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const newQuantity = product.quantity - formData.quantity;
        const { error: updateError } = await (supabase as any)
          .from("products")
          .update({ quantity: Math.max(0, newQuantity) })
          .eq("id", formData.product_id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Material Rejected",
        description: "Raw material has been marked as rejected and inventory updated.",
      });

      setFormOpen(false);
      setFormData({ product_id: "", product_name: "", quantity: 0, reason: "" });
      fetchRejectedItems();
      fetchProducts();
    } catch (error) {
      console.error("Error rejecting material:", error);
      toast({
        title: "Error",
        description: "Failed to reject material",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-10 text-center">
              <Ban className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Admin access required</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ban className="w-8 h-8 text-destructive" />
            <h1 className="text-3xl font-bold text-foreground">Rejected Raw Materials</h1>
          </div>
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Rejected Material
            </Button>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Reject Raw Material Form</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product">Select Raw Material</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      setFormData({ 
                        ...formData, 
                        product_id: value,
                        product_name: product?.name || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select raw material" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stock: {product.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity to Reject</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reason">Rejection Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Damaged, Expired, Quality issue"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Submit Rejection</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading rejected items...</p>
        ) : rejectedItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No rejected items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rejectedItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">{item.product_name}</span>
                    <Badge variant="destructive">{item.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    <Button
                      onClick={() => handleOpenChat(item)}
                      className="w-full mt-4 gap-2"
                      variant="outline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat with Seller
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chat - {selectedItem?.product_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground">No messages yet</p>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Rejected;

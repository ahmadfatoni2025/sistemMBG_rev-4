import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecapDocument {
  id: string;
  document_name: string;
  document_url: string;
  file_type: string;
  created_at: string;
  order_id: string;
  orders: {
    order_number: string;
    total_amount: number;
    supplier_name: string;
  };
}

const Recap = () => {
  const [documents, setDocuments] = useState<RecapDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("recap_documents")
        .select(`
          *,
          orders (
            order_number,
            total_amount,
            supplier_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat dokumen rekap",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Rekap Invoice</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Memuat dokumen...</p>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada dokumen rekap</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="w-10 h-10 text-destructive" />
                    <Badge variant="outline">PDF</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{doc.document_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      No. Pesanan: <span className="font-medium text-foreground">{doc.orders?.order_number}</span>
                    </p>
                    {doc.orders?.supplier_name && (
                      <p className="text-muted-foreground">
                        Pemasok: <span className="font-medium text-foreground">{doc.orders.supplier_name}</span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Total: <span className="font-bold text-primary">Rp {doc.orders?.total_amount.toLocaleString()}</span>
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">{new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => handleDownload(doc.document_url, doc.document_name)}
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recap;
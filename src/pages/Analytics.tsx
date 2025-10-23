import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet, TrendingUp, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  product_name: string;
  quantity: number;
  amount: number;
  status: string;
  notes: string | null;
  transaction_date: string;
}

const Analytics = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingPayments: 0,
    completedPayments: 0,
    totalReturns: 0,
    totalRejectedItems: 0,
    qualityInspections: 0,
    fitForProcessing: 0,
  });

  useEffect(() => {
    fetchTransactions();
    fetchStats();
    
    // Setup realtime subscriptions for all relevant tables
    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
        fetchStats();
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .subscribe();

    const paymentsChannel = supabase
      .channel('payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchStats)
      .subscribe();

    const returnsChannel = supabase
      .channel('returns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, fetchStats)
      .subscribe();

    const rejectedChannel = supabase
      .channel('rejected-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rejected_items' }, fetchStats)
      .subscribe();

    const conditionsChannel = supabase
      .channel('conditions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_conditions' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(returnsChannel);
      supabase.removeChannel(rejectedChannel);
      supabase.removeChannel(conditionsChannel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch orders data
      const { data: ordersData } = await (supabase as any)
        .from("orders")
        .select("total_amount");

      // Fetch transactions data
      const { data: transData } = await (supabase as any)
        .from("transactions")
        .select("status");

      // Fetch payments data
      const { data: paymentsData } = await (supabase as any)
        .from("payments")
        .select("status");

      // Fetch returns data
      const { data: returnsData } = await (supabase as any)
        .from("returns")
        .select("id");

      // Fetch rejected items data
      const { data: rejectedData } = await (supabase as any)
        .from("rejected_items")
        .select("id");

      // Fetch food conditions data
      const { data: conditionsData } = await (supabase as any)
        .from("food_conditions")
        .select("fit_for_processing");

      const totalOrders = ordersData?.length || 0;
      const totalAmount = ordersData?.reduce((sum: number, order: any) => sum + parseFloat(order.total_amount), 0) || 0;
      const approvedCount = transData?.filter((t: any) => t.status === "approved").length || 0;
      const rejectedCount = transData?.filter((t: any) => t.status === "rejected").length || 0;
      const pendingPayments = paymentsData?.filter((p: any) => p.status === "pending").length || 0;
      const completedPayments = paymentsData?.filter((p: any) => p.status === "completed").length || 0;
      const totalReturns = returnsData?.length || 0;
      const totalRejectedItems = rejectedData?.length || 0;
      const qualityInspections = conditionsData?.length || 0;
      const fitForProcessing = conditionsData?.filter((c: any) => c.fit_for_processing).length || 0;

      setStats({ 
        totalOrders, 
        totalAmount, 
        approvedCount, 
        rejectedCount,
        pendingPayments,
        completedPayments,
        totalReturns,
        totalRejectedItems,
        qualityInspections,
        fitForProcessing,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const approvedTransactions = transactions.filter(t => t.status === "approved");
  const rejectedTransactions = transactions.filter(t => t.status === "rejected");

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Raw Material Analytics Report", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
    
    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Material', 'Quantity', 'Amount', 'Status']],
      body: transactions.map(t => [
        format(new Date(t.transaction_date), "MMM dd, yyyy"),
        t.product_name,
        t.quantity.toString(),
        `IDR ${t.amount.toFixed(2)}`,
        t.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(`material-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Analytics report has been exported successfully.",
    });
  };

  const handleExportExcel = () => {
    const csvContent = [
      ['Date', 'Material', 'Quantity', 'Amount', 'Status', 'Notes'],
      ...transactions.map(t => [
        format(new Date(t.transaction_date), "MMM dd, yyyy"),
        t.product_name,
        t.quantity,
        t.amount.toFixed(2),
        t.status,
        t.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `material-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Excel Exported",
      description: "Analytics data has been exported to CSV.",
    });
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Analisis Bahan Baku</h1>
            <p className="text-muted-foreground">Lacak transaksi material dan riwayat pengadaan</p>
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Rp {stats.totalAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transaksi Disetujui</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.approvedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Material disetujui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pembayaran</CardTitle>
              <Loader2 className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedPayments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingPayments} menunggu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Retur & Penolakan</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.totalReturns + stats.totalRejectedItems}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalReturns} retur, {stats.totalRejectedItems} ditolak
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inspeksi Kualitas</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.qualityInspections}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.fitForProcessing} layak proses ({stats.qualityInspections > 0 ? Math.round((stats.fitForProcessing / stats.qualityInspections) * 100) : 0}%)
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transaksi Ditolak</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.rejectedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Memerlukan tindak lanjut
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pengadaan Material</CardTitle>
            <CardDescription>Transaksi bahan baku yang disetujui</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Material</TableHead>
                    <TableHead>Kuantitas</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {approvedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada transaksi yang disetujui
                    </TableCell>
                  </TableRow>
                ) : (
                  approvedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.transaction_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{transaction.product_name}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>Rp {transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">Disetujui</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Material Ditolak & Masalah Kualitas</CardTitle>
            <CardDescription>Material yang memerlukan perhatian inspeksi kualitas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Material</TableHead>
                    <TableHead>Kuantitas</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Catatan Kualitas</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {rejectedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada item yang ditolak
                    </TableCell>
                  </TableRow>
                ) : (
                  rejectedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.transaction_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{transaction.product_name}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>Rp {transaction.amount.toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs text-muted-foreground">
                        {transaction.notes || "Tidak ada catatan"}
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

export default Analytics;

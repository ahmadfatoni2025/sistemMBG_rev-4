-- Create transactions table for financial tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'rejected', 'pending')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create supplier_history table for tracking supplier deliveries
CREATE TABLE public.supplier_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_address TEXT,
  supplier_phone TEXT,
  supplier_email TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stock_status TEXT NOT NULL DEFAULT 'pending' CHECK (stock_status IN ('received', 'pending', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = transactions.order_id
    AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transactions"
ON public.transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Enable RLS on supplier_history
ALTER TABLE public.supplier_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_history
CREATE POLICY "Users can view all supplier history"
ON public.supplier_history
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert supplier history"
ON public.supplier_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplier history"
ON public.supplier_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updating updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
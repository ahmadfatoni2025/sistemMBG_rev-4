-- Tabel untuk pesanan bahan baku
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  delivery_date timestamp with time zone,
  supplier_name text,
  supplier_contact text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabel untuk item pesanan
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabel untuk pembayaran
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_number text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  bank_name text,
  account_number text,
  payment_code text,
  qr_code_url text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabel untuk rekap dokumen
CREATE TABLE public.recap_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recap_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk orders
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies untuk order_items
CREATE POLICY "Users can view their order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users can insert order items"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can update order items"
ON public.order_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users can delete order items"
ON public.order_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));

-- RLS Policies untuk payments
CREATE POLICY "Users can view their payments"
ON public.payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = payments.order_id
  AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Admins can insert payments"
ON public.payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies untuk recap_documents
CREATE POLICY "Users can view their recap documents"
ON public.recap_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders
  WHERE orders.id = recap_documents.order_id
  AND (orders.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users can insert recap documents"
ON public.recap_documents FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Trigger untuk update timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
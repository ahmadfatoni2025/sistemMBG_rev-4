-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'seller');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT,
    category TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items for their invoices"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.invoices
        WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
);

-- Create returns table
CREATE TABLE public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own returns"
ON public.returns
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all returns"
ON public.returns
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own returns"
ON public.returns
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update returns"
ON public.returns
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create food_conditions table
CREATE TABLE public.food_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    condition TEXT NOT NULL,
    fit_for_processing BOOLEAN NOT NULL DEFAULT true,
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    inspector_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.food_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all food conditions"
ON public.food_conditions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert food conditions"
ON public.food_conditions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update food conditions"
ON public.food_conditions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create rejected_items table
CREATE TABLE public.rejected_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    seller_id UUID NOT NULL,
    reason TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rejected_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all rejected items"
ON public.rejected_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can view their rejected items"
ON public.rejected_items
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can insert rejected items"
ON public.rejected_items
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rejected items"
ON public.rejected_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create chat_messages table for rejected items
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rejected_item_id UUID REFERENCES public.rejected_items(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their rejected items"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.rejected_items
        WHERE rejected_items.id = chat_messages.rejected_item_id
        AND (rejected_items.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Users can insert messages for their rejected items"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.rejected_items
        WHERE rejected_items.id = chat_messages.rejected_item_id
        AND (rejected_items.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND auth.uid() = sender_id
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
BEFORE UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rejected_items_updated_at
BEFORE UPDATE ON public.rejected_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
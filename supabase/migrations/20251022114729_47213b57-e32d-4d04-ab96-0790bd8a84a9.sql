-- Fix supplier_history RLS policy to restrict sensitive data to admins only
DROP POLICY IF EXISTS "Users can view all supplier history" ON public.supplier_history;

CREATE POLICY "Admins can view supplier history" 
ON public.supplier_history
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
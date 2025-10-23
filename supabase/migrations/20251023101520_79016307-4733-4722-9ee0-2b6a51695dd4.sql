-- Add account_number field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_number text;

-- Add comment to explain the field
COMMENT ON COLUMN orders.account_number IS 'Customer or supplier account number for payment';
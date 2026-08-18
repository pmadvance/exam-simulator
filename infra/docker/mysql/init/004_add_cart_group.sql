-- Add cart_group_id to orders for bulk checkout support
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_group_id VARCHAR(36) NULL AFTER gateway_reference;
CREATE INDEX IF NOT EXISTS idx_cart_group ON orders (cart_group_id);

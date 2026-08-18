SET @has_price_myr := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'price_myr'
);

SET @rename_price_sql := IF(
  @has_price_myr > 0,
  'ALTER TABLE products CHANGE COLUMN price_myr price_usd DECIMAL(10, 2) NOT NULL',
  'SELECT 1'
);

PREPARE rename_price_stmt FROM @rename_price_sql;
EXECUTE rename_price_stmt;
DEALLOCATE PREPARE rename_price_stmt;

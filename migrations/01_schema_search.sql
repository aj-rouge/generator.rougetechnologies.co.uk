-- 1. Create the FTS5 virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS products_search USING fts5(
  product_id UNINDEXED,
  title,
  sku,
  tokenize = 'unicode61',
  prefix = '2 3 4 5 6'
);

-- 2. Triggers to keep products_search in sync with products
CREATE TRIGGER IF NOT EXISTS products_search_ai
AFTER INSERT ON products
BEGIN
  INSERT INTO products_search (product_id, title, sku)
  VALUES (
    new.id,
    lower(new.title),
    lower(
      replace(
        replace(
          replace(
            replace(
              replace(new.sku, ' ', ''),
              '-', ''
            ),
            '_', ''
          ),
          '/', ''
        ),
        '.', ''
      )
    )
  );
END;

CREATE TRIGGER IF NOT EXISTS products_search_ad
AFTER DELETE ON products
BEGIN
  DELETE FROM products_search WHERE product_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS products_search_au
AFTER UPDATE OF title, sku ON products
BEGIN
  DELETE FROM products_search WHERE product_id = old.id;

  INSERT INTO products_search (product_id, title, sku)
  VALUES (
    new.id,
    lower(new.title),
    lower(
      replace(
        replace(
          replace(
            replace(
              replace(new.sku, ' ', ''),
              '-', ''
            ),
            '_', ''
          ),
          '/', ''
        ),
        '.', ''
      )
    )
  );
END;

-- 3. Backfill existing products
INSERT OR IGNORE INTO products_search (product_id, title, sku)
SELECT
  id,
  lower(title),
  lower(
    replace(
      replace(
        replace(
          replace(
            replace(sku, ' ', ''),
            '-', ''
          ),
          '_', ''
        ),
        '/', ''
      ),
      '.', ''
    )
  )
FROM products
WHERE id IS NOT NULL;
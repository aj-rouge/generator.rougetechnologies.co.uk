-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =====================================================
-- CATEGORY CONTENT TABLE
-- Stores the rich text content for each category
-- =====================================================
CREATE TABLE IF NOT EXISTS category_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_slug TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  subheading TEXT,
  paragraphs TEXT NOT NULL, -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (category_slug) REFERENCES categories(slug) ON DELETE CASCADE,
  UNIQUE(category_slug, section_order)
);

CREATE INDEX IF NOT EXISTS idx_category_content_category ON category_content(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_content_updated ON category_content(updated_at);

-- =====================================================
-- CONDITIONS TABLE - Stores condition sets for eBay
-- =====================================================
CREATE TABLE IF NOT EXISTS conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_key TEXT NOT NULL UNIQUE, -- 'electronics', 'business', etc.
  group_name TEXT NOT NULL, -- Display name for the condition group
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_conditions_group_key ON conditions(group_key);

-- =====================================================
-- CONDITION OPTIONS TABLE - Individual condition options per group
-- =====================================================
CREATE TABLE IF NOT EXISTS condition_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  condition_group_id INTEGER NOT NULL,
  option_order INTEGER NOT NULL, -- For maintaining the order from the array
  option_value TEXT NOT NULL, -- The actual condition text (e.g., "New", "Used")
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (condition_group_id) REFERENCES conditions(id) ON DELETE CASCADE,
  UNIQUE(condition_group_id, option_value) -- Prevent duplicates within a group
);

CREATE INDEX IF NOT EXISTS idx_condition_options_group_id ON condition_options(condition_group_id);
CREATE INDEX IF NOT EXISTS idx_condition_options_value ON condition_options(option_value);

-- =====================================================
-- CATEGORIES TABLE - Enhanced with condition group reference
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_category TEXT,
  condition_group_id INTEGER, -- References the conditions table
  ebay_store_link TEXT, -- Direct link to eBay store category page
  keywords TEXT, -- JSON array of keywords for search/SEO
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()), -- Track when category was last updated
  
  FOREIGN KEY (parent_category) REFERENCES categories(slug),
  FOREIGN KEY (condition_group_id) REFERENCES conditions(id)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_categories_condition_group ON categories(condition_group_id);

-- =====================================================
-- PRODUCTS TABLE - Core fields only
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- UUID
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sku TEXT UNIQUE,
  ean TEXT,
  asin TEXT,
  baselinker_id TEXT,
  shopify_id TEXT,
  category TEXT NOT NULL,
  condition TEXT,
  note TEXT,
  vat_rate INTEGER DEFAULT 20,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  rrp DECIMAL(10,2),
  weight DECIMAL(8,2),
  quantity INTEGER DEFAULT 0,
  price_brutto DECIMAL(10,2),
  shipping_method TEXT,
  image_count INTEGER DEFAULT 0,
  specs_count INTEGER DEFAULT 0, 
  paragraphs_count INTEGER DEFAULT 0, 
  features_count INTEGER DEFAULT 0, 
  feedbacks_count INTEGER DEFAULT 0,
  FOREIGN KEY (category) REFERENCES categories(slug)
);

CREATE TABLE IF NOT EXISTS product_specifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  spec_order INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(product_id, spec_order)   -- enforce order uniqueness
);

-- =====================================================
-- CRITICAL: Exact match indexes for identifiers
-- Users will search by ASIN, EAN, SKU most frequently
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_baselinker_id ON products(baselinker_id) WHERE baselinker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_id) WHERE shopify_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_key ON product_specifications(key);
CREATE INDEX IF NOT EXISTS idx_products_all_ids ON products(asin, ean, sku, baselinker_id, shopify_id);
CREATE INDEX IF NOT EXISTS idx_products_image_count ON products(image_count);
CREATE INDEX IF NOT EXISTS idx_products_specs_count ON products(specs_count);
CREATE INDEX IF NOT EXISTS idx_products_paragraphs_count ON products(paragraphs_count);
CREATE INDEX IF NOT EXISTS idx_products_features_count ON products(features_count);
CREATE INDEX IF NOT EXISTS idx_products_feedbacks_count ON products(feedbacks_count);

-- =====================================================
-- PAGINATION & FILTERING (for "get recent 10/20/50/100 updated products")
-- =====================================================
-- Primary pagination index - CRITICAL for performance
CREATE INDEX IF NOT EXISTS idx_products_pagination ON products(updated_at DESC, id);

-- Category + updated_at for filtered pagination
CREATE INDEX IF NOT EXISTS idx_products_category_updated ON products(category, updated_at DESC);

-- For counting queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- =====================================================
-- RELATED DATA TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS product_paragraphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  paragraph_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  feature_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  image_order INTEGER NOT NULL,
  url TEXT NOT NULL,
  s3_path TEXT,
  alt_text TEXT,
  warnings TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  task TEXT PRIMARY KEY,           -- 'title', 'sku', 'paragraphs', 'features', 'note'
  name TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,     -- Handlebars template
  variables TEXT,                  -- JSON array of expected variable names (for UI hints)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =====================================================
-- Indexes for joins
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_product_paragraphs_product_id ON product_paragraphs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_feedbacks_product_id ON product_feedbacks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_warnings ON product_images(warnings) WHERE warnings IS NOT NULL;

-- =====================================================
-- VIEW for full product data (no category enrichment)
-- =====================================================
DROP VIEW IF EXISTS v_product_complete;
CREATE VIEW v_product_complete AS
SELECT 
  p.id,
  p.slug,
  p.title,
  p.sku,
  p.ean,
  p.asin,
  p.baselinker_id,
  p.shopify_id,
  p.category AS category_slug,
  p.condition AS product_condition,
  p.note,
  p.vat_rate,
  p.rrp,
  p.weight,
  p.quantity,
  p.price_brutto,
  p.shipping_method,
  p.created_at,
  p.updated_at,
  p.image_count,
  p.specs_count,
  p.paragraphs_count,
  p.features_count,
  p.feedbacks_count,
  (
    SELECT json_group_array(content ORDER BY paragraph_order)
    FROM product_paragraphs WHERE product_id = p.id
  ) AS paragraphs,
  
  (
    SELECT json_group_array(
      json_object('title', title, 'description', description)
      ORDER BY feature_order
    )
    FROM product_features WHERE product_id = p.id
  ) AS features,
  
  (
    SELECT json_group_array(
      json_object(
        'url', COALESCE(s3_path, url),
        's3_path', s3_path,
        'original_url', url,
        'alt_text', alt_text,
        'warnings', warnings
      ) ORDER BY image_order
    )
    FROM product_images WHERE product_id = p.id
  ) AS images,
  
  (
    SELECT json_group_array(
      json_object('name', name, 'content', content, 'count', count)
    )
    FROM product_feedbacks WHERE product_id = p.id
  ) AS feedbacks,
  
  (
    SELECT json_group_array(
      json_array(key, value)
      ORDER BY spec_order
    )
    FROM product_specifications WHERE product_id = p.id
  ) AS specifications

FROM products p;

-- =====================================================
-- VIEW for condition groups with their options
-- =====================================================
DROP VIEW IF EXISTS v_condition_groups;
CREATE VIEW v_condition_groups AS
SELECT 
  c.id,
  c.group_key,
  c.group_name,
  (
    SELECT json_group_array(
      option_value ORDER BY option_order
    )
    FROM condition_options 
    WHERE condition_group_id = c.id
  ) as options
FROM conditions c;

-- =====================================================
-- VIEW for complete category data with content
-- =====================================================
DROP VIEW IF EXISTS v_category_full;
CREATE VIEW v_category_full AS
SELECT 
  c.*,
  (
    SELECT json_group_array(
      json_object(
        'subheading', cc.subheading,
        'paragraphs', json(cc.paragraphs)
      ) ORDER BY cc.section_order
    )
    FROM category_content cc
    WHERE cc.category_slug = c.slug
  ) as content
FROM categories c;

-- =====================================================
-- VIEW for categories with children, condition groups, and eBay links
-- =====================================================
DROP VIEW IF EXISTS v_category_tree;
CREATE VIEW v_category_tree AS
SELECT 
  cat.id,
  cat.slug,
  cat.name,
  cat.parent_category,
  cat.condition_group_id,
  cat.ebay_store_link,
  cat.keywords,
  cat.created_at,
  cat.updated_at,
  (SELECT COUNT(*) FROM products WHERE category = cat.slug) as product_count,
  json_object(
    'group_key', c.group_key,
    'group_name', c.group_name,
    'options', (
      SELECT json_group_array(option_value ORDER BY option_order)
      FROM condition_options 
      WHERE condition_group_id = c.id
    )
  ) as condition_group,
  (
    SELECT json_group_array(
      json_object(
        'slug', child.slug,
        'name', child.name,
        'condition_group_id', child.condition_group_id,
        'ebay_store_link', child.ebay_store_link,
        'keywords', child.keywords,
        'product_count', (SELECT COUNT(*) FROM products WHERE category = child.slug),
        'condition_group', (
          SELECT json_object(
            'group_key', c2.group_key,
            'group_name', c2.group_name,
            'options', (
              SELECT json_group_array(option_value ORDER BY option_order)
              FROM condition_options 
              WHERE condition_group_id = c2.id
            )
          )
          FROM conditions c2
          WHERE c2.id = child.condition_group_id
        )
      ) ORDER BY child.name
    )
    FROM categories child
    WHERE child.parent_category = cat.slug
  ) as children
FROM categories cat
LEFT JOIN conditions c ON cat.condition_group_id = c.id
WHERE cat.parent_category IS NULL;

CREATE TRIGGER update_product_image_count_insert AFTER INSERT ON product_images
BEGIN
  UPDATE products SET image_count = (
    SELECT COUNT(*) FROM product_images WHERE product_id = NEW.product_id
  ) WHERE id = NEW.product_id;
END;

CREATE TRIGGER update_product_image_count_delete AFTER DELETE ON product_images
BEGIN
  UPDATE products SET image_count = (
    SELECT COUNT(*) FROM product_images WHERE product_id = OLD.product_id
  ) WHERE id = OLD.product_id;
END;

-- =====================================================
-- 5. Triggers to maintain specs_count
-- =====================================================
CREATE TRIGGER update_product_specs_count_insert AFTER INSERT ON product_specifications
BEGIN
  UPDATE products SET specs_count = (
    SELECT COUNT(*) FROM product_specifications WHERE product_id = NEW.product_id
  ) WHERE id = NEW.product_id;
END;

CREATE TRIGGER update_product_specs_count_delete AFTER DELETE ON product_specifications
BEGIN
  UPDATE products SET specs_count = (
    SELECT COUNT(*) FROM product_specifications WHERE product_id = OLD.product_id
  ) WHERE id = OLD.product_id;
END;

-- =====================================================
-- 6. Triggers to maintain paragraphs_count
-- =====================================================
CREATE TRIGGER update_product_paragraphs_count_insert AFTER INSERT ON product_paragraphs
BEGIN
  UPDATE products SET paragraphs_count = (
    SELECT COUNT(*) FROM product_paragraphs WHERE product_id = NEW.product_id
  ) WHERE id = NEW.product_id;
END;

CREATE TRIGGER update_product_paragraphs_count_delete AFTER DELETE ON product_paragraphs
BEGIN
  UPDATE products SET paragraphs_count = (
    SELECT COUNT(*) FROM product_paragraphs WHERE product_id = OLD.product_id
  ) WHERE id = OLD.product_id;
END;

-- =====================================================
-- 7. Triggers to maintain features_count
-- =====================================================
CREATE TRIGGER update_product_features_count_insert AFTER INSERT ON product_features
BEGIN
  UPDATE products SET features_count = (
    SELECT COUNT(*) FROM product_features WHERE product_id = NEW.product_id
  ) WHERE id = NEW.product_id;
END;

CREATE TRIGGER update_product_features_count_delete AFTER DELETE ON product_features
BEGIN
  UPDATE products SET features_count = (
    SELECT COUNT(*) FROM product_features WHERE product_id = OLD.product_id
  ) WHERE id = OLD.product_id;
END;

-- =====================================================
-- 8. Triggers to maintain feedbacks_count
-- =====================================================
CREATE TRIGGER update_product_feedbacks_count_insert AFTER INSERT ON product_feedbacks
BEGIN
  UPDATE products SET feedbacks_count = (
    SELECT COUNT(*) FROM product_feedbacks WHERE product_id = NEW.product_id
  ) WHERE id = NEW.product_id;
END;

CREATE TRIGGER update_product_feedbacks_count_delete AFTER DELETE ON product_feedbacks
BEGIN
  UPDATE products SET feedbacks_count = (
    SELECT COUNT(*) FROM product_feedbacks WHERE product_id = OLD.product_id
  ) WHERE id = OLD.product_id;
END;

UPDATE products SET image_count = (
  SELECT COUNT(*) FROM product_images WHERE product_id = products.id
);

UPDATE products SET specs_count = (
  SELECT COUNT(*) FROM product_specifications WHERE product_id = products.id
);

UPDATE products SET paragraphs_count = (
  SELECT COUNT(*) FROM product_paragraphs WHERE product_id = products.id
);

UPDATE products SET features_count = (
  SELECT COUNT(*) FROM product_features WHERE product_id = products.id
);

UPDATE products SET feedbacks_count = (
  SELECT COUNT(*) FROM product_feedbacks WHERE product_id = products.id
);
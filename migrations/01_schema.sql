-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =====================================================
-- 1. LOOKUP TABLES
-- =====================================================

-- Condition groups (eBay-style condition sets)
CREATE TABLE IF NOT EXISTS conditions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_key   TEXT NOT NULL UNIQUE,     -- 'electronics', 'business', ...
  group_name  TEXT NOT NULL,            -- Display name
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_conditions_group_key ON conditions(group_key);

-- Individual options belonging to a condition group
CREATE TABLE IF NOT EXISTS condition_options (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  condition_group_id INTEGER NOT NULL,
  option_order       INTEGER NOT NULL,
  option_value       TEXT NOT NULL,     -- "New", "Used", ...
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by         TEXT,
  updated_by         TEXT,
  FOREIGN KEY (condition_group_id) REFERENCES conditions(id) ON DELETE CASCADE,
  UNIQUE (condition_group_id, option_value)
);
CREATE INDEX IF NOT EXISTS idx_condition_options_group_id ON condition_options(condition_group_id);
CREATE INDEX IF NOT EXISTS idx_condition_options_value    ON condition_options(option_value);


-- =====================================================
-- 2. CATEGORY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  parent_category    TEXT,
  condition_group_id INTEGER,
  ebay_store_link    TEXT,
  keywords           TEXT,              -- JSON array
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by         TEXT,
  updated_by         TEXT,
  FOREIGN KEY (parent_category)    REFERENCES categories(slug),
  FOREIGN KEY (condition_group_id) REFERENCES conditions(id)
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category);
CREATE INDEX IF NOT EXISTS idx_categories_condition_group ON categories(condition_group_id);

-- Rich-text content for a category, one row per section
CREATE TABLE IF NOT EXISTS category_content (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_slug  TEXT NOT NULL,
  section_order  INTEGER NOT NULL,
  subheading     TEXT,
  paragraphs     TEXT NOT NULL,         -- JSON array
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by     TEXT,
  updated_by     TEXT,
  FOREIGN KEY (category_slug) REFERENCES categories(slug) ON DELETE CASCADE,
  UNIQUE (category_slug, section_order)
);
CREATE INDEX IF NOT EXISTS idx_category_content_category ON category_content(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_content_updated  ON category_content(updated_at);


-- =====================================================
-- 3. PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id                TEXT PRIMARY KEY,             -- UUID
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  sku               TEXT UNIQUE,
  ean               TEXT,
  asin              TEXT,
  baselinker_id     TEXT,
  shopify_id        TEXT,
  category          TEXT NOT NULL,
  condition         TEXT,
  note              TEXT,
  vat_rate          INTEGER DEFAULT 20,
  rrp               DECIMAL(10,2),
  weight            DECIMAL(8,2),
  quantity          INTEGER DEFAULT 0,
  price_brutto      DECIMAL(10,2),
  shipping_method   TEXT,
  image_count       INTEGER DEFAULT 0,
  specs_count       INTEGER DEFAULT 0,
  paragraphs_count  INTEGER DEFAULT 0,
  features_count    INTEGER DEFAULT 0,
  feedbacks_count   INTEGER DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  created_by        TEXT,
  updated_by        TEXT,
  FOREIGN KEY (category) REFERENCES categories(slug)
);

-- Identifier lookups (ASIN/EAN/SKU are the most common search keys)
CREATE INDEX IF NOT EXISTS idx_products_asin          ON products(asin)          WHERE asin          IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean           ON products(ean)           WHERE ean           IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku           ON products(sku)           WHERE sku           IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_baselinker_id ON products(baselinker_id) WHERE baselinker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_shopify_id    ON products(shopify_id)    WHERE shopify_id    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_all_ids       ON products(asin, ean, sku, baselinker_id, shopify_id);

-- Pagination + filtering
CREATE INDEX IF NOT EXISTS idx_products_pagination      ON products(updated_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_products_category_updated ON products(category, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category        ON products(category);

-- Count-based sorting/filtering
CREATE INDEX IF NOT EXISTS idx_products_image_count     ON products(image_count);
CREATE INDEX IF NOT EXISTS idx_products_specs_count     ON products(specs_count);
CREATE INDEX IF NOT EXISTS idx_products_paragraphs_count ON products(paragraphs_count);
CREATE INDEX IF NOT EXISTS idx_products_features_count  ON products(features_count);
CREATE INDEX IF NOT EXISTS idx_products_feedbacks_count ON products(feedbacks_count);


-- =====================================================
-- 4. PRODUCT RELATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_specifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   TEXT NOT NULL,
  spec_order   INTEGER NOT NULL,
  key          TEXT NOT NULL,
  value        TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by   TEXT,
  updated_by   TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (product_id, spec_order)
);
CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_key        ON product_specifications(key);

CREATE TABLE IF NOT EXISTS product_paragraphs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       TEXT NOT NULL,
  paragraph_order  INTEGER NOT NULL,
  content          TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  created_by       TEXT,
  updated_by       TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_paragraphs_product_id ON product_paragraphs(product_id);

CREATE TABLE IF NOT EXISTS product_features (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL,
  feature_order INTEGER NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  created_by    TEXT,
  updated_by    TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_features_product_id ON product_features(product_id);

CREATE TABLE IF NOT EXISTS product_images (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   TEXT NOT NULL,
  image_order  INTEGER NOT NULL,
  url          TEXT NOT NULL,
  s3_path      TEXT,
  alt_text     TEXT,
  warnings     TEXT,
  created_at   INTEGER NOT NULL,
  created_by   TEXT,
  updated_by   TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_warnings   ON product_images(warnings) WHERE warnings IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_feedbacks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  count       INTEGER DEFAULT 0,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  created_by  TEXT,
  updated_by  TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_feedbacks_product_id ON product_feedbacks(product_id);


-- =====================================================
-- 5. TEMPLATES & AI USAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  task          TEXT PRIMARY KEY,       -- 'title', 'sku', 'paragraphs', 'features', 'note'
  name          TEXT NOT NULL,
  description   TEXT,
  template_text TEXT NOT NULL,          -- Handlebars template
  variables     TEXT,                   -- JSON array of variable names
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by    TEXT,
  updated_by    TEXT
);

CREATE TABLE IF NOT EXISTS note_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_note_templates_name ON note_templates(name);

CREATE TABLE IF NOT EXISTS shipping_method_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_shipping_method_templates_name    ON shipping_method_templates(name);
CREATE INDEX IF NOT EXISTS idx_shipping_method_templates_updated ON shipping_method_templates(updated_at);

CREATE TABLE IF NOT EXISTS usage_logs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  task                 TEXT,
  model                TEXT,
  prompt_tokens        INTEGER,
  completion_tokens    INTEGER,
  total_tokens         INTEGER,
  request_timestamp    INTEGER,
  rate_limit_remaining INTEGER,
  rate_limit_reset     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_timestamp ON usage_logs(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_task              ON usage_logs(task);


-- =====================================================
-- 6. AUTH
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'employee',   -- 'admin' | 'dev' | 'employee'
  password_hash TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  must_reset_pw INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  last_login_at INTEGER,
  deleted_at    INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);


-- =====================================================
-- 7. ACTIVITY LOG (append-only)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id            TEXT PRIMARY KEY,

  -- Actor (snapshotted — never joined)
  user_id       TEXT,
  user_name     TEXT NOT NULL,
  user_email    TEXT NOT NULL,

  -- What happened
  action        TEXT NOT NULL,          -- 'create'|'update'|'delete'|'restore'|'import'|'publish'|'ai_generate'|'login'
  entity_type   TEXT NOT NULL,          -- 'product'|'product_specification'|'category'|...
  entity_id     TEXT,
  entity_label  TEXT,

  -- Parent linkage (e.g. product when editing one of its specs)
  parent_type   TEXT,
  parent_id     TEXT,
  parent_label  TEXT,

  -- Detail
  summary       TEXT,
  changes       TEXT,                   -- JSON: [{"field","old","new"}]
  metadata      TEXT,                   -- JSON: {bulk_count, correlation_id, model, ...}

  created_at    INTEGER NOT NULL
);

-- Global feed (newest first)
CREATE INDEX IF NOT EXISTS idx_activity_time        ON activity_log (created_at DESC);
-- Per-employee view
CREATE INDEX IF NOT EXISTS idx_activity_user_time   ON activity_log (user_id, created_at DESC);
-- Per-entity view
CREATE INDEX IF NOT EXISTS idx_activity_entity_time ON activity_log (entity_type, entity_id, created_at DESC);
-- Per-parent view
CREATE INDEX IF NOT EXISTS idx_activity_parent_time ON activity_log (parent_type, parent_id, created_at DESC);
-- Filter by action
CREATE INDEX IF NOT EXISTS idx_activity_action_time ON activity_log (action, created_at DESC);


-- =====================================================
-- 8. VIEWS
-- =====================================================

DROP VIEW IF EXISTS v_product_complete;
CREATE VIEW v_product_complete AS
SELECT
  p.id, p.slug, p.title, p.sku, p.ean, p.asin, p.baselinker_id, p.shopify_id,
  p.category AS category_slug,
  p.condition AS product_condition,
  p.note, p.vat_rate, p.rrp, p.weight, p.quantity, p.price_brutto, p.shipping_method,
  p.created_at, p.updated_at,
  p.image_count, p.specs_count, p.paragraphs_count, p.features_count, p.feedbacks_count,
  (SELECT json_group_array(content ORDER BY paragraph_order)
     FROM product_paragraphs WHERE product_id = p.id) AS paragraphs,
  (SELECT json_group_array(json_object('title', title, 'description', description) ORDER BY feature_order)
     FROM product_features WHERE product_id = p.id) AS features,
  (SELECT json_group_array(json_object(
            'url', COALESCE(s3_path, url),
            's3_path', s3_path,
            'original_url', url,
            'alt_text', alt_text,
            'warnings', warnings) ORDER BY image_order)
     FROM product_images WHERE product_id = p.id) AS images,
  (SELECT json_group_array(json_object('name', name, 'content', content, 'count', count))
     FROM product_feedbacks WHERE product_id = p.id) AS feedbacks,
  (SELECT json_group_array(json_array(key, value) ORDER BY spec_order)
     FROM product_specifications WHERE product_id = p.id) AS specifications
FROM products p;

DROP VIEW IF EXISTS v_condition_groups;
CREATE VIEW v_condition_groups AS
SELECT
  c.id, c.group_key, c.group_name,
  (SELECT json_group_array(option_value ORDER BY option_order)
     FROM condition_options WHERE condition_group_id = c.id) AS options
FROM conditions c;

DROP VIEW IF EXISTS v_category_full;
CREATE VIEW v_category_full AS
SELECT
  c.*,
  (SELECT json_group_array(json_object(
            'subheading', cc.subheading,
            'paragraphs', json(cc.paragraphs)) ORDER BY cc.section_order)
     FROM category_content cc WHERE cc.category_slug = c.slug) AS content
FROM categories c;

DROP VIEW IF EXISTS v_category_tree;
CREATE VIEW v_category_tree AS
WITH
product_counts AS (
  SELECT category, COUNT(*) AS cnt FROM products GROUP BY category
),
condition_groups AS (
  SELECT c.id, c.group_key, c.group_name,
         json_group_array(co.option_value ORDER BY co.option_order) AS options
  FROM conditions c
  LEFT JOIN condition_options co ON c.id = co.condition_group_id
  GROUP BY c.id
),
categories_with_details AS (
  SELECT
    cat.id, cat.slug, cat.name, cat.parent_category, cat.condition_group_id,
    cat.ebay_store_link, cat.keywords, cat.created_at, cat.updated_at,
    COALESCE(pc.cnt, 0) AS product_count,
    CASE WHEN c.id IS NOT NULL THEN
      json_object('group_key', c.group_key,
                  'group_name', c.group_name,
                  'options', json(c.options))
    END AS condition_group
  FROM categories cat
  LEFT JOIN product_counts  pc ON cat.slug = pc.category
  LEFT JOIN condition_groups c ON cat.condition_group_id = c.id
),
children_aggregated AS (
  SELECT parent_category,
         json_group_array(json_object(
           'slug', slug,
           'name', name,
           'condition_group_id', condition_group_id,
           'ebay_store_link', ebay_store_link,
           'keywords', keywords,
           'product_count', product_count,
           'condition_group', condition_group) ORDER BY name) AS children
  FROM categories_with_details
  WHERE parent_category IS NOT NULL
  GROUP BY parent_category
)
SELECT
  cat.id, cat.slug, cat.name, cat.parent_category, cat.condition_group_id,
  cat.ebay_store_link, cat.keywords, cat.created_at, cat.updated_at,
  cat.product_count, cat.condition_group,
  COALESCE(agg.children, '[]') AS children
FROM categories_with_details cat
LEFT JOIN children_aggregated agg ON cat.slug = agg.parent_category
WHERE cat.parent_category IS NULL
ORDER BY cat.id ASC;
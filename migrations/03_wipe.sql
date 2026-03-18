-- =====================================================
-- COMPREHENSIVE WIPE SCRIPT
-- Run this to completely reset the database
-- =====================================================

-- Disable foreign keys temporarily for clean wipe
PRAGMA foreign_keys = OFF;

-- =====================================================
-- STEP 1: Drop all triggers first
-- =====================================================
DROP TRIGGER IF EXISTS trg_product_paragraphs_fts_insert;
DROP TRIGGER IF EXISTS trg_product_paragraphs_fts_update;
DROP TRIGGER IF EXISTS trg_product_features_fts_insert;
DROP TRIGGER IF EXISTS trg_product_feedbacks_fts_insert;
DROP TRIGGER IF EXISTS trg_products_fts_delete;
DROP TRIGGER IF EXISTS trg_products_updated_at;
DROP TRIGGER IF EXISTS trg_conditions_updated_at;
DROP TRIGGER IF EXISTS trg_categories_updated_at;

-- =====================================================
-- STEP 2: Drop all views
-- =====================================================
DROP VIEW IF EXISTS v_product_full;
DROP VIEW IF EXISTS v_product_full_details;
DROP VIEW IF EXISTS v_product_search_basic;
DROP VIEW IF EXISTS v_condition_groups;
DROP VIEW IF EXISTS v_category_tree;

-- =====================================================
-- STEP 3: Drop FTS tables and search-related tables
-- =====================================================
DROP TABLE IF EXISTS products_fts;
DROP TABLE IF EXISTS products_search;
DROP TABLE IF EXISTS products_search_fts;

-- =====================================================
-- STEP 4: Drop related data tables (order matters for FKs)
-- =====================================================
DROP TABLE IF EXISTS product_feedbacks;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_features;
DROP TABLE IF EXISTS product_paragraphs;
DROP TABLE IF EXISTS product_notes;

-- =====================================================
-- STEP 5: Drop core tables
-- =====================================================
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS condition_options;
DROP TABLE IF EXISTS conditions;

-- =====================================================
-- STEP 6: Drop any leftover indexes (should be auto-dropped with tables)
-- but just to be thorough
-- =====================================================
DROP INDEX IF EXISTS idx_conditions_group_key;
DROP INDEX IF EXISTS idx_condition_options_group_id;
DROP INDEX IF EXISTS idx_condition_options_value;
DROP INDEX IF EXISTS idx_categories_slug;
DROP INDEX IF EXISTS idx_categories_parent;
DROP INDEX IF EXISTS idx_categories_condition_group;
DROP INDEX IF EXISTS idx_products_asin;
DROP INDEX IF EXISTS idx_products_ean;
DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_baselinker_id;
DROP INDEX IF EXISTS idx_products_shopify_id;
DROP INDEX IF EXISTS idx_products_all_ids;
DROP INDEX IF EXISTS idx_products_pagination;
DROP INDEX IF EXISTS idx_products_category_updated;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_product_paragraphs_product_id;
DROP INDEX IF EXISTS idx_product_features_product_id;
DROP INDEX IF EXISTS idx_product_images_product_id;
DROP INDEX IF EXISTS idx_product_feedbacks_product_id;
DROP INDEX IF EXISTS idx_product_images_warnings;

-- =====================================================
-- STEP 7: Verification - Show what's left (should be empty)
-- =====================================================
SELECT 'Tables remaining:' as info;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

SELECT 'Indexes remaining:' as info;
SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;

SELECT 'Views remaining:' as info;
SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;

SELECT 'Triggers remaining:' as info;
SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
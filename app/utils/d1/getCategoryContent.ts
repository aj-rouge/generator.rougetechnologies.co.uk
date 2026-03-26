// utils/d1/category/getCategoryContent.ts

import { executeQuery } from "./execute/executeQuery";

export async function getCategoryContent(categorySlug: string) {
  if (!categorySlug) return null;

  const result = await executeQuery(
    `
    SELECT 
      c.name as category_name,
      c.slug as category_slug,
      c.ebay_store_link, 
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
    FROM categories c
    WHERE c.slug = ?
  `,
    [categorySlug],
  );

  if (!result || result.length === 0) return null;

  return {
    categoryName: `${result[0].category_name} at Rouge Technologies`,
    ebayStoreLink: result[0].ebay_store_link,
    content: JSON.parse(result[0].content || "[]"),
  };
}

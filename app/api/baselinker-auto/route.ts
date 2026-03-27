"use server";
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";

const getProductIds = async (options = {}) => {
  const {
    limit = 500,
    order = "DESC",
    sortBy = "created_at",
  }: { limit?: number; order?: string; sortBy?: string } = options;

  console.log(
    `🔍 Fetching product IDs with limit: ${limit}, order: ${order}, sortBy: ${sortBy}`,
  );

  let query = `SELECT id, baselinker_id FROM products`;
  const params: any[] = [];

  query += ` ORDER BY ${sortBy} ${order}`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  console.log(`📝 SQL Query: ${query}`);
  console.log(`📦 SQL Params:`, params);

  const results = await executeQuery(query, params);
  console.log(`✅ Found ${results?.length || 0} products`);

  return results || [];
};

export async function POST() {
  console.log("🚀 Starting Baselinker auto-update process...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  try {
    // Get all product IDs
    console.log("📋 Fetching product IDs from database...");
    const products = await getProductIds({ limit: 500 });

    if (!products || products.length === 0) {
      console.log("❌ No products found in database");
      return NextResponse.json({ error: "No products found" }, { status: 404 });
    }

    console.log(`✅ Retrieved ${products.length} products from database`);

    // Log sample of products
    console.log("📊 Sample products:", products.slice(0, 3));

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Update each product
    for (const product of products) {
      processedCount++;
      console.log(
        `\n🔄 Processing product ${processedCount}/${products.length}`,
      );
      console.log(
        `   Product ID: ${product.id}, Baselinker ID: ${product.baselinker_id || "MISSING"}`,
      );

      try {
        if (!product.baselinker_id) {
          console.log(
            `⚠️  Product ${product.id} has no baselinker_id, skipping...`,
          );
          errors.push({
            productId: product.id,
            error: "No baselinker_id found",
          });
          continue;
        }

        console.log(`📝 Generating HTML for product ${product.id}...`);
        const htmlString = await generateProductHTML(product.id);
        console.log(
          `✅ HTML generated successfully (${htmlString.length} characters)`,
        );

        const updateData = {
          storage_id: process.env.BASELINKER_STORAGE_ID || "bl_1",
          product_id: product.baselinker_id,
          description: htmlString,
        };

        console.log(
          `📤 Sending update to Baselinker for product ${product.baselinker_id}...`,
        );

        const formData = new URLSearchParams();
        formData.append("method", "addProduct");
        formData.append("parameters", JSON.stringify(updateData));

        const response = await fetch(
          "https://api.baselinker.com/connector.php",
          {
            method: "POST",
            headers: {
              "X-BLToken": process.env.BASELINKER_TOKEN!,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          },
        );

        const result = await response.json();
        console.log(`📥 Baselinker response received:`, result);

        if (result.status === "ERROR") {
          console.log(
            `❌ Baselinker update failed for product ${product.id}: ${result.error_message}`,
          );
          errors.push({
            productId: product.id,
            baselinkerId: product.baselinker_id,
            error: result.error_message || "Baselinker update failed",
          });
        } else {
          console.log(
            `✅ Successfully updated product ${product.id} on Baselinker`,
          );
          results.push({
            productId: product.id,
            baselinkerId: product.baselinker_id,
            success: true,
            warnings: result.warnings || {},
          });
        }

        // Small delay to avoid rate limiting
        console.log(`⏳ Waiting 100ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.log(
          `❌ Error processing product ${product.id}:`,
          error.message,
        );
        errors.push({
          productId: product.id,
          baselinkerId: product.baselinker_id,
          error: error.message,
        });
      }
    }

    console.log(`\n🎉 Update process completed!`);
    console.log(`✅ Successfully updated: ${results.length} products`);
    console.log(`❌ Failed updates: ${errors.length} products`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} products, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error: any) {
    console.error("💥 Baselinker HTML Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
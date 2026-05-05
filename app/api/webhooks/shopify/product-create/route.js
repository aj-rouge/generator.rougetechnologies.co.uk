// app/api/webhooks/shopify/product-create/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { executeQuery } from "../../../../utils/d1/execute/executeQuery";

// Verify Shopify webhook signature
function verifyWebhook(rawBody, hmacHeader, secret) {
  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return hmacHeader === generatedHmac;
}

export async function POST(request) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    const shopDomain = request.headers.get("x-shopify-shop-domain");

    // 2. Verify webhook (optional but strongly recommended)
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret && !verifyWebhook(rawBody, hmacHeader, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse product data
    const productData = JSON.parse(rawBody);
    const {
      id: shopifyId, // e.g., 1234567890
      title,
      variants = [],
    } = productData;

    // SKU is usually in the first variant
    const sku = variants[0]?.sku || null;

    if (!sku) {
      console.log(`Webhook: Product ${shopifyId} has no SKU, skipping`);
      return NextResponse.json({ message: "No SKU provided" });
    }

    // 4. Find matching product in local DB
    // First try exact SKU match (SKU is UNIQUE in your schema)
    const query = `
      SELECT id, title, shopify_id
      FROM products
      WHERE sku = ? AND (shopify_id IS NULL OR shopify_id = '')
    `;
    const matches = await executeQuery(query, [sku]);

    if (matches.length === 0) {
      console.log(`No local product found with SKU: ${sku}`);
      return NextResponse.json({ message: "No matching product" });
    }

    const localProduct = matches[0];

    // Optional: confirm title matches as well
    if (localProduct.title !== title) {
      console.log(
        `SKU match but title mismatch: local="${localProduct.title}" webhook="${title}"`,
      );
      // Decide whether to still update
      // return NextResponse.json({ message: "Title mismatch" });
    }

    // 5. Update shopify_id
    const updateQuery = `
      UPDATE products
      SET shopify_id = ?, updated_at = unixepoch()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [String(shopifyId), localProduct.id]);

    console.log(
      `✅ Updated product ${localProduct.id} with Shopify ID ${shopifyId}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

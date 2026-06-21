// app/api/webhooks/shopify/product-create/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Verifies the Shopify Webhook Signature using the native Web Crypto API.
 */
async function verifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
) {
  if (!hmacHeader || !secret) return false;

  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const bodyData = encoder.encode(rawBody);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyData);
  const generatedHmac = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );

  return hmacHeader === generatedHmac;
}

export async function POST(request: Request) {
  try {
    // 1. Fetch the D1 binding – use `as any` to bypass type checking
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // 2. Raw body and signature
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    // 3. Verify signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = await verifyWebhook(rawBody, hmacHeader, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    // 4. Parse product payload
    const productData = JSON.parse(rawBody);
    const { id: shopifyId, title, variants = [] } = productData;
    const sku = variants[0]?.sku || null;

    if (!sku) {
      console.log(`Product ${shopifyId} has no SKU, skipping`);
      return NextResponse.json({ message: "No SKU provided" });
    }

    // 5. Find matching product (pass db)
    const query = `
      SELECT id, title, shopify_id
      FROM products
      WHERE sku = ? AND (shopify_id IS NULL OR shopify_id = '')
    `;
    const matches = await executeQuery(query, [sku], db);

    if (!matches || matches.length === 0) {
      console.log(`No matching product for SKU: ${sku}`);
      return NextResponse.json({ message: "No matching product" });
    }

    const localProduct = matches[0];

    // 6. Update shopify_id (pass db)
    const updateQuery = `
      UPDATE products
      SET shopify_id = ?, updated_at = unixepoch()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [String(shopifyId), localProduct.id], db);

    console.log(
      `✅ Updated product ${localProduct.id} with Shopify ID ${shopifyId}`,
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

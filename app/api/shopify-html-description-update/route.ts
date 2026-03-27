// app/api/shopify-html-description-update/route.js
import { NextResponse } from "next/server";
import { updateSingleProductDescription } from "../../actions/updateShopifyDescriptions";

export async function POST(request) {
  console.log("🚀 Shopify HTML Description Update API called");

  try {
    const body = await request.json();
    const { shopifyId, productId } = body;

    console.log("📦 Request body:", { shopifyId, productId });

    // Validate required fields
    if (!shopifyId) {
      return NextResponse.json(
        { error: "Missing required field: shopifyId" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Missing required field: productId" },
        { status: 400 }
      );
    }

    // Call the server action to update the product description
    const result = await updateSingleProductDescription(productId, {
      delayMs: 0, // No delay for single update
    });

    console.log("📊 Update result:", result);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to update Shopify product description",
          details: result 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated Shopify description for product ${result.productId}`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Shopify HTML Description Update API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
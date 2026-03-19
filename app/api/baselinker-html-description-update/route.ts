import { NextResponse } from "next/server";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";

export async function POST(req: Request) {
  try {
    const { baselinkerId, productId } = await req.json();

    if (!baselinkerId || !productId) {
      return NextResponse.json(
        { error: "baselinkerId and productId are required" },
        { status: 400 },
      );
    }

    const htmlString = await generateProductHTML(productId);

    // Prepare Baselinker update payload
    const updateData = {
      storage_id: process.env.BASELINKER_STORAGE_ID || "bl_1",
      product_id: baselinkerId,
      description: htmlString,
    };

    // Call Baselinker API (same as before)
    const formData = new URLSearchParams();
    formData.append("method", "addProduct");
    formData.append("parameters", JSON.stringify(updateData));

    const response = await fetch("https://api.baselinker.com/connector.php", {
      method: "POST",
      headers: {
        "X-BLToken": process.env.BASELINKER_TOKEN!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (result.status === "ERROR") {
      return NextResponse.json(
        { error: result.error_message || "Baselinker update failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "HTML description updated",
      baselinker_id: result.product_id,
      warnings: result.warnings || {},
    });
  } catch (error: any) {
    console.error("Baselinker HTML Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

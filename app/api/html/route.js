// app/api/html/route.js
import { NextResponse } from "next/server";

// Helper function to map your data structure to LivePreview props
function mapDataToPreview(data) {
  return {
    title: data.title || "",
    condition: data.condition || "",
    images: (data.images || []).map((img, index) => ({
      url: img.url || img.s3Path || "",
      s3Path: img.s3Path || "",
      altText: img.altText || `Image ${index + 1}`,
    })),
    paragraphs: data.paragraphs || [],
    features: (data.features || []).map((feature) => ({
      title: feature.title || "",
      description: feature.description || "",
    })),
    note: data.note || "",
    feedbacks: (data.feedbacks || []).map((feedback) => ({
      name: feedback.name || "",
      count: feedback.count || 0,
      content: feedback.content || "",
    })),
    seoSectionData: {
      name: data.seoSectionData?.name || data.category || "",
      sections: data.seoSectionData?.sections || [],
    },
    selectedCategory: data.category || "",
  };
}
// Helper to render HTML
// Helper to render HTML
async function renderHTML(previewData) {
  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: LivePreview } =
    await import("../../components/preview/LivePreview");

  const componentHtml = renderToStaticMarkup(
    React.createElement(LivePreview, previewData),
  );

  // Remove preload links if you don't want them
  const cleanedHtml = componentHtml.replace(
    /<link rel="preload" as="image" href="[^"]*"\/?>/g,
    "",
  );

  const cssUrl = "https://ebay-desc-generator.vercel.app/api/css";

  return `<meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" type="text/css" href="${cssUrl}"><meta charset="UTF-8"><style>*{margin:0;padding:0;border:0;}</style>${cleanedHtml}`;
}

// POST endpoint - accepts your form data directly
export async function POST(request) {
  try {
    const formData = await request.json();

    if (!formData || typeof formData !== "object") {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 },
      );
    }

    // Map the form data to LivePreview props
    const previewData = mapDataToPreview(formData);

    // Render HTML
    const htmlString = await renderHTML(previewData);

    return new NextResponse(htmlString, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("HTML generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint - accepts slug parameter
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const kvData = await getKVData(slug);

      if (!kvData) {
        return NextResponse.json(
          { error: "Product not found in KV store" },
          { status: 404 },
        );
      }

      // Map KV data to LivePreview props
      const previewData = mapDataToPreview(kvData);

      // Render HTML
      const htmlString = await renderHTML(previewData);

      return new NextResponse(htmlString, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // If no slug provided, return instructions
    return NextResponse.json({
      endpoints: {
        POST: {
          description: "Send product data in request body",
          example: {
            title: "Product Title",
            condition: "New",
            paragraphs: ["Description..."],
            features: [{ title: "Feature", description: "Description" }],
            note: "Optional note",
            feedbacks: [{ name: "Customer", count: 100, content: "Great!" }],
            images: [
              { url: "image.jpg", s3Path: "cdn/image.jpg", altText: "image 1" },
            ],
          },
        },
        GET: {
          description: "Fetch by slug from KV store",
          example: "GET /api/html?slug=laptops/product-slug",
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/html:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

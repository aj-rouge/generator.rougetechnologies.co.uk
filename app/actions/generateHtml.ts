"use server";

// Interface remains the same
interface LivePreviewProps {
  title?: string;
  condition?: string;
  images?: any[];
  paragraphs?: string[];
  features?: any[];
  note?: string | null;
  feedbacks?: any[];
  categoryContent?: any;
  categoryName?: string;
  ebayLink?: string;
}

export async function generateHtmlFromPreviewProps(
  previewProps: LivePreviewProps,
): Promise<string> {
  try {
    // Dynamically import server-only modules and the component
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { default: LivePreview } =
      await import("../components/preview/LivePreview");

    const propsWithDefaults = {
      title: "",
      condition: "",
      images: [],
      paragraphs: [],
      features: [],
      note: null,
      feedbacks: [],
      categoryContent: null,
      categoryName: "",
      ebayLink: "",
      ...previewProps,
    };

    const componentHtml = renderToStaticMarkup(
      createElement(LivePreview, propsWithDefaults),
    );

    const cleanedHtml = componentHtml.replace(
      /<link rel="preload" as="image" href="[^"]*"\/?>/g,
      "",
    );

    const cssUrl = "https://ebay-desc-generator.vercel.app/api/css";

    return `<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" type="text/css" href="${cssUrl}">
<meta charset="UTF-8">
<style>*{margin:0;padding:0;border:0;}</style>
${cleanedHtml}`;
  } catch (error: any) {
    console.error("HTML generation error:", error);
    throw new Error(error.message);
  }
}

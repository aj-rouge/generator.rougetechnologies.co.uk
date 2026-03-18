"use server";

import { generateSeoSlug } from "../images/seoGenerator";

export async function saveToKV(formData: {
  title: string;
  category: string;
  condition: string;
  paragraphs: string[];
  features: Array<{ title: string; description: string }>; // Fixed this too
  note: string;
  images: Array<{
    url: string;
    s3Path?: string;
    altText?: string;
  }>;
  feedbacks: Array<{
    name: string;
    count: number;
    content: string;
  }>;
}) {
  try {
    // Generate the slug for the URL
    const slug = generateSeoSlug(formData.title);
    const categorySlug = generateSeoSlug(formData.category);

    // Create the final URL path
    const urlPath = `${categorySlug}/${slug}`;

    // Prepare the data to store in KV
    const kvData = {
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: urlPath,
    };

    // Save to Cloudflare KV
    const kvNamespace = process.env.KV_NAMESPACE;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!kvNamespace || !accountId || !apiToken) {
      throw new Error("Cloudflare KV configuration missing");
    }

    // Use Cloudflare KV REST API directly
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/values/${urlPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kvData),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`KV save failed: ${error}`);
    }

    return {
      success: true,
      url: urlPath,
      message: "Content saved successfully!",
    };
  } catch (error) {
    console.error("Error saving to KV:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save content",
    };
  }
}

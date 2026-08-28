// app/(pages)/create/page.tsx

import { getCategories } from "../../utils/d1/category/getCategories";
import { getProductById } from "../../utils/d1/product/readProduct";
import ProductForm from "../../components/ProductForm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
  const { duplicate } = await searchParams;

  let initialData = null;
  if (duplicate) {
    const product = await getProductById(duplicate, {
      db,
      transformToForm: true,
    });
    if (product) {
      initialData = {
        ...product,
        id: undefined,
        sku: "",
        baselinker_id: "",
        shopify_id: "",
        ean: "",
        asin: "",
      };
      if (initialData.images) {
        initialData.images = initialData.images.map((img: any) => ({
          ...img,
          s3Path: null,
          isUploaded: false,
          needsUpload: true,
          uploadStatus: "pending",
        }));
      }
    }
  }

  const categories = await getCategories({ db });

  // ✅ Always return ProductForm, with or without initialData
  return (
    <ProductForm
      mode="create"
      categories={categories}
      initialData={initialData}
    />
  );
}

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
      // Duplicate: clear all unique identifiers
      initialData = {
        ...product,
        id: undefined, // new ID will be generated
        sku: "", // user must provide a new SKU
        baselinker_id: "",
        shopify_id: "",
        ean: "",
        asin: "",
        // Keep title, description, images, specs, etc.
      };
    }
    // If product not found, proceed with empty form (no error)
  }

  const categories = await getCategories({ db });

  return (
    <ProductForm
      mode="create"
      categories={categories}
      initialData={initialData}
    />
  );
}

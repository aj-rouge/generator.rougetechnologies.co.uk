// app/(pages)/products/[uuid]/page.tsx
import { notFound } from "next/navigation";
import { getProductById } from "../../../utils/d1/product/readProduct";
import { getCategories } from "../../../utils/d1/category/getCategories";
import { getCategoryContent } from "../../../utils/d1/getCategoryContent";
import ProductForm from "../../../components/ProductForm";
import { getCloudflareContext } from "@opennextjs/cloudflare"; // <-- import

export default async function EditPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  // 1. Fetch the D1 binding once
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const { uuid } = await params;

  // 2. Pass `db` to all utilities
  const initialData = await getProductById(uuid, { db, transformToForm: true });
  if (!initialData) notFound();

  const categories = await getCategories({ db });
  const categoryContent = await getCategoryContent(
    initialData.selectedCategory,
    { db },
  );

  return (
    <ProductForm
      mode="edit"
      categories={categories}
      initialData={initialData}
      categoryContent={categoryContent}
    />
  );
}

// app/(pages)/create/page.tsx
import { getCategories } from "../../utils/d1/category/getCategories";
import ProductForm from "../../components/ProductForm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  // Fetch the D1 binding
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  // Pass `db` to getCategories
  const categories = await getCategories({ db });

  return <ProductForm mode="create" categories={categories} />;
}

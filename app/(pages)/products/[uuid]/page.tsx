// app/edit/[uuid]/page.tsx
import { notFound } from "next/navigation";
import EditProductForm from "../../../components/forms/EditProductForm";
import { getProductById } from "../../../utils/d1/product/readProduct";
import { getCategories } from "../../../utils/d1/category/getCategories";
import { getCategoryContent } from "../../../utils/d1/getCategoryContent";

export default async function EditPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;

  const initialData = await getProductById(uuid, { transformToForm: true });
  if (!initialData) notFound();

  const categories = await getCategories();

  // Fetch content for the selected category
  const categoryContent = await getCategoryContent(
    initialData.selectedCategory,
  );

  return (
    <EditProductForm
      initialData={initialData}
      categories={categories}
      categoryContent={categoryContent} // Pass as separate prop
    />
  );
}

import { notFound } from "next/navigation";
import { getProductById } from "../../../utils/d1/product/readProduct";
import { getCategories } from "../../../utils/d1/category/getCategories";
import { getCategoryContent } from "../../../utils/d1/getCategoryContent";
import ProductForm from "../../../components/ProductForm";

export default async function EditPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const initialData = await getProductById(uuid, { transformToForm: true });
  if (!initialData) notFound();

  const categories = await getCategories();
  const categoryContent = await getCategoryContent(
    initialData.selectedCategory,
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

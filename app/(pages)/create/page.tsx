import { getCategories } from "../../utils/d1/category/getCategories";
import ProductForm from "../../components/ProductForm";

export default async function CreatePage() {
  const categories = await getCategories(); // already parsed
  return <ProductForm mode="create" categories={categories} />;
}
